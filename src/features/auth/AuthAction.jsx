import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../../config/firebase";
import Button from "../../ui/Button";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Si le lien est pour le mot de passe, on vérifie sa validité
    if (mode === "resetPassword" && oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => setEmail(email))
        .catch((e) => setError("Ce lien est invalide ou a expiré."));
    }
  }, [mode, oobCode]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError("6 caractères minimum.");
    setLoading(true);
    setError("");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error(err);
      setError("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Si ce n'est pas un reset de mot de passe (ex: lien magique de connexion),
  // on laisse App.jsx gérer via son useEffect (spinner)
  if (mode !== "resetPassword") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
          Mot de passe modifié !
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Redirection vers la connexion...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Nouveau mot de passe
          </h1>
          {email && (
            <p className="text-sm text-slate-400 mt-2">Compte : {email}</p>
          )}
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            required
            placeholder="Entre ton nouveau mot de passe"
            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-teal-500 transition-all dark:text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-900 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <Button
            disabled={loading}
            className="w-full py-4 shadow-lg shadow-teal-500/20"
          >
            {loading ? "Enregistrement..." : "CONFIRMER LE CHANGEMENT"}
          </Button>
        </form>
      </div>
    </div>
  );
}
