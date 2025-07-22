// Gamification Service for IHK Taxi App
class GamificationService {
  constructor() {
    this.xpPerCorrectAnswer = 10;
    this.xpPerStreak = 5;
    this.xpBonusMultipliers = {
      firstTry: 1.5,
      speed: 1.2, // Under 10 seconds
      difficult: 2.0, // From spaced repetition box 1-2
      perfect: 3.0 // 100% accuracy in session
    };

    this.levels = this.generateLevels();
    this.achievements = this.defineAchievements();
    this.badges = this.defineBadges();
  }

  // Generate progressive level system
  generateLevels() {
    const levels = {};
    for (let i = 1; i <= 100; i++) {
      levels[i] = {
        xpRequired: Math.floor(100 * Math.pow(i, 1.5)),
        title: this.getLevelTitle(i),
        rewards: this.getLevelRewards(i)
      };
    }
    return levels;
  }

  getLevelTitle(level) {
    if (level >= 80) return 'Taxi-Meister';
    if (level >= 60) return 'Experte';
    if (level >= 40) return 'Profi';
    if (level >= 20) return 'Fortgeschrittener';
    if (level >= 10) return 'Lernender';
    return 'Anfänger';
  }

  getLevelRewards(level) {
    const rewards = [];
    if (level % 10 === 0) rewards.push('Spezial-Badge');
    if (level % 5 === 0) rewards.push('XP-Bonus');
    if ([25, 50, 75].includes(level)) rewards.push('Neuer Lernmodus');
    return rewards;
  }

  // Define achievements system
  defineAchievements() {
    return [
      {
        id: 'first_question',
        name: 'Erste Schritte',
        description: 'Erste Frage beantwortet',
        icon: '🎯',
        xpReward: 50,
        condition: (stats) => stats.totalQuestionsAnswered >= 1
      },
      {
        id: 'first_correct',
        name: 'Richtig geraten',
        description: 'Erste richtige Antwort',
        icon: '✅',
        xpReward: 100,
        condition: (stats) => stats.correctAnswers >= 1
      },
      {
        id: 'speed_demon',
        name: 'Blitzschnell',
        description: '10 Fragen in unter 5 Sekunden beantwortet',
        icon: '⚡',
        xpReward: 200,
        condition: (stats) => stats.fastAnswers >= 10
      },
      {
        id: 'streak_5',
        name: 'Heißer Lauf',
        description: '5 richtige Antworten in Folge',
        icon: '🔥',
        xpReward: 150,
        condition: (stats) => stats.longestStreak >= 5
      },
      {
        id: 'streak_20',
        name: 'Unaufhaltbar',
        description: '20 richtige Antworten in Folge',
        icon: '🚀',
        xpReward: 500,
        condition: (stats) => stats.longestStreak >= 20
      },
      {
        id: 'daily_goal',
        name: 'Tägliches Ziel',
        description: 'Tägliches Lernziel erreicht',
        icon: '🎪',
        xpReward: 100,
        condition: (stats) => stats.dailyGoalAchieved >= 1
      },
      {
        id: 'week_warrior',
        name: 'Wochen-Krieger',
        description: '7 Tage in Folge gelernt',
        icon: '💪',
        xpReward: 300,
        condition: (stats) => stats.studyDaysStreak >= 7
      },
      {
        id: 'perfectionist',
        name: 'Perfektionist',
        description: '100% Genauigkeit in 50 Fragen',
        icon: '🎖️',
        xpReward: 400,
        condition: (stats) => stats.perfectSessions >= 1
      },
      {
        id: 'topic_master_law',
        name: 'Rechts-Experte',
        description: 'Alle Rechtsfragen mit 90%+ Genauigkeit',
        icon: '⚖️',
        xpReward: 250,
        condition: (stats) => (stats.topicStats?.['Recht']?.accuracy || 0) >= 90
      },
      {
        id: 'topic_master_business',
        name: 'Geschäfts-Guru',
        description: 'Alle kaufmännischen Fragen gemeistert',
        icon: '📊',
        xpReward: 250,
        condition: (stats) => (stats.topicStats?.['Kaufmännische & finanzielle Führung']?.accuracy || 0) >= 90
      },
      {
        id: 'century_club',
        name: 'Jahrhundert-Club',
        description: '100 Fragen beantwortet',
        icon: '💯',
        xpReward: 300,
        condition: (stats) => stats.totalQuestionsAnswered >= 100
      },
      {
        id: 'knowledge_seeker',
        name: 'Wissensdurst',
        description: '500 Fragen beantwortet',
        icon: '📚',
        xpReward: 800,
        condition: (stats) => stats.totalQuestionsAnswered >= 500
      }
    ];
  }

