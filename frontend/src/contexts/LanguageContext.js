import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

// Translation dictionary
const translations = {
  de: {
    // Navigation
    'nav.questions': 'Fragen',
    'nav.topics': 'Themen',
    'nav.progress': 'Fortschritt',
    'nav.profile': 'Profil',
    'nav.math': 'Rechnen',
    
    // Auth
    'auth.login': 'Anmelden',
    'auth.signup': 'Registrieren',
    'auth.guest': 'Als Gast fortfahren',
    'auth.logout': 'Abmelden',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.displayName': 'Name',
    'auth.signInWithGoogle': 'Mit Google anmelden',
    
    // Questions
    'questions.single': 'Einzelauswahl',
    'questions.multiple': 'Mehrfachauswahl',
    'questions.open': 'Offene Frage',
    'questions.check': 'Antwort prüfen',
    'questions.next': 'Nächste Frage',
    'questions.correct': 'Richtig!',
    'questions.incorrect': 'Falsch',
    'questions.loading': 'Wird geladen...',
    'questions.noQuestions': 'Keine Fragen verfügbar',
    'questions.favorite': 'Favorit',
    'questions.difficult': 'Schwierig',
    
    // Topics
    'topics.all': 'Alle Themen',
    'topics.random': 'Zufällige Fragen aus allen Bereichen',
    'topics.law': 'Recht',
    'topics.business': 'Kaufmännische & finanzielle Führung',
    'topics.technical': 'Technische Normen & Betrieb',
    'topics.safety': 'Straßenverkehrssicherheit, Unfallverhütung, Umweltschutz',
    'topics.crossBorder': 'Grenzüberschreitender Personenverkehr',
    
    // Progress
    'progress.overall': 'Gesamtstatistik',
    'progress.answered': 'Beantwortet',
    'progress.correct': 'Richtig',
    'progress.accuracy': 'Genauigkeit',
    'progress.topicProgress': 'Themen-Fortschritt',
    'progress.level': 'Level',
    'progress.xp': 'XP',
    'progress.streak': 'Serie',
    'progress.achievements': 'Erfolge',
    
    // Learning Modes
    'modes.random': 'Zufällig',
    'modes.topic': 'Thematisch',
    'modes.exam': 'Prüfungsmodus',
    'modes.spaced': 'Spaced Repetition',
    'modes.favorites': 'Favoriten',
    'modes.difficult': 'Schwierige Fragen',
    
    // Gamification
    'game.dailyChallenge': 'Tägliche Herausforderung',
    'game.weeklyGoal': 'Wochenziel',
    'game.currentStreak': 'Aktuelle Serie',
    'game.longestStreak': 'Längste Serie',
    'game.todayGoal': 'Heutiges Ziel',
    'game.questionsToday': 'Heute beantwortet',
    
    // Settings
    'settings.language': 'Sprache',
    'settings.darkMode': 'Dunkler Modus',
    'settings.notifications': 'Benachrichtigungen',
    'settings.sound': 'Ton',
    'settings.dailyGoal': 'Tägliches Ziel',
    'settings.weeklyGoal': 'Wochenziel',
    
    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.loading': 'Wird geladen...',
    'common.error': 'Fehler',
    'common.success': 'Erfolgreich',
    'common.questions': 'Fragen',
    'common.question': 'Frage',
    'common.search': 'Suchen...',
  },
  
  en: {
    // Navigation
    'nav.questions': 'Questions',
    'nav.topics': 'Topics',
    'nav.progress': 'Progress',
    'nav.profile': 'Profile',
    'nav.math': 'Math',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.guest': 'Continue as Guest',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.displayName': 'Name',
    'auth.signInWithGoogle': 'Sign in with Google',
    
    // Questions
    'questions.single': 'Single Choice',
    'questions.multiple': 'Multiple Choice',
    'questions.open': 'Open Question',
    'questions.check': 'Check Answer',
    'questions.next': 'Next Question',
    'questions.correct': 'Correct!',
    'questions.incorrect': 'Incorrect',
    'questions.loading': 'Loading...',
    'questions.noQuestions': 'No questions available',
    'questions.favorite': 'Favorite',
    'questions.difficult': 'Difficult',
    
    // Topics
    'topics.all': 'All Topics',
    'topics.random': 'Random questions from all areas',
    'topics.law': 'Law',
    'topics.business': 'Business & Financial Management',
    'topics.technical': 'Technical Standards & Operation',
    'topics.safety': 'Road Safety, Accident Prevention, Environmental Protection',
    'topics.crossBorder': 'Cross-Border Passenger Transport',
    
    // Progress
    'progress.overall': 'Overall Statistics',
    'progress.answered': 'Answered',
    'progress.correct': 'Correct',
    'progress.accuracy': 'Accuracy',
    'progress.topicProgress': 'Topic Progress',
    'progress.level': 'Level',
    'progress.xp': 'XP',
    'progress.streak': 'Streak',
    'progress.achievements': 'Achievements',
    
    // Learning Modes
    'modes.random': 'Random',
    'modes.topic': 'By Topic',
    'modes.exam': 'Exam Mode',
    'modes.spaced': 'Spaced Repetition',
    'modes.favorites': 'Favorites',
    'modes.difficult': 'Difficult Questions',
    
    // Gamification
    'game.dailyChallenge': 'Daily Challenge',
    'game.weeklyGoal': 'Weekly Goal',
    'game.currentStreak': 'Current Streak',
    'game.longestStreak': 'Longest Streak',
    'game.todayGoal': 'Today\'s Goal',
    'game.questionsToday': 'Answered Today',
    
    // Settings
    'settings.language': 'Language',
    'settings.darkMode': 'Dark Mode',
    'settings.notifications': 'Notifications',
    'settings.sound': 'Sound',
    'settings.dailyGoal': 'Daily Goal',
    'settings.weeklyGoal': 'Weekly Goal',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.questions': 'Questions',
    'common.question': 'Question',
    'common.search': 'Search...',
  },
  
  tr: {
    // Navigation
    'nav.questions': 'Sorular',
    'nav.topics': 'Konular',
    'nav.progress': 'İlerleme',
    'nav.profile': 'Profil',
    'nav.math': 'Matematik',
    
    // Auth
    'auth.login': 'Giriş Yap',
    'auth.signup': 'Kayıt Ol',
    'auth.guest': 'Misafir Olarak Devam Et',
    'auth.logout': 'Çıkış Yap',
    'auth.email': 'E-posta',
    'auth.password': 'Şifre',
    'auth.displayName': 'İsim',
    'auth.signInWithGoogle': 'Google ile Giriş Yap',
    
    // Questions
    'questions.single': 'Tek Seçim',
    'questions.multiple': 'Çoklu Seçim',
    'questions.open': 'Açık Soru',
    'questions.check': 'Cevabı Kontrol Et',
    'questions.next': 'Sonraki Soru',
    'questions.correct': 'Doğru!',
    'questions.incorrect': 'Yanlış',
    'questions.loading': 'Yükleniyor...',
    'questions.noQuestions': 'Soru bulunmuyor',
    'questions.favorite': 'Favori',
    'questions.difficult': 'Zor',
    
    // Topics
    'topics.all': 'Tüm Konular',
    'topics.random': 'Tüm alanlardan rastgele sorular',
    'topics.law': 'Hukuk',
    'topics.business': 'Ticari & Mali Yönetim',
    'topics.technical': 'Teknik Normlar & İşletme',
    'topics.safety': 'Karayolu Güvenliği, Kaza Önleme, Çevre Koruma',
    'topics.crossBorder': 'Sınır Ötesi Yolcu Taşımacılığı',
    
    // Progress
    'progress.overall': 'Genel İstatistikler',
    'progress.answered': 'Cevaplanmış',
    'progress.correct': 'Doğru',
    'progress.accuracy': 'Doğruluk',
    'progress.topicProgress': 'Konu İlerlemesi',
    'progress.level': 'Seviye',
    'progress.xp': 'XP',
    'progress.streak': 'Seri',
    'progress.achievements': 'Başarılar',
    
    // Learning Modes
    'modes.random': 'Rastgele',
    'modes.topic': 'Konuya Göre',
    'modes.exam': 'Sınav Modu',
    'modes.spaced': 'Aralıklı Tekrar',
    'modes.favorites': 'Favoriler',
    'modes.difficult': 'Zor Sorular',
    
    // Gamification
    'game.dailyChallenge': 'Günlük Meydan Okuma',
    'game.weeklyGoal': 'Haftalık Hedef',
    'game.currentStreak': 'Mevcut Seri',
    'game.longestStreak': 'En Uzun Seri',
    'game.todayGoal': 'Bugünün Hedefi',
    'game.questionsToday': 'Bugün Cevaplanmış',
    
    // Settings
    'settings.language': 'Dil',
    'settings.darkMode': 'Karanlık Mod',
    'settings.notifications': 'Bildirimler',
    'settings.sound': 'Ses',
    'settings.dailyGoal': 'Günlük Hedef',
    'settings.weeklyGoal': 'Haftalık Hedef',
    
    // Common
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'common.loading': 'Yükleniyor...',
    'common.error': 'Hata',
    'common.success': 'Başarılı',
    'common.questions': 'Sorular',
    'common.question': 'Soru',
    'common.search': 'Ara...',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('de');

  useEffect(() => {
    // Get language from localStorage or browser
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    } else {
      // Detect browser language
      const browserLang = navigator.language.substring(0, 2);
      if (translations[browserLang]) {
        setLanguage(browserLang);
      }
    }
  }, []);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    }
  };

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || key;
    
    // Replace parameters in text
    Object.keys(params).forEach(param => {
      text = text.replace(`{{${param}}}`, params[param]);
    });
    
    return text;
  };

  const value = {
    language,
    changeLanguage,
    t,
    availableLanguages: Object.keys(translations)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};