// Firebase configuration and initialization
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyC2SznPpGubDix4o1ZGb1WH2Ex1nhva_Mg",
  authDomain: "taxi-learn-app.firebaseapp.com",
  projectId: "taxi-learn-app",
  storageBucket: "taxi-learn-app.firebasestorage.app",
  messagingSenderId: "914344049413",
  appId: "1:914344049413:web:2b11042be9ef25ae4c156c"
};

// Initialize Firebase app
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize messaging for push notifications
let messaging = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}
export { messaging };

// Firestore offline support
export const enableOffline = () => disableNetwork(db);
export const enableOnline = () => enableNetwork(db);

export default app;