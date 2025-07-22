from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uuid
import json
from datetime import datetime, timedelta
from pymongo import MongoClient
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.ihk_taxi_app

# Collections
questions_collection = db.questions
users_collection = db.users
progress_collection = db.progress
sessions_collection = db.sessions

# Pydantic models
class Question(BaseModel):
    id: str
    frage: str
    typ: str  # "single", "multiple", "open"
    optionen: List[str]
    richtigeAntwort: List[int]
    erklaerung: str
    thema: str
    bild: Optional[str] = None

class Answer(BaseModel):
    question_id: str
    selected_answers: List[int]
    time_spent: int  # in seconds

class UserProgress(BaseModel):
    user_id: str
    question_id: str
    correct: bool
    selected_answers: List[int]
    time_spent: int
    timestamp: datetime

class TopicStats(BaseModel):
    thema: str
    total_questions: int
    answered: int
    correct: int
    accuracy: float

# Sample questions data
SAMPLE_QUESTIONS = [
    {
        "id": "001",
        "frage": "Welche Unterlagen müssen bei einer Kontrolle mitgeführt werden?",
        "typ": "single",
        "optionen": [
            "Führerschein, Fahrzeugpapiere, Mietvertrag",
            "Fahrzeugschein, Versicherungspolice, Personalausweis", 
            "Führerschein, Fahrzeugschein, Genehmigungsurkunde"
        ],
        "richtigeAntwort": [2],
        "erklaerung": "Im Taxi- und Mietwagenverkehr sind Führerschein, Fahrzeugschein und Genehmigungsurkunde mitzuführen.",
        "thema": "Recht"
    },
    {
        "id": "002", 
        "frage": "Wie hoch ist die Mindestversicherungssumme für Personenschäden?",
        "typ": "single",
        "optionen": [
            "7,5 Millionen Euro",
            "10 Millionen Euro",
            "15 Millionen Euro"
        ],
        "richtigeAntwort": [0],
        "erklaerung": "Die Mindestversicherungssumme für Personenschäden beträgt 7,5 Millionen Euro.",
        "thema": "Recht"
    },
    {
        "id": "003",
        "frage": "Was gehört zur kaufmännischen Buchführung?",
        "typ": "multiple",
        "optionen": [
            "Eingangsrechnungen erfassen",
            "Ausgangsrechnungen erstellen", 
            "Kassenbuch führen",
            "Fahrzeug waschen"
        ],
        "richtigeAntwort": [0, 1, 2],
        "erklaerung": "Zur kaufmännischen Buchführung gehören alle Geschäftsvorgänge wie Rechnungen und Kassenführung.",
        "thema": "Kaufmännische & finanzielle Führung"
    },
    {
        "id": "004",
        "frage": "Welche technischen Prüfungen sind für Taxen vorgeschrieben?",
        "typ": "single", 
        "optionen": [
            "Nur TÜV alle 2 Jahre",
            "TÜV jährlich und Taxameter-Eichung alle 2 Jahre",
            "Nur Taxameter-Eichung jährlich"
        ],
        "richtigeAntwort": [1],
        "erklaerung": "Taxen müssen jährlich zum TÜV und alle 2 Jahre zur Taxameter-Eichung.",
        "thema": "Technische Normen & Betrieb"
    },
    {
        "id": "005",
        "frage": "Welche Umweltplakette ist in den meisten Umweltzonen erforderlich?",
        "typ": "single",
        "optionen": [
            "Rote Plakette",
            "Gelbe Plakette", 
            "Grüne Plakette"
        ],
        "richtigeAntwort": [2],
        "erklaerung": "In den meisten Umweltzonen ist die grüne Umweltplakette erforderlich.",
        "thema": "Straßenverkehrssicherheit, Unfallverhütung, Umweltschutz"
    },
    {
        "id": "006",
        "frage": "Was ist bei grenzüberschreitenden Fahrten zu beachten?",
        "typ": "multiple",
        "optionen": [
            "Genehmigung für das Zielland", 
            "Gültige Versicherung im Ausland",
            "Mehrsprachige Fahrzeugpapiere",
            "Internationaler Führerschein"
        ],
        "richtigeAntwort": [0, 1, 3],
        "erklaerung": "Bei grenzüberschreitenden Fahrten sind Genehmigungen, Versicherungsschutz und internationaler Führerschein wichtig.",
        "thema": "Grenzüberschreitender Personenverkehr"
    },
    {
        "id": "007",
        "frage": "Wie oft muss ein Taxameter geeicht werden?",
        "typ": "single",
        "optionen": [
            "Jährlich",
            "Alle 2 Jahre", 
            "Alle 3 Jahre"
        ],
        "richtigeAntwort": [1],
        "erklaerung": "Taxameter müssen alle 2 Jahre geeicht werden.",
        "thema": "Technische Normen & Betrieb"
    },
    {
        "id": "008",
        "frage": "Was ist bei der Preiskalkulation zu beachten?",
        "typ": "multiple", 
        "optionen": [
            "Kraftstoffkosten",
            "Versicherungskosten",
            "Abschreibungen",
            "Lieblingsmusik des Fahrers"
        ],
        "richtigeAntwort": [0, 1, 2],
        "erklaerung": "Bei der Preiskalkulation müssen alle betriebswirtschaftlichen Kosten berücksichtigt werden.",
        "thema": "Kaufmännische & finanzielle Führung"
    }
]

