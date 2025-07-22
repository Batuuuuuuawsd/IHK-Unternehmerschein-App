from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from typing import List, Optional, Dict, Any
import os
import json
import uuid
from datetime import datetime, timedelta
from pymongo import MongoClient
import logging
import firebase_admin
from firebase_admin import credentials, auth, firestore
from firebase_admin.exceptions import FirebaseError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Settings
class Settings(BaseSettings):
    mongo_url: str = Field(default="mongodb://localhost:27017", env="MONGO_URL")
    firebase_project_id: str = Field(default="taxi-learn-app", env="FIREBASE_PROJECT_ID")
    
    class Config:
        env_file = ".env"

settings = Settings()

# Initialize Firebase Admin
try:
    # Initialize Firebase with service account
    cred = credentials.Certificate('firebase-admin.json')
    firebase_admin.initialize_app(cred)
    logger.info("Firebase Admin initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {e}")

# Initialize Firestore
try:
    firebase_db = firestore.client()
    logger.info("Firestore client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Firestore: {e}")
    firebase_db = None

app = FastAPI(title="IHK Taxi Exam API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection (fallback)
MONGO_URL = settings.mongo_url
mongo_client = MongoClient(MONGO_URL)
mongo_db = mongo_client.ihk_taxi_app

# Collections
questions_collection = mongo_db.questions
users_collection = mongo_db.users
progress_collection = mongo_db.progress
sessions_collection = mongo_db.sessions

# Security
security = HTTPBearer()

# Pydantic models
class Question(BaseModel):
    id: str
    question: Dict[str, str]  # Multi-language support
    type: str  # "single", "multiple", "open"
    options: Dict[str, List[str]]  # Multi-language options
    correctAnswer: List[int]
    explanation: Dict[str, str]  # Multi-language explanations
    topic: str
    difficulty: str = "medium"
    tags: List[str] = []
    image: Optional[str] = None

class QuestionAnswer(BaseModel):
    questionId: str
    selectedAnswers: List[int]
    timeSpent: int
    isFirstTry: bool = True

class UserProgress(BaseModel):
    userId: str
    questionId: str
    attempts: int = 1
    correctAttempts: int = 0
    box: int = 1  # Spaced repetition box
    lastReviewDate: datetime
    firstAttemptDate: datetime
    totalTimeSpent: int = 0
    accuracy: float = 0.0
    isLearned: bool = False

class UserStats(BaseModel):
    totalXP: int = 0
    currentLevel: int = 1
    totalQuestionsAnswered: int = 0
    correctAnswers: int = 0
    currentStreak: int = 0
    longestStreak: int = 0
    studyDaysStreak: int = 0
    lastStudyDate: Optional[datetime] = None
    achievements: List[str] = []
    badges: List[Dict] = []
    favoriteQuestions: List[str] = []
    difficultQuestions: List[str] = []
    dailyGoal: int = 20
    weeklyGoal: int = 140

class GameSession(BaseModel):
    sessionId: str
    userId: str
    mode: str  # "random", "topic", "spaced", "exam"
    startTime: datetime
    endTime: Optional[datetime] = None
    questionsAnswered: int = 0
    correctAnswers: int = 0
    totalXP: int = 0
    streak: int = 0

# Extended question bank with multi-language support
EXTENDED_QUESTION_BANK = [
    {
        "id": "001",
        "question": {
            "de": "Welche Unterlagen müssen bei einer Kontrolle mitgeführt werden?",
            "en": "Which documents must be carried during an inspection?",
            "tr": "Kontrol sırasında hangi belgeler taşınmalıdır?"
        },
        "type": "single",
        "options": {
            "de": [
                "Führerschein, Fahrzeugpapiere, Mietvertrag",
                "Fahrzeugschein, Versicherungspolice, Personalausweis",
                "Führerschein, Fahrzeugschein, Genehmigungsurkunde"
            ],
            "en": [
                "Driver's license, vehicle documents, rental contract",
                "Registration certificate, insurance policy, ID card",
                "Driver's license, registration certificate, license certificate"
            ],
            "tr": [
                "Ehliyet, araç evrakları, kiralama sözleşmesi",
                "Ruhsat, sigorta poliçesi, kimlik kartı",
                "Ehliyet, ruhsat, ruhsat belgesi"
            ]
        },
        "correctAnswer": [2],
        "explanation": {
            "de": "Im Taxi- und Mietwagenverkehr sind Führerschein, Fahrzeugschein und Genehmigungsurkunde mitzuführen.",
            "en": "In taxi and rental car transport, driver's license, registration certificate, and license certificate must be carried.",
            "tr": "Taksi ve kiralık araç taşımacılığında ehliyet, ruhsat ve ruhsat belgesi taşınmalıdır."
        },
        "topic": "Recht",
        "difficulty": "easy",
        "tags": ["kontrolle", "dokumente", "pflicht"],
        "image": None
    },
    {
        "id": "002",
        "question": {
            "de": "Wie hoch ist die Mindestversicherungssumme für Personenschäden?",
            "en": "What is the minimum insurance amount for personal injury?",
            "tr": "Kişisel yaralanma için minimum sigorta tutarı nedir?"
        },
        "type": "single",
        "options": {
            "de": ["7,5 Millionen Euro", "10 Millionen Euro", "15 Millionen Euro"],
            "en": ["7.5 million euros", "10 million euros", "15 million euros"],
            "tr": ["7,5 milyon euro", "10 milyon euro", "15 milyon euro"]
        },
        "correctAnswer": [0],
        "explanation": {
            "de": "Die Mindestversicherungssumme für Personenschäden beträgt 7,5 Millionen Euro.",
            "en": "The minimum insurance amount for personal injury is 7.5 million euros.",
            "tr": "Kişisel yaralanma için minimum sigorta tutarı 7,5 milyon euro'dur."
        },
        "topic": "Recht",
        "difficulty": "medium",
        "tags": ["versicherung", "personenschaden", "mindestbetrag"],
        "image": None
    },
    # Additional questions would continue here...
    {
        "id": "101",
        "question": {
            "de": "Was gehört zur kaufmännischen Buchführung?",
            "en": "What belongs to commercial bookkeeping?",
            "tr": "Ticari defter tutmada neler yer alır?"
        },
        "type": "multiple",
        "options": {
            "de": ["Eingangsrechnungen erfassen", "Ausgangsrechnungen erstellen", "Kassenbuch führen", "Fahrzeug waschen"],
            "en": ["Record incoming invoices", "Create outgoing invoices", "Keep cash book", "Wash vehicle"],
            "tr": ["Gelen faturaları kaydetmek", "Giden faturalar oluşturmak", "Kasa defteri tutmak", "Araç yıkamak"]
        },
        "correctAnswer": [0, 1, 2],
        "explanation": {
            "de": "Zur kaufmännischen Buchführung gehören alle Geschäftsvorgänge wie Rechnungen und Kassenführung.",
            "en": "Commercial bookkeeping includes all business transactions such as invoices and cash management.",
            "tr": "Ticari defter tutma, faturalar ve nakit yönetimi gibi tüm ticari işlemleri içerir."
        },
        "topic": "Kaufmännische & finanzielle Führung",
        "difficulty": "easy",
        "tags": ["buchführung", "rechnungen", "kasse"],
        "image": None
    }
]

# Firebase Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        # Verify Firebase ID token
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except FirebaseError as e:
        logger.error(f"Firebase authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        # Allow guest users or fallback authentication
        return {"uid": "guest", "email": None, "name": "Guest User"}

# Optional authentication (allows both authenticated and guest users)
async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict]:
    if not credentials:
        return None
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except:
        return None

# Initialize database with questions
@app.on_event("startup")
async def startup_event():
    try:
        # Clear and initialize MongoDB questions collection
        questions_collection.delete_many({})
        questions_collection.insert_many(EXTENDED_QUESTION_BANK)
        
        # Initialize Firestore questions collection
        if firebase_db:
            questions_ref = firebase_db.collection('questions')
            batch = firebase_db.batch()
            
            for question in EXTENDED_QUESTION_BANK:
                doc_ref = questions_ref.document(question['id'])
                batch.set(doc_ref, question)
            
            batch.commit()
            logger.info("Firestore questions collection initialized")
        
        logger.info(f"Initialized {len(EXTENDED_QUESTION_BANK)} questions in database")
    except Exception as e:
        logger.error(f"Startup error: {e}")

# API Routes

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", 
        "message": "IHK Taxi Exam API v2.0 with Firebase integration",
        "features": ["spaced_repetition", "gamification", "multilingual", "firebase_auth", "offline_sync"]
    }

