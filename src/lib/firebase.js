import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyCS8otGc8nh1YJMU_UnvgJwLdD_uF50gww',
  authDomain: 'personal-finance-tracker-babac.firebaseapp.com',
  projectId: 'personal-finance-tracker-babac',
  storageBucket: 'personal-finance-tracker-babac.firebasestorage.app',
  messagingSenderId: '1018198853683',
  appId: '1:1018198853683:web:9e1bbcd3418c79b219fb46',
  measurementId: 'G-2X15Q8EWG9',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)

try {
  getAnalytics(app)
} catch {
  // Analytics not available in all environments
}
