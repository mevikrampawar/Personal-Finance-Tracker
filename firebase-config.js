import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';

/**
 * Firebase Configuration
 * 
 * SECURITY NOTE: In production, use environment variables instead of hardcoding credentials.
 * For development, ensure this file is never committed to version control with real keys.
 * 
 * Example for production (using build-time variables):
 * const firebaseConfig = {
 *   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
 *   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 *   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
 *   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
 *   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 *   appId: import.meta.env.VITE_FIREBASE_APP_ID,
 *   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
 * };
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "personal-finance-tracker-babac.firebaseapp.com",
  projectId: "personal-finance-tracker-babac",
  storageBucket: "personal-finance-tracker-babac.firebasestorage.app",
  messagingSenderId: "1018198853683",
  appId: "1:1018198853683:web:9e1bbcd3418c79b219fb46",
  measurementId: "G-2X15Q8EWG9"
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
  console.warn('⚠️ Firebase API key not configured. Please update firebase-config.js with your credentials.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, provider, db, analytics };