# Initialize database with sample questions
@app.on_event("startup")
async def startup_event():
    # Clear and reinitialize questions collection
    questions_collection.delete_many({})
    questions_collection.insert_many(SAMPLE_QUESTIONS)
    logger.info(f"Initialized {len(SAMPLE_QUESTIONS)} sample questions")

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "IHK Taxi Exam App API is running"}

@app.get("/api/questions", response_model=List[Question])
async def get_questions(thema: Optional[str] = None, limit: Optional[int] = None):
    """Get questions, optionally filtered by topic"""
    try:
        query = {}
        if thema:
            query["thema"] = thema
            
        questions = list(questions_collection.find(query, {"_id": 0}))
        
        if limit:
            questions = questions[:limit]
            
        return questions
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch questions")

@app.get("/api/questions/{question_id}", response_model=Question)
async def get_question(question_id: str):
    """Get a specific question by ID"""
    try:
        question = questions_collection.find_one({"id": question_id}, {"_id": 0})
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        return question
    except Exception as e:
        logger.error(f"Error fetching question {question_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch question")

@app.get("/api/topics")
async def get_topics():
    """Get all available topics with question counts"""
    try:
        pipeline = [
            {"$group": {
                "_id": "$thema",
                "count": {"$sum": 1}
            }},
            {"$project": {
                "thema": "$_id",
                "total_questions": "$count",
                "_id": 0
            }}
        ]
        topics = list(questions_collection.aggregate(pipeline))
        return topics
    except Exception as e:
        logger.error(f"Error fetching topics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch topics")

@app.post("/api/answer")
async def submit_answer(answer: Answer):
    """Submit an answer and get immediate feedback"""
    try:
        # Get the question
        question = questions_collection.find_one({"id": answer.question_id}, {"_id": 0})
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Check if answer is correct
        correct_answers = set(question["richtigeAntwort"])
        user_answers = set(answer.selected_answers)
        is_correct = correct_answers == user_answers
        
        # Generate session ID for guest users
        session_id = str(uuid.uuid4())
        
        # Save progress
        progress_data = {
            "session_id": session_id,
            "question_id": answer.question_id,
            "selected_answers": answer.selected_answers,
            "correct_answers": question["richtigeAntwort"],
            "is_correct": is_correct,
            "time_spent": answer.time_spent,
            "timestamp": datetime.utcnow(),
            "thema": question["thema"]
        }
        
        progress_collection.insert_one(progress_data)
        
        return {
            "correct": is_correct,
            "correct_answers": question["richtigeAntwort"],
            "explanation": question["erklaerung"],
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit answer")

@app.get("/api/progress")
async def get_progress(session_id: Optional[str] = None):
    """Get user progress statistics"""
    try:
        query = {}
        if session_id:
            query["session_id"] = session_id
            
        # Get overall statistics
        total_answered = progress_collection.count_documents(query)
        correct_answered = progress_collection.count_documents({**query, "is_correct": True})
        
        overall_accuracy = (correct_answered / total_answered * 100) if total_answered > 0 else 0
        
        # Get topic-wise statistics
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$thema",
                "total": {"$sum": 1},
                "correct": {"$sum": {"$cond": ["$is_correct", 1, 0]}}
            }},
            {"$project": {
                "thema": "$_id",
                "answered": "$total", 
                "correct": "$correct",
                "accuracy": {"$multiply": [{"$divide": ["$correct", "$total"]}, 100]},
                "_id": 0
            }}
        ]
        
        topic_stats = list(progress_collection.aggregate(pipeline))
        
        # Get total questions per topic
        topic_totals = {}
        for topic in questions_collection.aggregate([
            {"$group": {"_id": "$thema", "total": {"$sum": 1}}}
        ]):
            topic_totals[topic["_id"]] = topic["total"]
            
        # Add total questions to topic stats
        for stat in topic_stats:
            stat["total_questions"] = topic_totals.get(stat["thema"], 0)
        
        return {
            "total_answered": total_answered,
            "correct_answered": correct_answered,
            "overall_accuracy": round(overall_accuracy, 1),
            "topic_stats": topic_stats
        }
    except Exception as e:
        logger.error(f"Error fetching progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch progress")

@app.get("/api/random-question")
async def get_random_question():
    """Get a random question"""
    try:
        questions = list(questions_collection.aggregate([{"$sample": {"size": 1}}]))
        if not questions:
            raise HTTPException(status_code=404, detail="No questions found")
        
        question = questions[0]
        question.pop("_id", None)
        return question
    except Exception as e:
        logger.error(f"Error fetching random question: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch random question")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)