import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyAsGOggoYSR51WNcz7_DyTVDH6n-RkSZKA",
  authDomain: "amical-rt.firebaseapp.com",
  projectId: "amical-rt",
  storageBucket: "amical-rt.firebasestorage.app",
  messagingSenderId: "556333156656",
  appId: "1:556333156656:web:ba398c100f65ba34b760f5",
  measurementId: "G-YGEYFCRHPY",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
