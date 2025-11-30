import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- CORRECTION CRASH IOS (Google App) ---
// Certaines webviews (comme Google App sur iPhone) bloquent les Service Workers.
// Si getMessaging() plante, on capture l'erreur pour ne pas faire crasher toute l'app.
let msgInstance = null;
try {
  // On vérifie si window est défini (évite crash build) et on tente l'init
  if (typeof window !== "undefined") {
    msgInstance = getMessaging(app);
  }
} catch (e) {
  console.warn(
    "Notifications non supportées sur ce navigateur (Google App/Webview) :",
    e
  );
  // On laisse msgInstance à null, l'app continuera de fonctionner sans notifs.
}
export const messaging = msgInstance;

// Fonction sécurisée pour demander la permission
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.warn("Messaging non disponible.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey:
          "BJE6pMBFWT3VBao38Nrm5uGHirSLHuA36rqk6YzJtD-CetqWRC94YPqbx1hMcWJSZQw7LmjAntCEGBYh3IOHhPQ",
      });
      console.log("Token FCM:", token);
      return token;
    }
  } catch (error) {
    console.error("Erreur permission notif:", error);
  }
  return null;
};
