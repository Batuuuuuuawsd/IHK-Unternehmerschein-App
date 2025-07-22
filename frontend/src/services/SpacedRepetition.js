// Spaced Repetition System using Leitner Algorithm
class SpacedRepetitionSystem {
  constructor() {
    this.boxes = {
      1: { interval: 1, name: 'Daily' },        // Review daily
      2: { interval: 3, name: 'Every 3 days' }, // Review every 3 days
      3: { interval: 7, name: 'Weekly' },       // Review weekly
      4: { interval: 14, name: 'Bi-weekly' },   // Review bi-weekly
      5: { interval: 30, name: 'Monthly' },     // Review monthly
      6: { interval: 90, name: 'Quarterly' }    // Review quarterly
    };
  }

  // Calculate which box a question should be in based on performance
  calculateBox(attempts, correctAttempts) {
    if (attempts === 0) return 1; // New question starts in box 1
    
    const accuracy = correctAttempts / attempts;
    
    if (accuracy >= 0.9) return Math.min(6, Math.floor(attempts / 2) + 1);
    if (accuracy >= 0.7) return Math.min(4, Math.floor(attempts / 3) + 1);
    if (accuracy >= 0.5) return Math.min(3, 2);
    
    return 1; // Poor performance goes back to box 1
  }

  // Determine if a question should be reviewed today
  shouldReview(lastReviewDate, box) {
    if (!lastReviewDate) return true; // Never reviewed before
    
    const daysSinceReview = Math.floor((Date.now() - new Date(lastReviewDate)) / (1000 * 60 * 60 * 24));
    return daysSinceReview >= this.boxes[box].interval;
  }

  // Move question to next/previous box based on answer correctness
  moveQuestion(currentBox, isCorrect) {
    if (isCorrect) {
      return Math.min(6, currentBox + 1); // Move to next box (max box 6)
    } else {
      return 1; // Incorrect answer moves back to box 1
    }
  }

  // Get questions due for review
  getQuestionsForReview(userProgress) {
    const questionsForReview = [];
    const today = new Date();

    Object.entries(userProgress).forEach(([questionId, progress]) => {
      const { box = 1, lastReviewDate, attempts = 0, correctAttempts = 0 } = progress;
      
      if (this.shouldReview(lastReviewDate, box)) {
        questionsForReview.push({
          questionId,
          box,
          priority: this.calculatePriority(box, lastReviewDate),
          attempts,
          correctAttempts,
          accuracy: attempts > 0 ? (correctAttempts / attempts * 100).toFixed(1) : 0
        });
      }
    });

    // Sort by priority (lower box numbers and older reviews first)
    return questionsForReview.sort((a, b) => a.priority - b.priority);
  }

  // Calculate priority for sorting (lower number = higher priority)
  calculatePriority(box, lastReviewDate) {
    const daysSinceReview = lastReviewDate 
      ? Math.floor((Date.now() - new Date(lastReviewDate)) / (1000 * 60 * 60 * 24))
      : 999; // Never reviewed = highest priority
    
    // Lower box = higher priority, older reviews = higher priority
    return box + (daysSinceReview > 30 ? -10 : 0);
  }

  // Update progress after answering a question
  updateProgress(questionId, isCorrect, currentProgress = {}) {
    const {
      attempts = 0,
      correctAttempts = 0,
      box = 1,
      firstAttemptDate = new Date(),
      totalTimeSpent = 0
    } = currentProgress;

    const newAttempts = attempts + 1;
    const newCorrectAttempts = correctAttempts + (isCorrect ? 1 : 0);
    const newBox = this.moveQuestion(box, isCorrect);

    return {
      attempts: newAttempts,
      correctAttempts: newCorrectAttempts,
      box: newBox,
      lastReviewDate: new Date(),
      firstAttemptDate,
      totalTimeSpent: totalTimeSpent + 30, // Assume 30 seconds per question
      accuracy: ((newCorrectAttempts / newAttempts) * 100).toFixed(1),
      isLearned: newBox >= 5 && ((newCorrectAttempts / newAttempts) >= 0.8)
    };
  }

  // Get study statistics
  getStudyStats(userProgress) {
    const stats = {
      totalQuestions: 0,
      learnedQuestions: 0,
      reviewingQuestions: 0,
      difficultQuestions: 0,
      boxDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      averageAccuracy: 0,
      dueToday: 0
    };

    let totalAccuracy = 0;
    let questionsWithAttempts = 0;

    Object.values(userProgress).forEach(progress => {
      const { box = 1, attempts = 0, correctAttempts = 0, lastReviewDate } = progress;
      
      stats.totalQuestions++;
      stats.boxDistribution[box]++;
      
      if (box >= 5) stats.learnedQuestions++;
      else if (box >= 3) stats.reviewingQuestions++;
      else stats.difficultQuestions++;

      if (attempts > 0) {
        const accuracy = (correctAttempts / attempts) * 100;
        totalAccuracy += accuracy;
        questionsWithAttempts++;
      }

      if (this.shouldReview(lastReviewDate, box)) {
        stats.dueToday++;
      }
    });

    stats.averageAccuracy = questionsWithAttempts > 0 
      ? (totalAccuracy / questionsWithAttempts).toFixed(1) 
      : 0;

    return stats;
  }

  // Generate study recommendations
  getStudyRecommendations(userProgress, dailyGoal = 20) {
    const stats = this.getStudyStats(userProgress);
    const recommendations = [];

    if (stats.dueToday >= dailyGoal) {
      recommendations.push({
        type: 'review',
        priority: 'high',
        message: `${stats.dueToday} Fragen sind heute zur Wiederholung fällig`,
        count: stats.dueToday
      });
    }

    if (stats.difficultQuestions > stats.learnedQuestions) {
      recommendations.push({
        type: 'focus',
        priority: 'medium',
        message: `Fokus auf ${stats.difficultQuestions} schwierige Fragen legen`,
        count: stats.difficultQuestions
      });
    }

    if (stats.totalQuestions < 100) {
      recommendations.push({
        type: 'explore',
        priority: 'low',
        message: 'Neue Themenbereiche erkunden',
        count: 100 - stats.totalQuestions
      });
    }

    return recommendations;
  }

  // Export data for backup
  exportData(userProgress) {
    return {
      version: '1.0',
      exportDate: new Date(),
      progress: userProgress,
      stats: this.getStudyStats(userProgress)
    };
  }

  // Import data from backup
  importData(exportedData) {
    if (exportedData.version !== '1.0') {
      throw new Error('Unsupported data version');
    }
    return exportedData.progress;
  }
}

export default SpacedRepetitionSystem;