@app.get("/api/questions")
async def get_questions(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    language: Optional[str] = "de",
    limit: Optional[int] = None,
    user: Optional[Dict] = Depends(get_optional_user)
):
    try:
        # Build query
        query = {}
        if topic:
            query["topic"] = topic
        if difficulty:
            query["difficulty"] = difficulty
        
        # Get questions from Firebase or MongoDB
        if firebase_db and user:
            questions_ref = firebase_db.collection('questions')
            query_ref = questions_ref
            
            for key, value in query.items():
                query_ref = query_ref.where(key, '==', value)
            
            if limit:
                query_ref = query_ref.limit(limit)
                
            docs = query_ref.get()
            questions = [doc.to_dict() for doc in docs]
        else:
            # Fallback to MongoDB
            questions = list(questions_collection.find(query, {"_id": 0}))
            if limit:
                questions = questions[:limit]
        
        # Filter by language for response
        localized_questions = []
        for q in questions:
            localized_q = {
                "id": q["id"],
                "question": q["question"].get(language, q["question"]["de"]),
                "type": q["type"],
                "options": q["options"].get(language, q["options"]["de"]),
                "correctAnswer": q["correctAnswer"],
                "topic": q["topic"],
                "difficulty": q["difficulty"],
                "tags": q["tags"],
                "image": q["image"]
            }
            localized_questions.append(localized_q)
        
        return localized_questions
        
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch questions")

