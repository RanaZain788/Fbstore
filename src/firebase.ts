import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyB2hlLW9ieElLtbyksy52Nlw2ook1Heeno",
  authDomain: "fbstore-bf1e3.firebaseapp.com",
  projectId: "fbstore-bf1e3",
  storageBucket: "fbstore-bf1e3.firebasestorage.app",
  messagingSenderId: "994980888815",
  appId: "1:994980888815:web:e416f85886797a73a9db1a",
  measurementId: "G-1WX19HMLDX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
