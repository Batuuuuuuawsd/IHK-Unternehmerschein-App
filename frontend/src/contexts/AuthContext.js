import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Initialize user profile in Firestore
  const createUserProfile = async (user, additionalData = {}) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    
    if (!snapshot.exists()) {
      const { displayName, email, photoURL } = user;
      const createdAt = new Date();
      
      const profileData = {
        displayName: displayName || additionalData.displayName || 'Unbekannter Nutzer',
        email,
        photoURL: photoURL || null,
        createdAt,
        lastLogin: createdAt,
        preferences: {
          language: 'de',
          darkMode: false,
          notifications: true,
          soundEnabled: true
        },
        progress: {
          totalQuestionsAnswered: 0,
          correctAnswers: 0,
          currentLevel: 1,
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null
        },
        achievements: [],
        favoriteQuestions: [],
        difficultQuestions: [],
        studyStats: {
          dailyGoal: 20,
          weeklyGoal: 140,
          studyTime: 0
        },
        ...additionalData
      };

      try {
        await setDoc(userRef, profileData);
        setUserProfile(profileData);
      } catch (error) {
        console.error('Error creating user profile:', error);
        toast.error('Fehler beim Erstellen des Nutzerprofils');
      }
    } else {
      // Update last login
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      setUserProfile(snapshot.data());
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    try {
      setLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      await createUserProfile(user, { displayName });
      toast.success('Konto erfolgreich erstellt!');
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      let message = 'Fehler beim Erstellen des Kontos';
      
      if (error.code === 'auth/email-already-in-use') {
        message = 'Diese E-Mail-Adresse wird bereits verwendet';
      } else if (error.code === 'auth/weak-password') {
        message = 'Das Passwort ist zu schwach';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Ungültige E-Mail-Adresse';
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await createUserProfile(user);
      toast.success('Erfolgreich angemeldet!');
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      let message = 'Fehler beim Anmelden';
      
      if (error.code === 'auth/user-not-found') {
        message = 'Kein Benutzer mit dieser E-Mail gefunden';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Falsches Passwort';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Ungültige E-Mail-Adresse';
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      await createUserProfile(user);
      toast.success('Erfolgreich mit Google angemeldet!');
      return user;
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Fehler bei der Google-Anmeldung');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      toast.success('Erfolgreich abgemeldet');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Fehler beim Abmelden');
    }
  };

  // Continue as guest
  const continueAsGuest = () => {
    const guestUser = {
      uid: 'guest',
      isGuest: true,
      displayName: 'Gast',
      email: null
    };
    setUser(guestUser);
    
    // Create guest profile in localStorage
    const guestProfile = {
      displayName: 'Gast',
      isGuest: true,
      preferences: {
        language: 'de',
        darkMode: false,
        notifications: false,
        soundEnabled: true
      },
      progress: {
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        currentLevel: 1,
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null
      },
      achievements: [],
      favoriteQuestions: [],
      difficultQuestions: [],
      studyStats: {
        dailyGoal: 20,
        weeklyGoal: 140,
        studyTime: 0
      }
    };
    
    localStorage.setItem('guestProfile', JSON.stringify(guestProfile));
    setUserProfile(guestProfile);
    toast.success('Als Gast fortfahren');
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    if (!user) return;
    
    try {
      if (user.isGuest) {
        // Update guest profile in localStorage
        const currentProfile = JSON.parse(localStorage.getItem('guestProfile') || '{}');
        const updatedProfile = { ...currentProfile, ...updates };
        localStorage.setItem('guestProfile', JSON.stringify(updatedProfile));
        setUserProfile(updatedProfile);
      } else {
        // Update authenticated user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updates, { merge: true });
        setUserProfile(prev => ({ ...prev, ...updates }));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Fehler beim Aktualisieren des Profils');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await createUserProfile(user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Check for guest profile
    const guestProfile = localStorage.getItem('guestProfile');
    if (guestProfile && !user) {
      setUserProfile(JSON.parse(guestProfile));
    }

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: signOutUser,
    continueAsGuest,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};