@app.get("/api/questions/{question_id}")
async def get_question(
    question_id: str, 
    language: Optional[str] = "de",
    user: Optional[Dict] = Depends(get_optional_user)
):
    try:
        # Get from Firebase or MongoDB
        if firebase_db and user:
            doc_ref = firebase_db.collection('questions').document(question_id)
            doc = doc_ref.get()
            if doc.exists:
                question = doc.to_dict()
            else:
                raise HTTPException(status_code=404, detail="Question not found")
        else:
            question = questions_collection.find_one({"id": question_id}, {"_id": 0})
            if not question:
                raise HTTPException(status_code=404, detail="Question not found")
        
        # Localize response
        return {
            "id": question["id"],
            "question": question["question"].get(language, question["question"]["de"]),
            "type": question["type"],
            "options": question["options"].get(language, question["options"]["de"]),
            "correctAnswer": question["correctAnswer"],
            "explanation": question["explanation"].get(language, question["explanation"]["de"]),
            "topic": question["topic"],
            "difficulty": question["difficulty"],
            "tags": question["tags"],
            "image": question["image"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching question {question_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch question")

@app.get("/api/random-question")
async def get_random_question(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    language: Optional[str] = "de",
    user: Optional[Dict] = Depends(get_optional_user)
):
    try:
        # Build aggregation pipeline for random question
        pipeline = []
        
        match_stage = {}
        if topic:
            match_stage["topic"] = topic
        if difficulty:
            match_stage["difficulty"] = difficulty
            
        if match_stage:
            pipeline.append({"$match": match_stage})
            
        pipeline.append({"$sample": {"size": 1}})
        
        questions = list(questions_collection.aggregate(pipeline))
        
        if not questions:
            raise HTTPException(status_code=404, detail="No questions found")
        
        question = questions[0]
        question.pop("_id", None)
        
        # Localize response
        return {
            "id": question["id"],
            "question": question["question"].get(language, question["question"]["de"]),
            "type": question["type"],
            "options": question["options"].get(language, question["options"]["de"]),
            "correctAnswer": question["correctAnswer"],
            "topic": question["topic"],
            "difficulty": question["difficulty"],
            "tags": question["tags"],
            "image": question["image"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching random question: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch random question")

@app.post("/api/answer")
async def submit_answer(
    answer: QuestionAnswer,
    language: Optional[str] = "de",
    user: Optional[Dict] = Depends(get_optional_user)
):
    try:
        # Get the question
        if firebase_db and user:
            doc_ref = firebase_db.collection('questions').document(answer.questionId)
            doc = doc_ref.get()
            if doc.exists:
                question = doc.to_dict()
            else:
                raise HTTPException(status_code=404, detail="Question not found")
        else:
            question = questions_collection.find_one({"id": answer.questionId}, {"_id": 0})
            if not question:
                raise HTTPException(status_code=404, detail="Question not found")
        
        # Check if answer is correct
        correct_answers = set(question["correctAnswer"])
        user_answers = set(answer.selectedAnswers)
        is_correct = correct_answers == user_answers
        
        # Calculate XP and streaks (gamification)
        base_xp = 10 if is_correct else 2
        streak_bonus = 0
        
        # Speed bonus
        if answer.timeSpent < 10 and is_correct:
            base_xp = int(base_xp * 1.2)
        
        # Difficulty bonus
        if question.get("difficulty") == "hard" and is_correct:
            base_xp = int(base_xp * 1.5)
        
        # User ID for progress tracking
        user_id = user["uid"] if user else f"guest_{uuid.uuid4().hex[:8]}"
        
        # Update progress in Firestore or MongoDB
        progress_data = {
            "userId": user_id,
            "questionId": answer.questionId,
            "selectedAnswers": answer.selectedAnswers,
            "correctAnswers": question["correctAnswer"],
            "isCorrect": is_correct,
            "timeSpent": answer.timeSpent,
            "timestamp": datetime.utcnow(),
            "topic": question["topic"],
            "difficulty": question["difficulty"],
            "xpEarned": base_xp + streak_bonus,
            "isFirstTry": answer.isFirstTry
        }
        
        if firebase_db and user:
            # Save to Firestore
            progress_ref = firebase_db.collection('user_progress').document(user_id)
            progress_ref.collection('answers').add(progress_data)
        else:
            # Save to MongoDB
            progress_collection.insert_one(progress_data)
        
        return {
            "correct": is_correct,
            "correctAnswers": question["correctAnswer"],
            "explanation": question["explanation"].get(language, question["explanation"]["de"]),
            "xpEarned": base_xp + streak_bonus,
            "streakBonus": streak_bonus,
            "timeSpent": answer.timeSpent
        }
        
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit answer")

@app.get("/api/topics")
async def get_topics():
    try:
        pipeline = [
            {"$group": {
                "_id": "$topic",
                "count": {"$sum": 1},
                "difficulties": {"$addToSet": "$difficulty"}
            }},
            {"$project": {
                "topic": "$_id",
                "totalQuestions": "$count",
                "difficulties": "$difficulties",
                "_id": 0
            }},
            {"$sort": {"topic": 1}}
        ]
        
        topics = list(questions_collection.aggregate(pipeline))
        return topics
        
    except Exception as e:
        logger.error(f"Error fetching topics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch topics")

@app.get("/api/user/progress")
async def get_user_progress(user: Dict = Depends(get_current_user)):
    try:
        user_id = user["uid"]
        
        if firebase_db:
            # Get from Firestore
            progress_ref = firebase_db.collection('user_progress').document(user_id)
            doc = progress_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                # Initialize user progress
                initial_progress = {
                    "totalXP": 0,
                    "currentLevel": 1,
                    "totalQuestionsAnswered": 0,
                    "correctAnswers": 0,
                    "currentStreak": 0,
                    "longestStreak": 0,
                    "achievements": [],
                    "badges": [],
                    "favoriteQuestions": [],
                    "difficultQuestions": [],
                    "dailyGoal": 20,
                    "weeklyGoal": 140,
                    "lastStudyDate": None
                }
                progress_ref.set(initial_progress)
                return initial_progress
        else:
            # Fallback to MongoDB aggregation
            pipeline = [
                {"$match": {"userId": user_id}},
                {"$group": {
                    "_id": None,
                    "totalAnswered": {"$sum": 1},
                    "correctAnswers": {"$sum": {"$cond": ["$isCorrect", 1, 0]}},
                    "totalXP": {"$sum": "$xpEarned"},
                    "topicStats": {"$push": {
                        "topic": "$topic",
                        "correct": "$isCorrect",
                        "timeSpent": "$timeSpent"
                    }}
                }}
            ]
            
            result = list(progress_collection.aggregate(pipeline))
            if result:
                stats = result[0]
                return {
                    "totalQuestionsAnswered": stats["totalAnswered"],
                    "correctAnswers": stats["correctAnswers"],
                    "totalXP": stats.get("totalXP", 0),
                    "overallAccuracy": (stats["correctAnswers"] / stats["totalAnswered"] * 100) if stats["totalAnswered"] > 0 else 0,
                    "currentLevel": max(1, int((stats.get("totalXP", 0) / 100) ** 0.5)),
                    "topicStats": stats["topicStats"]
                }
            else:
                return {"totalQuestionsAnswered": 0, "correctAnswers": 0, "totalXP": 0}
                
    except Exception as e:
        logger.error(f"Error fetching user progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user progress")

@app.get("/api/spaced-repetition")
async def get_spaced_repetition_questions(
    limit: int = 20,
    user: Dict = Depends(get_current_user)
):
    """Get questions due for review based on spaced repetition algorithm"""
    try:
        user_id = user["uid"]
        
        # This would implement the Leitner system logic
        # For now, return recent incorrect answers
        recent_incorrect = list(progress_collection.find(
            {"userId": user_id, "isCorrect": False},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit))
        
        question_ids = [item["questionId"] for item in recent_incorrect]
        
        if question_ids:
            questions = list(questions_collection.find(
                {"id": {"$in": question_ids}},
                {"_id": 0}
            ))
            return questions
        else:
            # Return random questions if no review needed
            return list(questions_collection.aggregate([{"$sample": {"size": limit}}]))
            
    except Exception as e:
        logger.error(f"Error fetching spaced repetition questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch spaced repetition questions")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)