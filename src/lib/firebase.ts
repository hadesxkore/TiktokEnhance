// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyANe3HEu4NvMCSXmTk9hhaphkc-7ODQ_uY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tiktokvideo-aafef.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tiktokvideo-aafef',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tiktokvideo-aafef.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '898590846129',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:898590846129:web:c10418f4460643ac7b8690',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
