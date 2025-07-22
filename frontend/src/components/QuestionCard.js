import React, { useState, useEffect } from 'react';
import { HeartIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, ExclamationTriangleIcon as ExclamationTriangleIconSolid } from '@heroicons/react/24/solid';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { topicConfig } from '../data/questionBank';

const QuestionCard = ({ 
  question, 
  onAnswer, 
  showResult = false, 
  result = null,
  onFavorite,
  onMarkDifficult,
  timeSpent = 0,
  disabled = false 
}) => {
  const { t, language } = useLanguage();
  const { userProfile, updateUserProfile } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [startTime] = useState(Date.now());
  const [currentTimeSpent, setCurrentTimeSpent] = useState(0);

  // Get question data in current language
  const questionText = question.question[language] || question.question.de;
  const options = question.options[language] || question.options.de;
  const explanation = result?.explanation?.[language] || result?.explanation?.de || '';

  // Check if question is favorited or marked as difficult
  const isFavorited = userProfile?.favoriteQuestions?.includes(question.id) || false;
  const isMarkedDifficult = userProfile?.difficultQuestions?.includes(question.id) || false;

  // Get topic configuration
  const topicInfo = topicConfig[question.topic] || {};

  useEffect(() => {
    if (!showResult) {
      const timer = setInterval(() => {
        setCurrentTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showResult, startTime]);

  const handleAnswerSelect = (answerIndex) => {
    if (disabled || showResult) return;

    if (question.type === 'single') {
      setSelectedAnswers([answerIndex]);
    } else if (question.type === 'multiple') {
      if (selectedAnswers.includes(answerIndex)) {
        setSelectedAnswers(selectedAnswers.filter(i => i !== answerIndex));
      } else {
        setSelectedAnswers([...selectedAnswers, answerIndex]);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0 || disabled) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onAnswer({
      questionId: question.id,
      selectedAnswers,
      timeSpent,
      isFirstTry: true // Could track this more accurately
    });
  };

  const handleFavorite = async () => {
    if (!onFavorite) return;

    const currentFavorites = userProfile?.favoriteQuestions || [];
    let newFavorites;

    if (isFavorited) {
      newFavorites = currentFavorites.filter(id => id !== question.id);
    } else {
      newFavorites = [...currentFavorites, question.id];
    }

    await updateUserProfile({ favoriteQuestions: newFavorites });
    onFavorite(question.id, !isFavorited);
  };

  const handleMarkDifficult = async () => {
    if (!onMarkDifficult) return;

    const currentDifficult = userProfile?.difficultQuestions || [];
    let newDifficult;

    if (isMarkedDifficult) {
      newDifficult = currentDifficult.filter(id => id !== question.id);
    } else {
      newDifficult = [...currentDifficult, question.id];
    }

    await updateUserProfile({ difficultQuestions: newDifficult });
    onMarkDifficult(question.id, !isMarkedDifficult);
  };

  const getAnswerButtonClass = (index) => {
    const baseClass = "w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ";
    
    if (showResult && result) {
      if (selectedAnswers.includes(index)) {
        if (result.correctAnswers.includes(index)) {
          return baseClass + "border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300";
        } else {
          return baseClass + "border-red-500 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300";
        }
      } else if (result.correctAnswers.includes(index)) {
        return baseClass + "border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300";
      } else {
        return baseClass + "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300";
      }
    } else {
      if (selectedAnswers.includes(index)) {
        return baseClass + "border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
      } else {
        return baseClass + "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md";
      }
    }
  };

  const getAnswerIcon = (index) => {
    const isSelected = selectedAnswers.includes(index);
    const isCorrect = result?.correctAnswers.includes(index);
    
    if (showResult && result) {
      if (isSelected && isCorrect) {
        return <div className="w-3 h-3 rounded-full bg-green-500"></div>;
      } else if (isSelected && !isCorrect) {
        return <div className="w-3 h-3 rounded-full bg-red-500"></div>;
      } else if (!isSelected && isCorrect) {
        return <div className="w-3 h-3 rounded-full bg-green-500"></div>;
      } else {
        return <div className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>;
      }
    } else {
      return (
        <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-blue-500' : 'border-2 border-gray-300 dark:border-gray-600'}`}>
          {isSelected && <div className="w-3 h-3 rounded-full bg-blue-500"></div>}
        </div>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Question Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white bg-${topicInfo.color}-500`}>
              {topicInfo.icon} {question.topic}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              {t(`questions.${question.type}`)}
            </span>
            {question.difficulty && (
              <span className={`text-xs px-2 py-1 rounded ${
                question.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
                {question.difficulty}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!showResult && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-4 h-4 mr-1" />
                {currentTimeSpent}s
              </div>
            )}
            <button
              onClick={handleFavorite}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('questions.favorite')}
            >
              {isFavorited ? (
                <HeartIconSolid className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <button
              onClick={handleMarkDifficult}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('questions.difficult')}
            >
              {isMarkedDifficult ? (
                <ExclamationTriangleIconSolid className="w-5 h-5 text-orange-500" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 dark:text-white leading-relaxed">
          {questionText}
        </h2>

        {question.image && (
          <div className="mt-4">
            <img 
              src={question.image} 
              alt="Question illustration"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Answer Options */}
      <div className="p-6">
        <div className="space-y-3 mb-6">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={disabled || showResult}
              className={getAnswerButtonClass(index)}
            >
              <div className="flex items-center">
                <span className="w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center">
                  {getAnswerIcon(index)}
                </span>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Result Section */}
        {showResult && result && (
          <div className={`p-4 rounded-lg border ${
            result.correct 
              ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center mb-3">
              {result.correct ? (
                <div className="flex items-center text-green-700 dark:text-green-300">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  {t('questions.correct')}
                </div>
              ) : (
                <div className="flex items-center text-red-700 dark:text-red-300">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  {t('questions.incorrect')}
                </div>
              )}
            </div>
            
            {explanation && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {explanation}
              </p>
            )}

            {timeSpent > 0 && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                {t('Zeit')}: {timeSpent}s
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {!showResult && (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswers.length === 0 || disabled}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {disabled ? t('common.loading') : t('questions.check')}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;