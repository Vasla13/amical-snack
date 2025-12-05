import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Configuration utilisant les variables d'environnement (.env)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialisation de l'application Firebase (Singleton)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- SÉCURITÉ : INITIALISATION APP CHECK ---
if (typeof window !== "undefined") {
  // Pour tester en local, vous pouvez décommenter la ligne suivante.
  // Cela affichera un "Debug Token" dans la console du navigateur que vous pourrez ajouter dans la console Firebase.

  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY
      ),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("App Check (reCAPTCHA v3) initialisé.");
  } catch (e) {
    console.error("Erreur lors de l'initialisation d'App Check:", e);
  }
}

// --- GESTION NOTIFICATIONS (CORRECTION CRASH IOS) ---
// Certaines webviews (ex: Google App sur iOS) bloquent les Service Workers.
// On tente l'initialisation dans un bloc try/catch pour éviter de faire planter toute l'app.
let msgInstance = null;
try {
  if (typeof window !== "undefined") {
    msgInstance = getMessaging(app);
  }
} catch (e) {
  console.warn(
    "Notifications non supportées sur ce navigateur (Google App/Webview) :",
    e
  );
  // On laisse msgInstance à null, l'app continuera de fonctionner sans notifications.
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
      // ON UTILISE LA VARIABLE D'ENVIRONNEMENT ICI
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      console.log("Token FCM:", token);
      return token;
    }
  } catch (error) {
    console.error("Erreur permission notif:", error);
  }
  return null;
};
