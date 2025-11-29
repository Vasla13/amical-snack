import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../config/firebase.js";
import { UHA_KV_RQ, ADMIN_EMAIL } from "../../config/constants.js";
import Button from "../../ui/Button.jsx";
import { ArrowRight, Mail, KeyRound, CheckCircle2 } from "lucide-react";

export default function LoginScreen() {
  // modes: 'welcome', 'login', 'register_email_sent', 'forgot'
  const [view, setView] = useState("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const clean = () => {
    setError("");
    setMsg("");
    setLoading(false);
  };

  // ÉTAPE 1 : ENVOI DU LIEN DE VÉRIF
  const handleSendLink = async () => {
    clean();
    const e = email.trim();

    // Vérification email UHA ou Admin
    if (!UHA_KV_RQ.test(e) && e !== ADMIN_EMAIL) {
      return setError("Merci d'utiliser ton adresse universitaire @uha.fr");
    }

    try {
      setLoading(true);
      const actionCodeSettings = {
        url: window.location.href, // Redirection ici après clic
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, e, actionCodeSettings);

      window.localStorage.setItem("emailForSignIn", e);
      setView("register_email_sent");
    } catch (err) {
      console.error(err);
      setError("Erreur d'envoi. Vérifie ton adresse.");
    } finally {
      setLoading(false);
    }
  };

  // ÉTAPE CLASSIQUE : CONNEXION MDP
  const handleLogin = async () => {
    clean();
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) return setError("Entre ton email d'abord.");
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("Lien de réinitialisation envoyé !");
    } catch {
      setError("Erreur d'envoi.");
    }
  };

  // --- VUES ---

  if (view === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-sans">
        <div className="w-24 h-24 bg-teal-700 rounded-full flex items-center justify-center text-white font-black text-3xl mb-6 shadow-xl">
          RT
        </div>
        <h1 className="text-3xl font-black text-teal-800 mb-2 text-center">
          AMICALE R&T
        </h1>
        <p className="text-gray-500 mb-8 text-center max-w-xs">
          Commandes & Points Fidélité
        </p>

        <div className="w-full max-w-sm space-y-4">
          <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 text-center">
            <h2 className="font-black text-teal-900 text-lg mb-2">Bienvenue</h2>
            <p className="text-sm text-teal-700 mb-4">
              Entre ton email UHA pour te connecter ou t'inscrire.
            </p>

            <div className="space-y-3">
              <input
                className="w-full p-4 rounded-xl border border-teal-200 outline-none focus:ring-2 focus:ring-teal-500 text-center font-bold"
                placeholder="prenom.nom@uha.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                onClick={handleSendLink}
                disabled={loading}
                className="w-full shadow-lg shadow-teal-200"
              >
                {loading ? "Envoi..." : "RECEVOIR MON LIEN MAGIQUE"}{" "}
                <Mail size={18} />
              </Button>
            </div>
            {error && (
              <p className="text-red-600 text-xs font-bold mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
                {error}
              </p>
            )}
          </div>

          <div className="text-center pt-4">
            <p className="text-gray-400 text-xs font-bold uppercase mb-2">
              J'ai déjà un mot de passe
            </p>
            <button
              onClick={() => setView("login")}
              className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-xl font-black text-sm w-full hover:bg-gray-50"
            >
              CONNEXION CLASSIQUE
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "register_email_sent") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-teal-700 text-white text-center">
        <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-sm">
          <Mail size={48} className="text-white" />
        </div>
        <h2 className="text-2xl font-black mb-4">Vérifie ta boîte mail !</h2>
        <p className="text-teal-100 mb-8 max-w-xs mx-auto leading-relaxed">
          Un lien de connexion a été envoyé à <strong>{email}</strong>.<br />
          <br />
          Clique dessus pour accéder directement à l'application.
        </p>
        <button
          onClick={() => setView("welcome")}
          className="text-sm font-bold text-teal-200 underline opacity-80 hover:opacity-100"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <KeyRound className="text-teal-600" /> Connexion
        </h2>

        <div className="w-full max-w-sm space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}
          {msg && (
            <div className="p-3 bg-green-50 text-green-600 text-sm font-bold rounded-xl border border-green-100 text-center">
              {msg}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase">
              Email
            </label>
            <input
              className="w-full p-4 bg-gray-50 rounded-xl border outline-none focus:border-teal-500 font-bold"
              placeholder="@uha.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase">
              Mot de passe
            </label>
            <input
              type="password"
              className="w-full p-4 bg-gray-50 rounded-xl border outline-none focus:border-teal-500 font-bold"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full text-lg"
          >
            {loading ? "..." : "ENTRER"}
          </Button>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setView("welcome")}
              className="text-gray-400 text-xs font-bold"
            >
              Retour
            </button>
            <button
              onClick={handleForgot}
              className="text-teal-600 text-xs font-bold"
            >
              Mot de passe oublié ?
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
