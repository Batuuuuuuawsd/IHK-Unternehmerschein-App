#!/usr/bin/env python3
"""
Comprehensive Backend Testing for IHK Taxi Exam Learning App
Tests all API endpoints and database operations
"""

import requests
import json
import time
import sys
from typing import Dict, List, Any

# Get backend URL from environment
BACKEND_URL = "https://a1ea7671-5737-4b2d-bcb5-a47437e8d142.preview.emergentagent.com/api"

class IHKTaxiBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.session_id = None
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "ok":
                    self.log_test("Health Check", True, "API is running and responsive")
                    return True
                else:
                    self.log_test("Health Check", False, "Invalid health response format", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_topics_endpoint(self):
        """Test the topics endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/topics", timeout=10)
            
            if response.status_code == 200:
                topics = response.json()
                
                # Verify we have the expected 5 IHK topics
                expected_topics = [
                    "Recht",
                    "Kaufmännische & finanzielle Führung", 
                    "Technische Normen & Betrieb",
                    "Straßenverkehrssicherheit, Unfallverhütung, Umweltschutz",
                    "Grenzüberschreitender Personenverkehr"
                ]
                
                if len(topics) >= 5:
                    topic_names = [t.get("thema") for t in topics]
                    missing_topics = [t for t in expected_topics if t not in topic_names]
                    
                    if not missing_topics:
                        total_questions = sum(t.get("total_questions", 0) for t in topics)
                        self.log_test("Topics Endpoint", True, 
                                    f"All 5 IHK topics found with {total_questions} total questions", 
                                    topics)
                        return True
                    else:
                        self.log_test("Topics Endpoint", False, 
                                    f"Missing topics: {missing_topics}", topics)
                        return False
                else:
                    self.log_test("Topics Endpoint", False, 
                                f"Expected 5 topics, got {len(topics)}", topics)
                    return False
            else:
                self.log_test("Topics Endpoint", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Topics Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_questions_endpoint(self):
        """Test the questions endpoint"""
        try:
            # Test getting all questions
            response = self.session.get(f"{self.base_url}/questions", timeout=10)
            
            if response.status_code == 200:
                questions = response.json()
                
                if len(questions) >= 8:  # We expect at least 8 sample questions
                    # Verify question structure
                    sample_question = questions[0]
                    required_fields = ["id", "frage", "typ", "optionen", "richtigeAntwort", "erklaerung", "thema"]
                    
                    missing_fields = [field for field in required_fields if field not in sample_question]
                    if not missing_fields:
                        # Test filtering by topic
                        test_topic = "Recht"
                        topic_response = self.session.get(f"{self.base_url}/questions?thema={test_topic}")
                        
                        if topic_response.status_code == 200:
                            topic_questions = topic_response.json()
                            if all(q.get("thema") == test_topic for q in topic_questions):
                                self.log_test("Questions Endpoint", True, 
                                            f"Retrieved {len(questions)} questions, topic filtering works", 
                                            {"total": len(questions), "topic_filtered": len(topic_questions)})
                                return True
                            else:
                                self.log_test("Questions Endpoint", False, 
                                            "Topic filtering not working correctly", topic_questions)
                                return False
                        else:
                            self.log_test("Questions Endpoint", False, 
                                        f"Topic filtering failed: HTTP {topic_response.status_code}")
                            return False
                    else:
                        self.log_test("Questions Endpoint", False, 
                                    f"Missing required fields: {missing_fields}", sample_question)
                        return False
                else:
                    self.log_test("Questions Endpoint", False, 
                                f"Expected at least 8 questions, got {len(questions)}")
                    return False
            else:
                self.log_test("Questions Endpoint", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Questions Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_specific_question_endpoint(self):
        """Test getting a specific question by ID"""
        try:
            # Test with known question ID from sample data
            test_id = "001"
            response = self.session.get(f"{self.base_url}/questions/{test_id}", timeout=10)
            
            if response.status_code == 200:
                question = response.json()
                
                if question.get("id") == test_id:
                    # Verify it's the expected question about required documents
                    if "Unterlagen" in question.get("frage", "") and question.get("thema") == "Recht":
                        self.log_test("Specific Question", True, 
                                    f"Retrieved question {test_id} correctly", question)
                        return True
                    else:
                        self.log_test("Specific Question", False, 
                                    "Question content doesn't match expected", question)
                        return False
                else:
                    self.log_test("Specific Question", False, 
                                f"ID mismatch: expected {test_id}, got {question.get('id')}")
                    return False
            elif response.status_code == 404:
                self.log_test("Specific Question", False, 
                            f"Question {test_id} not found - database may not be initialized")
                return False
            else:
                self.log_test("Specific Question", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Specific Question", False, f"Error: {str(e)}")
            return False
    
    def test_random_question_endpoint(self):
        """Test the random question endpoint"""
        try:
            # Get multiple random questions to verify randomness
            questions = []
            for i in range(3):
                response = self.session.get(f"{self.base_url}/random-question", timeout=10)
                
                if response.status_code == 200:
                    question = response.json()
                    questions.append(question.get("id"))
                    time.sleep(0.1)  # Small delay between requests
                else:
                    self.log_test("Random Question", False, f"HTTP {response.status_code}", response.text)
                    return False
            
            # Check if we got valid questions
            if all(q for q in questions):
                # Check if there's some variation (not all the same)
                unique_questions = len(set(questions))
                self.log_test("Random Question", True, 
                            f"Retrieved {len(questions)} random questions, {unique_questions} unique", 
                            questions)
                return True
            else:
                self.log_test("Random Question", False, "Invalid question data received", questions)
                return False
                
        except Exception as e:
            self.log_test("Random Question", False, f"Error: {str(e)}")
            return False
    
    def test_answer_submission(self):
        """Test answer submission and feedback"""
        try:
            # First get a known question to test with
            response = self.session.get(f"{self.base_url}/questions/001", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Answer Submission", False, "Could not get test question")
                return False
            
            question = response.json()
            correct_answers = question.get("richtigeAntwort", [])
            
            # Test correct answer submission
            correct_payload = {
                "question_id": "001",
                "selected_answers": correct_answers,
                "time_spent": 30
            }
            
            response = self.session.post(f"{self.base_url}/answer", 
                                       json=correct_payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("correct") == True:
                    self.session_id = result.get("session_id")  # Store for progress testing
                    
                    # Test incorrect answer submission
                    incorrect_answers = [0] if correct_answers != [0] else [1]
                    incorrect_payload = {
                        "question_id": "001", 
                        "selected_answers": incorrect_answers,
                        "time_spent": 25
                    }
                    
                    incorrect_response = self.session.post(f"{self.base_url}/answer", 
                                                         json=incorrect_payload, timeout=10)
                    
                    if incorrect_response.status_code == 200:
                        incorrect_result = incorrect_response.json()
                        
                        if incorrect_result.get("correct") == False:
                            self.log_test("Answer Submission", True, 
                                        "Both correct and incorrect answers processed correctly",
                                        {"correct_result": result, "incorrect_result": incorrect_result})
                            return True
                        else:
                            self.log_test("Answer Submission", False, 
                                        "Incorrect answer marked as correct", incorrect_result)
                            return False
                    else:
                        self.log_test("Answer Submission", False, 
                                    f"Incorrect answer submission failed: HTTP {incorrect_response.status_code}")
                        return False
                else:
                    self.log_test("Answer Submission", False, 
                                "Correct answer marked as incorrect", result)
                    return False
            else:
                self.log_test("Answer Submission", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Answer Submission", False, f"Error: {str(e)}")
            return False
    
    def test_progress_tracking(self):
        """Test progress tracking functionality"""
        try:
            # Test general progress (without session_id)
            response = self.session.get(f"{self.base_url}/progress", timeout=10)
            
            if response.status_code == 200:
                progress = response.json()
                
                required_fields = ["total_answered", "correct_answered", "overall_accuracy", "topic_stats"]
                missing_fields = [field for field in required_fields if field not in progress]
                
                if not missing_fields:
                    # Test session-specific progress if we have a session_id
                    if self.session_id:
                        session_response = self.session.get(
                            f"{self.base_url}/progress?session_id={self.session_id}", timeout=10)
                        
                        if session_response.status_code == 200:
                            session_progress = session_response.json()
                            self.log_test("Progress Tracking", True, 
                                        f"Progress tracking working. Total answered: {progress['total_answered']}, Session answered: {session_progress['total_answered']}", 
                                        {"general": progress, "session": session_progress})
                            return True
                        else:
                            self.log_test("Progress Tracking", False, 
                                        f"Session progress failed: HTTP {session_response.status_code}")
                            return False
                    else:
                        self.log_test("Progress Tracking", True, 
                                    f"General progress working. Total answered: {progress['total_answered']}", 
                                    progress)
                        return True
                else:
                    self.log_test("Progress Tracking", False, 
                                f"Missing required fields: {missing_fields}", progress)
                    return False
            else:
                self.log_test("Progress Tracking", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Progress Tracking", False, f"Error: {str(e)}")
            return False
    
    def test_multiple_choice_questions(self):
        """Test multiple choice question handling"""
        try:
            # Get question 003 which is multiple choice
            response = self.session.get(f"{self.base_url}/questions/003", timeout=10)
            
            if response.status_code == 200:
                question = response.json()
                
                if question.get("typ") == "multiple":
                    correct_answers = question.get("richtigeAntwort", [])
                    
                    # Test correct multiple choice answer
                    payload = {
                        "question_id": "003",
                        "selected_answers": correct_answers,
                        "time_spent": 45
                    }
                    
                    answer_response = self.session.post(f"{self.base_url}/answer", 
                                                      json=payload, timeout=10)
                    
                    if answer_response.status_code == 200:
                        result = answer_response.json()
                        
                        if result.get("correct") == True:
                            self.log_test("Multiple Choice Questions", True, 
                                        "Multiple choice question handling works correctly", 
                                        {"question": question, "result": result})
                            return True
                        else:
                            self.log_test("Multiple Choice Questions", False, 
                                        "Multiple choice correct answer marked as incorrect", result)
                            return False
                    else:
                        self.log_test("Multiple Choice Questions", False, 
                                    f"Answer submission failed: HTTP {answer_response.status_code}")
                        return False
                else:
                    self.log_test("Multiple Choice Questions", False, 
                                f"Question 003 is not multiple choice: {question.get('typ')}")
                    return False
            else:
                self.log_test("Multiple Choice Questions", False, 
                            f"Could not get question 003: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Multiple Choice Questions", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting IHK Taxi Exam Backend Tests")
        print(f"📡 Testing API at: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_health_endpoint,
            self.test_topics_endpoint, 
            self.test_questions_endpoint,
            self.test_specific_question_endpoint,
            self.test_random_question_endpoint,
            self.test_answer_submission,
            self.test_multiple_choice_questions,
            self.test_progress_tracking
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ FAIL: {test.__name__} - Unexpected error: {str(e)}")
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend tests PASSED! The IHK Taxi Exam API is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests FAILED. See details above.")
        
        return passed == total
    
    def get_summary(self):
        """Get test summary for reporting"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }

if __name__ == "__main__":
    tester = IHKTaxiBackendTester()
    success = tester.run_all_tests()
    
    # Print detailed results
    print("\n" + "=" * 60)
    print("📋 DETAILED TEST RESULTS")
    print("=" * 60)
    
    for result in tester.test_results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['test']}: {result['message']}")
    
    summary = tester.get_summary()
    print(f"\n📈 Success Rate: {summary['success_rate']:.1f}%")
    
    sys.exit(0 if success else 1)