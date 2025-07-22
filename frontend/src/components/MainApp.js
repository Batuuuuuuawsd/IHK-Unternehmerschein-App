import React, { useState, useEffect } from 'react';
import { 
  QuestionMarkCircleIcon, 
  BookOpenIcon, 
  ChartBarIcon, 
  UserCircleIcon,
  CalculatorIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  FireIcon,
  TrophyIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import QuestionCard from './QuestionCard';
import SpacedRepetitionSystem from '../services/SpacedRepetition';
import GamificationService from '../services/GameificationService';
import { questionBank, topicConfig } from '../data/questionBank';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const MainApp = () => {
  const { user, userProfile, updateUserProfile, signOut } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  
  // Core state
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, question, topics, progress, profile, math, settings
  const [darkMode, setDarkMode] = useState(() => {
    return userProfile?.preferences?.darkMode || false;
  });
  
  // Question system state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questionMode, setQuestionMode] = useState('random'); // random, topic, spaced, exam, favorites, difficult
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Data state
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState({});
  const [userStats, setUserStats] = useState({});
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [achievements, setAchievements] = useState([]);
  
  // Services
  const [spacedRepetition] = useState(new SpacedRepetitionSystem());
  const [gamification] = useState(new GamificationService());

  // Initialize data
  useEffect(() => {
    loadInitialData();
    checkDailyChallenge();
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        fetchTopics(),
        fetchProgress(),
        fetchUserStats()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Fehler beim Laden der Daten');
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/topics`);
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      // Use fallback topics from question bank
      const fallbackTopics = Object.keys(topicConfig).map(topic => ({
        topic,
        totalQuestions: questionBank.filter(q => q.topic === topic).length
      }));
      setTopics(fallbackTopics);
    }
  };

  const fetchProgress = async () => {
    try {
      if (user?.uid && user.uid !== 'guest') {
        const response = await fetch(`${API_BASE_URL}/api/user/progress`, {
          headers: user.accessToken ? {
            'Authorization': `Bearer ${user.accessToken}`
          } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
        }
      } else {
        // Load progress from localStorage for guests
        const guestProgress = localStorage.getItem('guestProgress');
        if (guestProgress) {
          setProgress(JSON.parse(guestProgress));
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Load stats from userProfile or localStorage
      const stats = userProfile?.progress || {
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        totalXP: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
        badges: []
      };
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const checkDailyChallenge = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedChallenge = localStorage.getItem('dailyChallenge');
      
      if (savedChallenge) {
        const challenge = JSON.parse(savedChallenge);
        if (challenge.date === today) {
          setDailyChallenge(challenge);
          return;
        }
      }
      
      // Generate new daily challenge
      const newChallenge = gamification.generateDailyChallenge(userStats);
      localStorage.setItem('dailyChallenge', JSON.stringify(newChallenge));
      setDailyChallenge(newChallenge);
    } catch (error) {
      console.error('Error checking daily challenge:', error);
    }
  };

  const fetchQuestion = async (mode = 'random', topicFilter = null) => {
    setLoading(true);
    try {
      let url = '';
      let params = new URLSearchParams({ language });

      switch (mode) {
        case 'topic':
          if (topicFilter && topicFilter !== 'all') {
            params.append('topic', topicFilter);
          }
          url = `${API_BASE_URL}/api/random-question?${params}`;
          break;
        case 'spaced':
          url = `${API_BASE_URL}/api/spaced-repetition?${params}`;
          break;
        default:
          url = `${API_BASE_URL}/api/random-question?${params}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (mode === 'spaced' && Array.isArray(data)) {
          setSessionQuestions(data);
          setCurrentQuestionIndex(0);
          setCurrentQuestion(data[0] || null);
        } else {
          setCurrentQuestion(data);
        }
        
        setShowResult(false);
        setAnswerResult(null);
      } else {
        // Fallback to local questions
        const filteredQuestions = questionBank.filter(q => {
          if (topicFilter && topicFilter !== 'all') {
            return q.topic === topicFilter;
          }
          return true;
        });
        
        if (filteredQuestions.length > 0) {
          const randomQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
          setCurrentQuestion({
            ...randomQuestion,
            question: randomQuestion.question[language] || randomQuestion.question.de,
            options: randomQuestion.options[language] || randomQuestion.options.de,
            explanation: randomQuestion.explanation[language] || randomQuestion.explanation.de
          });
        }
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('Fehler beim Laden der Frage');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answerData) => {
    setLoading(true);
    try {
      // Submit answer to backend
      const response = await fetch(`${API_BASE_URL}/api/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.accessToken && { 'Authorization': `Bearer ${user.accessToken}` })
        },
        body: JSON.stringify(answerData)
      });

      let result;
      if (response.ok) {
        result = await response.json();
      } else {
        // Fallback: check answer locally
        const correct = currentQuestion.correctAnswer.every(answer => 
          answerData.selectedAnswers.includes(answer)
        ) && answerData.selectedAnswers.every(answer => 
          currentQuestion.correctAnswer.includes(answer)
        );

        result = {
          correct,
          correctAnswers: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
          xpEarned: correct ? 10 : 2,
          timeSpent: answerData.timeSpent
        };
      }

      setAnswerResult(result);
      setShowResult(true);

      // Update local progress and stats
      await updateLocalProgress(answerData, result);
      
      // Check for achievements
      const newAchievements = gamification.checkAchievements(userStats, achievements);
      if (newAchievements.length > 0) {
        setAchievements([...achievements, ...newAchievements.map(a => a.id)]);
        newAchievements.forEach(achievement => {
          toast.success(`🏆 ${achievement.name} erreicht!`);
        });
      }

      // Update daily challenge progress
      updateDailyChallengeProgress(result);

    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Fehler beim Übermitteln der Antwort');
    } finally {
      setLoading(false);
    }
  };

  const updateLocalProgress = async (answerData, result) => {
    try {
      const newStats = {
        ...userStats,
        totalQuestionsAnswered: userStats.totalQuestionsAnswered + 1,
        correctAnswers: userStats.correctAnswers + (result.correct ? 1 : 0),
        totalXP: userStats.totalXP + result.xpEarned,
        currentStreak: result.correct ? userStats.currentStreak + 1 : 0,
        longestStreak: Math.max(userStats.longestStreak, result.correct ? userStats.currentStreak + 1 : userStats.currentStreak),
        lastStudyDate: new Date()
      };

      // Calculate new level
      const levelInfo = gamification.calculateLevel(newStats.totalXP);
      newStats.currentLevel = levelInfo.currentLevel;

      setUserStats(newStats);
      
      // Update user profile
      if (user?.uid !== 'guest') {
        await updateUserProfile({ progress: newStats });
      } else {
        localStorage.setItem('guestProgress', JSON.stringify(newStats));
      }
    } catch (error) {
      console.error('Error updating local progress:', error);
    }
  };

  const updateDailyChallengeProgress = (result) => {
    if (!dailyChallenge) return;

    let newProgress = dailyChallenge.progress;
    
    switch (dailyChallenge.type) {
      case 'streak':
        if (result.correct) {
          newProgress = Math.min(dailyChallenge.target, userStats.currentStreak + 1);
        }
        break;
      case 'accuracy':
        // Would need to track session accuracy
        break;
      default:
        newProgress = Math.min(dailyChallenge.target, dailyChallenge.progress + 1);
    }

    const updatedChallenge = {
      ...dailyChallenge,
      progress: newProgress,
      completed: newProgress >= dailyChallenge.target
    };

    if (updatedChallenge.completed && !dailyChallenge.completed) {
      toast.success(`🎉 Tägliche Herausforderung abgeschlossen! +${dailyChallenge.reward.xp} XP`);
    }

    setDailyChallenge(updatedChallenge);
    localStorage.setItem('dailyChallenge', JSON.stringify(updatedChallenge));
  };

  const nextQuestion = () => {
    if (sessionQuestions.length > 0 && currentQuestionIndex < sessionQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(sessionQuestions[nextIndex]);
      setShowResult(false);
      setAnswerResult(null);
    } else {
      fetchQuestion(questionMode, selectedTopic);
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Update user preferences
    const newPreferences = {
      ...userProfile?.preferences,
      darkMode: newDarkMode
    };
    
    if (user?.uid !== 'guest') {
      await updateUserProfile({ preferences: newPreferences });
    } else {
      const guestProfile = JSON.parse(localStorage.getItem('guestProfile') || '{}');
      guestProfile.preferences = newPreferences;
      localStorage.setItem('guestProfile', JSON.stringify(guestProfile));
    }
  };

  const renderDashboard = () => {
    const levelInfo = gamification.calculateLevel(userStats.totalXP);
    const progressToNext = levelInfo.progressToNext || 0;
    const xpToNext = levelInfo.nextLevelXP - levelInfo.currentLevelXP;
    const progressPercentage = (progressToNext / xpToNext) * 100;

    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl text-white">
          <h2 className="text-2xl font-bold mb-2">
            {t('dashboard.welcome')}, {userProfile?.displayName || 'Lerner'}! 👋
          </h2>
          <p className="text-blue-100 mb-4">
            {gamification.getMotivationalMessage(userStats, 'morning')}
          </p>
          
          {/* Level Progress */}
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Level {levelInfo.currentLevel}</span>
              <span className="text-sm">{userStats.totalXP} XP</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-100 mt-2">
              {levelInfo.xpNeeded} XP bis Level {levelInfo.currentLevel + 1}
            </p>
          </div>
        </div>

        {/* Daily Challenge */}
        {dailyChallenge && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-yellow-500" />
                {t('game.dailyChallenge')}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                dailyChallenge.completed 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {dailyChallenge.progress}/{dailyChallenge.target}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              {dailyChallenge.description}
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(dailyChallenge.progress / dailyChallenge.target) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belohnung: {dailyChallenge.reward.xp} XP
              {dailyChallenge.reward.badge && ` + ${dailyChallenge.reward.badge} Badge`}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FireIcon className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.currentStreak || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('progress.streak')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <TrophyIcon className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {achievements.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('progress.achievements')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setQuestionMode('random');
              setCurrentView('question');
              fetchQuestion('random');
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl transition-colors"
          >
            <QuestionMarkCircleIcon className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Zufällige Frage</span>
          </button>
          
          <button
            onClick={() => {
              setQuestionMode('spaced');
              setCurrentView('question');
              fetchQuestion('spaced');
            }}
            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl transition-colors"
          >
            <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm font-medium">Wiederholung</span>
          </button>
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    if (loading && !currentQuestion) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!currentQuestion) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t('questions.noQuestions')}
          </p>
          <button
            onClick={() => fetchQuestion('random')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Neue Frage laden
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Question Progress */}
        {sessionQuestions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Frage {currentQuestionIndex + 1} von {sessionQuestions.length}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {questionMode === 'spaced' ? 'Spaced Repetition' : 'Übungsmode'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / sessionQuestions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Question Card */}
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          showResult={showResult}
          result={answerResult}
          disabled={loading}
          onFavorite={(questionId, isFavorite) => {
            toast.success(isFavorite ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
          }}
          onMarkDifficult={(questionId, isDifficult) => {
            toast.success(isDifficult ? 'Als schwierig markiert' : 'Schwierig-Markierung entfernt');
          }}
        />

        {/* Next Question Button */}
        {showResult && (
          <button
            onClick={nextQuestion}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {sessionQuestions.length > 0 && currentQuestionIndex < sessionQuestions.length - 1 
              ? 'Nächste Frage' 
              : 'Neue Frage'} →
          </button>
        )}
      </div>
    );
  };

  const renderBottomNav = () => {
    const navItems = [
      { key: 'dashboard', icon: ChartBarIcon, label: t('nav.dashboard') || 'Dashboard' },
      { key: 'question', icon: QuestionMarkCircleIcon, label: t('nav.questions') },
      { key: 'topics', icon: BookOpenIcon, label: t('nav.topics') },
      { key: 'progress', icon: ChartBarIcon, label: t('nav.progress') },
      { key: 'profile', icon: UserCircleIcon, label: t('nav.profile') }
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around">
            {navItems.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => {
                  setCurrentView(key);
                  if (key === 'question' && !currentQuestion) {
                    fetchQuestion(questionMode, selectedTopic);
                  }
                }}
                className={`flex flex-col items-center py-3 px-2 transition-colors ${
                  currentView === key 
                    ? 'text-blue-500' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                IHK Taxi Prüfung
              </h1>
              {userStats.totalXP > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Level {gamification.calculateLevel(userStats.totalXP).currentLevel} • {userStats.totalXP} XP
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="de">🇩🇪</option>
                <option value="en">🇬🇧</option>
                <option value="tr">🇹🇷</option>
              </select>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'question' && renderQuestion()}
        {/* Other views would be implemented here */}
        {currentView !== 'dashboard' && currentView !== 'question' && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">
              {currentView} wird entwickelt...
            </p>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Zurück zum Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      {renderBottomNav()}
    </div>
  );
};

export default MainApp;