  // Define badge system
  defineBadges() {
    return [
      {
        id: 'early_bird',
        name: 'Früher Vogel',
        description: 'Vor 8:00 Uhr gelernt',
        icon: '🌅',
        color: 'yellow'
      },
      {
        id: 'night_owl',
        name: 'Nachteule',
        description: 'Nach 22:00 Uhr gelernt',
        icon: '🦉',
        color: 'purple'
      },
      {
        id: 'weekend_warrior',
        name: 'Wochenend-Kämpfer',
        description: 'Am Wochenende gelernt',
        icon: '🏖️',
        color: 'blue'
      },
      {
        id: 'comeback_king',
        name: 'Comeback-König',
        description: 'Nach 7 Tagen Pause zurückgekehrt',
        icon: '👑',
        color: 'gold'
      },
      {
        id: 'social_learner',
        name: 'Sozialer Lerner',
        description: 'Fortschritt mit Freunden geteilt',
        icon: '👥',
        color: 'green'
      }
    ];
  }

  // Calculate XP for a question attempt
  calculateXP(questionData, userAnswer, timeSpent, difficulty = 'normal') {
    let baseXP = 0;
    let bonuses = [];

    if (userAnswer.isCorrect) {
      baseXP = this.xpPerCorrectAnswer;
      bonuses.push({ type: 'correct', amount: baseXP, description: 'Richtige Antwort' });

      // Speed bonus
      if (timeSpent < 10) {
        const speedBonus = Math.floor(baseXP * (this.xpBonusMultipliers.speed - 1));
        baseXP += speedBonus;
        bonuses.push({ type: 'speed', amount: speedBonus, description: 'Schnelle Antwort' });
      }

      // Difficulty bonus
      if (difficulty === 'difficult') {
        const difficultyBonus = Math.floor(baseXP * (this.xpBonusMultipliers.difficult - 1));
        baseXP += difficultyBonus;
        bonuses.push({ type: 'difficulty', amount: difficultyBonus, description: 'Schwierige Frage' });
      }

      // First try bonus
      if (userAnswer.isFirstTry) {
        const firstTryBonus = Math.floor(baseXP * (this.xpBonusMultipliers.firstTry - 1));
        baseXP += firstTryBonus;
        bonuses.push({ type: 'firstTry', amount: firstTryBonus, description: 'Erster Versuch' });
      }
    } else {
      // Small XP for wrong answers to encourage learning
      baseXP = 2;
      bonuses.push({ type: 'participation', amount: baseXP, description: 'Teilnahme' });
    }

    return { totalXP: baseXP, bonuses };
  }

  // Update streak and calculate streak bonus
  updateStreak(currentStreak, isCorrect) {
    if (!isCorrect) {
      return { newStreak: 0, streakBonus: 0 };
    }

    const newStreak = currentStreak + 1;
    let streakBonus = 0;

    // Streak milestones
    if (newStreak % 10 === 0) {
      streakBonus = newStreak * this.xpPerStreak;
    } else if (newStreak % 5 === 0) {
      streakBonus = (newStreak / 5) * this.xpPerStreak;
    }

    return { newStreak, streakBonus };
  }

  // Calculate current level from XP
  calculateLevel(totalXP) {
    for (let level = 1; level <= 100; level++) {
      if (totalXP < this.levels[level].xpRequired) {
        return {
          currentLevel: level - 1,
          currentLevelXP: level > 1 ? this.levels[level - 1].xpRequired : 0,
          nextLevelXP: this.levels[level].xpRequired,
          progressToNext: totalXP - (level > 1 ? this.levels[level - 1].xpRequired : 0),
          xpNeeded: this.levels[level].xpRequired - totalXP
        };
      }
    }
    return {
      currentLevel: 100,
      currentLevelXP: this.levels[100].xpRequired,
      nextLevelXP: this.levels[100].xpRequired,
      progressToNext: 0,
      xpNeeded: 0
    };
  }

  // Check for new achievements
  checkAchievements(userStats, currentAchievements = []) {
    const newAchievements = [];

    this.achievements.forEach(achievement => {
      const alreadyEarned = currentAchievements.includes(achievement.id);
      if (!alreadyEarned && achievement.condition(userStats)) {
        newAchievements.push(achievement);
      }
    });

    return newAchievements;
  }

