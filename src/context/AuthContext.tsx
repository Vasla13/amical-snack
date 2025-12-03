import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
// SUPPRIMÉ : import { ADMIN_EMAIL } from "../config/constants";
import { AuthContextType, UserProfile } from "../types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && (!currentUser.email || currentUser.isAnonymous)) {
        await auth.signOut();
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        // --- SÉCURITÉ : CUSTOM CLAIMS ---
        // On récupère le token décodé pour vérifier le claim 'admin'
        const tokenResult = await currentUser.getIdTokenResult();
        const hasAdminClaim = !!tokenResult.claims.admin;

        // Fallback sur l'email supprimé : On se fie uniquement au claim
        setIsAdmin(hasAdminClaim);

        const userRef = doc(db, "users", currentUser.uid);

        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email,
              displayName: currentUser.email?.split("@")[0] || "User",
              role: hasAdminClaim ? "admin" : "user",
              points: hasAdminClaim ? 9999 : 0,
              balance_cents: 0,
              created_at: serverTimestamp(),
              setup_complete: false,
              bad_luck_count: 0,
            });
          }

          const unsubData = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData({
                ...(docSnap.data() as UserProfile),
                uid: currentUser.uid,
              });
            }
            setLoading(false);
          });

          return () => unsubData();
        } catch (error) {
          console.error("Erreur AuthContext:", error);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isAdmin,
    db,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {loading && (
        <div className="h-screen flex items-center justify-center text-gray-400 font-bold bg-gray-50 dark:bg-slate-900">
          Chargement...
        </div>
      )}
    </AuthContext.Provider>
  );
}
