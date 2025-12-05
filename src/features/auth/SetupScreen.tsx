import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword, linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import Button from "../../ui/Button";

export default function SetupScreen() {
  const { auth, db, user } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreatePassword = async () => {
    if (newPassword.length < 6) {
      return notify("Le mot de passe doit faire au moins 6 caractères.", "error");
    }
    setLoading(true);
    try {
      if (!user) throw new Error("Session utilisateur perdue.");

      const credential = EmailAuthProvider.credential(user.email!, newPassword);
      
      try {
        await linkWithCredential(user, credential);
      } catch (err: any) {
        if (err.code === "auth/provider-already-linked") {
          // If the email provider is already linked, it means we just need to update the password.
          await updatePassword(user, newPassword);
        } else if (err.code === "auth/requires-recent-login") {
          await auth.signOut();
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        } else {
          throw err;
        }
      }

      await updateDoc(doc(db, "users", user.uid), {
        setup_complete: true,
      });

      notify("Compte configuré avec succès ! Bienvenue.", "success");
      navigate("/");

    } catch (e: any) {
      console.error("Password creation error:", e);
      notify(e.message || "Une erreur est survenue.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 text-center font-sans max-w-md mx-auto">
      <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">🔐</span>
      </div>
      <h1 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
        Dernière étape !
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
        Choisissez un mot de passe pour sécuriser votre compte.
      </p>
      <div className="w-full space-y-4">
        <input
          type="password"
          className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 font-bold outline-none focus:border-teal-500 transition-all dark:text-white"
          placeholder="Nouveau mot de passe"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button
          onClick={handleCreatePassword}
          disabled={loading}
          className="w-full py-4 text-base"
        >
          {loading ? "Enregistrement..." : "TERMINER L'INSCRIPTION"}
        </Button>
      </div>
    </div>
  );
}
