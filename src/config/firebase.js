import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";

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
