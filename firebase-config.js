import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';

const firebaseConfig = {
  apiKey: ${{secrets.firebase_api}},
  authDomain: "personal-finance-tracker-babac.firebaseapp.com",
  projectId: "personal-finance-tracker-babac",
  storageBucket: "personal-finance-tracker-babac.firebasestorage.app",
  messagingSenderId: "1018198853683",
  appId: "1:1018198853683:web:9e1bbcd3418c79b219fb46",
  measurementId: "G-2X15Q8EWG9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, provider, db, analytics };
