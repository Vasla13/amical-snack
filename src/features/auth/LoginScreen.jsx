import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../config/firebase.js";
import { UHA_KV_RQ, ADMIN_EMAIL } from "../../config/constants.js";
import Button from "../../ui/Button.jsx";
import {
  Mail,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginScreen() {
  const [mode, setMode] = useState("magic"); // 'magic' | 'password'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const clean = () => {
    setError("");
    setSuccessMsg("");
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleSendLink = async () => {
    clean();
    const e = email.trim();
    if (!UHA_KV_RQ.test(e) && e !== ADMIN_EMAIL) {
      return setError("Utilise ton adresse universitaire (@uha.fr)");
    }
    try {
      setLoading(true);
      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, e, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", e);
      setEmailSent(true);
    } catch (err) {
      console.error(err);
      setError("Impossible d'envoyer le lien. Vérifie ton email.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    clean();
    if (!email || !password) return setError("Remplis tous les champs.");
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) return setError("Entre ton email pour réinitialiser.");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Lien de réinitialisation envoyé !");
    } catch {
      setError("Erreur d'envoi (email invalide ?).");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "magic") handleSendLink();
    else handleLogin();
  };

  // --- VUE : EMAIL ENVOYÉ ---
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center relative z-10 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600 animate-bounce">
            <Mail size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            Vérifie tes mails !
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Un lien magique a été envoyé à <br />
            <strong className="text-slate-800">{email}</strong>.
            <br />
            Clique dessus pour te connecter instantanément.
          </p>
          <button
            onClick={() => setEmailSent(false)}
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // --- VUE : LOGIN FORM ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-400/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* LOGO HEADER */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-32 h-32 mb-4 group">
            <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full group-hover:bg-teal-500/30 transition-all duration-500" />
            <img
              src="/logo.png"
              alt="Logo Amicale"
              className="w-full h-full object-contain relative z-10 drop-shadow-lg transform transition-transform group-hover:scale-105 duration-300"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            AMICALE <span className="text-teal-600">R&T</span>
          </h1>
          <p className="text-slate-400 font-medium text-sm tracking-widest uppercase mt-1">
            Colmar
          </p>
        </div>

        {/* CARD CONTAINER */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          {/* TABS HEADER */}
          <div className="flex p-2 bg-slate-50/80 gap-1 border-b border-slate-100">
            <button
              onClick={() => {
                setMode("magic");
                clean();
              }}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all relative ${
                mode === "magic"
                  ? "text-teal-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode === "magic" && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles size={16} /> Lien Magique
              </span>
            </button>
            <button
              onClick={() => {
                setMode("password");
                clean();
              }}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all relative ${
                mode === "password"
                  ? "text-teal-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode === "password" && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <KeyRound size={16} /> Mot de passe
              </span>
            </button>
          </div>

          {/* FORM BODY */}
          <div className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Messages Feedback */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 text-center"
                  >
                    {error}
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 text-center flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} /> {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Email (Toujours visible) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-3">
                  Email Universitaire
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="prenom.nom@uha.fr"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Input Password (Seulement en mode password) */}
              <AnimatePresence>
                {mode === "password" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-3">
                      Mot de passe
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors">
                        <KeyRound size={20} />
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-300"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleForgot}
                        className="text-[10px] font-bold text-slate-400 hover:text-teal-600 transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button
                disabled={loading}
                className="w-full py-4 text-sm mt-4 shadow-lg shadow-teal-500/20"
              >
                {loading ? (
                  "Chargement..."
                ) : mode === "magic" ? (
                  <>
                    RECEVOIR MON LIEN <ArrowRight size={18} />
                  </>
                ) : (
                  "SE CONNECTER"
                )}
              </Button>

              {/* Footer info text */}
              <p className="text-center text-[10px] text-slate-400 font-medium leading-relaxed pt-2">
                {mode === "magic"
                  ? "Idéal pour une première connexion ou si tu as oublié ton mot de passe."
                  : "Utilise ton mot de passe défini lors de la configuration de ton compte."}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