  // Check for new badges based on session data
  checkBadges(sessionData, currentBadges = []) {
    const newBadges = [];
    const now = new Date();

    // Early bird badge
    if (now.getHours() < 8 && !currentBadges.find(b => b.id === 'early_bird' && this.isToday(b.earnedDate))) {
      newBadges.push({ ...this.badges.find(b => b.id === 'early_bird'), earnedDate: now });
    }

    // Night owl badge
    if (now.getHours() >= 22 && !currentBadges.find(b => b.id === 'night_owl' && this.isToday(b.earnedDate))) {
      newBadges.push({ ...this.badges.find(b => b.id === 'night_owl'), earnedDate: now });
    }

    // Weekend warrior badge
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (isWeekend && !currentBadges.find(b => b.id === 'weekend_warrior' && this.isToday(b.earnedDate))) {
      newBadges.push({ ...this.badges.find(b => b.id === 'weekend_warrior'), earnedDate: now });
    }

    return newBadges;
  }

  // Generate daily challenges
  generateDailyChallenge(userStats, date = new Date()) {
    const challenges = [
      {
        id: 'answer_streak',
        name: '5 richtige Antworten in Folge',
        description: 'Beantworte 5 Fragen richtig ohne Fehler',
        target: 5,
        reward: { xp: 100, badge: null },
        type: 'streak'
      },
      {
        id: 'topic_focus',
        name: 'Themenspezialist',
        description: '10 Fragen aus einem bestimmten Thema',
        target: 10,
        reward: { xp: 150, badge: null },
        type: 'topic'
      },
      {
        id: 'speed_challenge',
        name: 'Geschwindigkeitstest',
        description: '20 Fragen in unter 3 Minuten',
        target: 20,
        reward: { xp: 200, badge: 'speed_demon' },
        type: 'speed'
      },
      {
        id: 'accuracy_test',
        name: 'Genauigkeitstest',
        description: '15 Fragen mit 90%+ Genauigkeit',
        target: 15,
        reward: { xp: 180, badge: null },
        type: 'accuracy'
      }
    ];

    // Select challenge based on user's weaknesses
    const userLevel = this.calculateLevel(userStats.totalXP || 0).currentLevel;
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const challengeIndex = (dayOfYear + userLevel) % challenges.length;

    const selectedChallenge = challenges[challengeIndex];
    return {
      ...selectedChallenge,
      date: date.toISOString().split('T')[0],
      progress: 0,
      completed: false
    };
  }

  // Helper methods
  isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  }

  // Get user's current rank among all users
  calculateRank(userXP, allUserXPs) {
    const sortedXPs = allUserXPs.sort((a, b) => b - a);
    const rank = sortedXPs.indexOf(userXP) + 1;
    const percentile = ((sortedXPs.length - rank + 1) / sortedXPs.length * 100).toFixed(1);
    
    return {
      rank,
      totalUsers: sortedXPs.length,
      percentile,
      isTopTen: rank <= 10,
      isTopPercent: parseFloat(percentile) >= 90
    };
  }

  // Generate motivational messages
  getMotivationalMessage(userStats, timeOfDay = 'morning') {
    const messages = {
      morning: [
        'Guten Morgen! Zeit, dein Wissen zu erweitern! ☀️',
        'Ein neuer Tag, neue Möglichkeiten zu lernen! 🌅',
        'Früh am Morgen ist das Gedächtnis am schärfsten! 🧠'
      ],
      afternoon: [
        'Perfekte Zeit für eine Lernpause! ☕',
        'Halte den Schwung aufrecht! 💪',
        'Jede Frage bringt dich näher zum Ziel! 🎯'
      ],
      evening: [
        'Der Tag war lang, aber Lernen entspannt! 🌙',
        'Beende den Tag mit Wissenszuwachs! ⭐',
        'Abendliches Lernen festigt das Gedächtnis! 🧘'
      ]
    };

    const streakMessages = [
      `Fantastisch! ${userStats.currentStreak} richtige Antworten in Folge! 🔥`,
      `Du bist auf dem richtigen Weg! Serie: ${userStats.currentStreak} 🚀`,
      `Unglaublich! ${userStats.currentStreak} Treffer am Stück! ⚡`
    ];

    // Show streak message if user has active streak
    if (userStats.currentStreak >= 3) {
      return streakMessages[userStats.currentStreak % streakMessages.length];
    }

    // Show regular motivational message
    const timeMessages = messages[timeOfDay] || messages.morning;
    return timeMessages[Math.floor(Math.random() * timeMessages.length)];
  }

  // Export gamification data
  exportGamificationData(userStats) {
    return {
      version: '1.0',
      exportDate: new Date(),
      level: this.calculateLevel(userStats.totalXP || 0),
      achievements: userStats.achievements || [],
      badges: userStats.badges || [],
      stats: userStats
    };
  }
}

export default GamificationService;