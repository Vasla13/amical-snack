import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase.js";
import { ADMIN_EMAIL } from "../config/constants.js";

const AuthContext = createContext();

// Hook personnalisé pour accéder au contexte facilement
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Objet User Firebase (auth)
  const [userData, setUserData] = useState(null); // Données Firestore (points, role...)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Sécurité : on refuse les utilisateurs sans email ou anonymes pour cette app
      if (currentUser && (!currentUser.email || currentUser.isAnonymous)) {
        await auth.signOut();
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);

        try {
          // 1. Création automatique du profil s'il n'existe pas
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const isAdmin = currentUser.email === ADMIN_EMAIL;
            await setDoc(userRef, {
              email: currentUser.email,
              displayName: currentUser.email.split("@")[0],
              role: isAdmin ? "admin" : "user",
              points: isAdmin ? 9999 : 0,
              balance_cents: 0,
              created_at: serverTimestamp(),
              setup_complete: false,
            });
          }

          // 2. Écoute temps réel du profil (points, etc.)
          const unsubData = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData({ ...docSnap.data(), uid: currentUser.uid });
            }
            setLoading(false);
          });

          // Cleanup du snapshot quand l'utilisateur change
          return () => unsubData();
        } catch (error) {
          console.error("Erreur AuthContext:", error);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userData,
    loading,
    isAdmin: userData?.role === "admin",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {loading && (
        <div className="h-screen flex items-center justify-center text-gray-400 font-bold bg-gray-50">
          Chargement...
        </div>
      )}
    </AuthContext.Provider>
  );
}
