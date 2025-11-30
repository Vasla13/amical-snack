import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging"; // AJOUT

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
export const messaging = getMessaging(app); // AJOUT

// AJOUT : Fonction pour demander la permission
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Remplacez par votre clé VAPID générée dans la console Firebase (Paramètres du projet > Cloud Messaging)
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
