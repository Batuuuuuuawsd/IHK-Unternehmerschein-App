import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const App = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [progress, setProgress] = useState({});
  const [sessionId, setSessionId] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('question'); // 'question', 'progress', 'topics'

  useEffect(() => {
    // Initialize session
    const storedSessionId = localStorage.getItem('ihk_session_id') || generateSessionId();
    setSessionId(storedSessionId);
    localStorage.setItem('ihk_session_id', storedSessionId);

    // Load initial data
    fetchTopics();
    fetchRandomQuestion();
    fetchProgress();
  }, []);

  const generateSessionId = () => {
    return 'guest_' + Math.random().toString(36).substr(2, 9);
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/topics`);
      const data = await response.json();
      setTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchRandomQuestion = async () => {
    setLoading(true);
    try {
      const url = selectedTopic === 'all' 
        ? `${API_BASE_URL}/api/random-question`
        : `${API_BASE_URL}/api/questions?thema=${encodeURIComponent(selectedTopic)}&limit=1`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setCurrentQuestion(data[0]);
      } else {
        setCurrentQuestion(data);
      }
      
      setSelectedAnswers([]);
      setShowResult(false);
      setAnswerResult(null);
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress?session_id=${sessionId}`);
      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    if (currentQuestion.typ === 'single') {
      setSelectedAnswers([answerIndex]);
    } else if (currentQuestion.typ === 'multiple') {
      if (selectedAnswers.includes(answerIndex)) {
        setSelectedAnswers(selectedAnswers.filter(i => i !== answerIndex));
      } else {
        setSelectedAnswers([...selectedAnswers, answerIndex]);
      }
    }
  };

  const submitAnswer = async () => {
    if (selectedAnswers.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_answers: selectedAnswers,
          time_spent: 30, // Could track actual time
        }),
      });

      const result = await response.json();
      setAnswerResult(result);
      setShowResult(true);
      
      // Update progress
      setTimeout(() => {
        fetchProgress();
      }, 500);
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    fetchRandomQuestion();
  };

  const getTopicColor = (topic) => {
    const colors = {
      'Recht': 'bg-blue-500',
      'Kaufmännische & finanzielle Führung': 'bg-green-500',
      'Technische Normen & Betrieb': 'bg-yellow-500',
      'Straßenverkehrssicherheit, Unfallverhütung, Umweltschutz': 'bg-red-500',
      'Grenzüberschreitender Personenverkehr': 'bg-purple-500',
    };
    return colors[topic] || 'bg-gray-500';
  };

  const renderQuestion = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!currentQuestion) {
      return <div className="text-center py-8">Keine Frage verfügbar</div>;
    }

    return (
      <div className="space-y-6">
        {/* Topic Badge */}
        <div className="flex justify-between items-center">
          <span className={`inline-block px-3 py-1 rounded-full text-white text-sm ${getTopicColor(currentQuestion.thema)}`}>
            {currentQuestion.thema}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentQuestion.typ === 'multiple' ? 'Mehrfachauswahl' : 'Einzelauswahl'}
          </span>
        </div>

        {/* Question */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">
            {currentQuestion.frage}
          </h2>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.optionen.map((option, index) => (
              <button
                key={index}
                onClick={() => !showResult && handleAnswerSelect(index)}
                disabled={showResult}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswers.includes(index)
                    ? showResult
                      ? answerResult?.correct_answers.includes(index)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900'
                        : 'border-red-500 bg-red-50 dark:bg-red-900'
                      : 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : showResult && answerResult?.correct_answers.includes(index)
                    ? 'border-green-500 bg-green-50 dark:bg-green-900'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
              >
                <div className="flex items-center">
                  <span className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedAnswers.includes(index) || (showResult && answerResult?.correct_answers.includes(index))
                      ? 'border-current' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedAnswers.includes(index) && (
                      <div className={`w-3 h-3 rounded-full ${
                        showResult
                          ? answerResult?.correct_answers.includes(index) 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                          : 'bg-blue-500'
                      }`}></div>
                    )}
                    {!selectedAnswers.includes(index) && showResult && answerResult?.correct_answers.includes(index) && (
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    )}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Result */}
          {showResult && answerResult && (
            <div className={`mt-6 p-4 rounded-lg ${
              answerResult.correct 
                ? 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800' 
                : 'bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800'
            } border`}>
              <div className="flex items-center mb-2">
                {answerResult.correct ? (
                  <div className="flex items-center text-green-700 dark:text-green-300">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Richtig!
                  </div>
                ) : (
                  <div className="flex items-center text-red-700 dark:text-red-300">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                    Falsch
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {answerResult.explanation}
              </p>
              <button
                onClick={nextQuestion}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Nächste Frage
              </button>
            </div>
          )}

          {/* Submit Button */}
          {!showResult && (
            <button
              onClick={submitAnswer}
              disabled={selectedAnswers.length === 0 || loading}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Wird geprüft...' : 'Antwort prüfen'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderProgress = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Fortschritt</h2>
        
        {/* Overall Stats */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Gesamtstatistik</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{progress.total_answered || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Beantwortet</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{progress.correct_answered || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Richtig</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{progress.overall_accuracy || 0}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Genauigkeit</div>
            </div>
          </div>
        </div>

        {/* Topic Stats */}
        {progress.topic_stats && progress.topic_stats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Themen-Fortschritt</h3>
            <div className="space-y-4">
              {progress.topic_stats.map((topic, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800 dark:text-white">{topic.thema}</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {topic.answered}/{topic.total_questions} Fragen
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {topic.correct} richtig • {Math.round(topic.accuracy)}% Genauigkeit
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(topic.answered / topic.total_questions) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTopics = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Themen</h2>
        
        <div className="grid gap-4">
          <button
            onClick={() => {
              setSelectedTopic('all');
              setCurrentView('question');
              fetchRandomQuestion();
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedTopic === 'all'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300'
            }`}
          >
            <h3 className="font-semibold text-gray-800 dark:text-white">Alle Themen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Zufällige Fragen aus allen Bereichen</p>
          </button>
          
          {topics.map((topic, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedTopic(topic.thema);
                setCurrentView('question');
                fetchRandomQuestion();
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedTopic === topic.thema
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{topic.thema}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{topic.total_questions} Fragen</p>
                </div>
                <div className={`w-4 h-4 rounded-full ${getTopicColor(topic.thema)}`}></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">IHK Taxi Prüfung</h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {currentView === 'question' && renderQuestion()}
        {currentView === 'progress' && renderProgress()}
        {currentView === 'topics' && renderTopics()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto">
          <div className="flex justify-around py-2">
            <button
              onClick={() => setCurrentView('question')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'question' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
              </svg>
              <span className="text-xs mt-1">Fragen</span>
            </button>
            <button
              onClick={() => setCurrentView('topics')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'topics' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
              </svg>
              <span className="text-xs mt-1">Themen</span>
            </button>
            <button
              onClick={() => setCurrentView('progress')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'progress' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
              </svg>
              <span className="text-xs mt-1">Fortschritt</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom Spacing for Fixed Navigation */}
      <div className="h-20"></div>
    </div>
  );
};

export default App;