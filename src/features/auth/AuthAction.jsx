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
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Si ce n'est pas un reset de mot de passe, on ignore (ex: lien magique géré par App.jsx)
    if (mode !== "resetPassword") {
      setVerifying(false);
      return;
    }

    if (!oobCode) {
      setError("Lien invalide (code manquant).");
      setVerifying(false);
      return;
    }

    // On vérifie que le code est valide avant d'afficher le formulaire
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setVerifying(false);
      })
      .catch((e) => {
        console.error(e);
        setError("Ce lien a expiré ou a déjà été utilisé.");
        setVerifying(false);
      });
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

  // 1. Affichage pendant la vérification du lien
  if (mode === "resetPassword" && verifying) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"></div>
          <p className="text-slate-500 font-bold text-sm">
            Vérification du lien...
          </p>
        </div>
      </div>
    );
  }

  // 2. Si ce n'est pas un reset password (ex: lien magique), on laisse App.jsx gérer ou on affiche rien
  if (mode !== "resetPassword") {
    // Note: App.jsx s'occupe du mode 'signIn' (lien magique).
    // Ici on retourne null pour éviter un écran blanc ou un conflit visuel si App.jsx ne prend pas le relais assez vite.
    // Cependant, dans votre router actuel, '/auth/action' pointe vers ce composant.
    // Pour un lien magique, le code de App.jsx devrait intercepter l'URL avant ou rediriger.
    // Si ce composant est monté pour un 'signIn', on affiche un chargement générique.
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 3. Écran de succès
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

  // 4. Formulaire principal (ou erreur si lien invalide)
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

        {error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-center font-bold mb-4 border border-rose-100 dark:border-rose-900">
            {error}
            <div className="mt-4">
              <Button
                onClick={() => navigate("/login")}
                className="w-full text-xs"
              >
                Retour au login
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Entre ton nouveau mot de passe"
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-teal-500 transition-all dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              disabled={loading}
              className="w-full py-4 shadow-lg shadow-teal-500/20"
            >
              {loading ? "Enregistrement..." : "CONFIRMER LE CHANGEMENT"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
