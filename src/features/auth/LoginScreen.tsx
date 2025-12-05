import React from "react";
import {
  Mail,
  KeyRound,
  ArrowRight,
  Link as LinkIcon,
  CheckCircle2,
  ExternalLink, // Ajout de l'icône
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../ui/Button.jsx";
import { useLogin } from "./hooks/useLogin.js";

export default function LoginScreen() {
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    successMsg,
    emailSent,
    setEmailSent,
    handleSendLink,
    handleLogin,
    handleForgot,
  } = useLogin();

  const handleSubmit = (e) => {
    if (mode === "magic") handleSendLink(e);
    else handleLogin(e);
  };

  // Écran de succès (Email envoyé)
  if (emailSent) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center relative z-10 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <Mail size={36} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Lien envoyé</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Un lien de connexion a été envoyé à <br />
            <strong className="text-slate-900">{email}</strong>.
            <br />
            Touchez ce lien pour entrer.
          </p>

          {/* Bouton de redirection Zimbra */}
          <a
            href="https://e-partage.uha.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl bg-teal-600 text-white font-bold text-sm mb-3 flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-teal-500/20"
          >
            Ouvrir E-partage (Zimbra) <ExternalLink size={18} />
          </a>

          <button
            onClick={() => setEmailSent(false)}
            className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm active:scale-95 transition-transform"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    // 'min-h-dvh' pour gérer la barre d'adresse mobile correctement
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden select-none">
      {/* Background allégé pour mobile (évite lag scroll) */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Header Compact */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-3 drop-shadow-lg">
            <img
              src="/logo.png"
              alt="Logo Amicale"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            AMICALE R&T
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Espace Membre
          </p>
        </div>

        {/* Carte Principale */}
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden">
          {/* Onglets Tactiles */}
          <div className="flex bg-slate-100/50 dark:bg-slate-800/30 p-1.5 gap-1 border-b border-slate-200/50 dark:border-slate-800">
            {["magic", "password"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all relative z-0 ${
                  mode === m
                    ? "text-teal-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-white dark:bg-slate-800/80 rounded-lg shadow-sm border border-slate-200/80 dark:border-slate-700 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="flex items-center justify-center gap-2">
                  {m === "magic" ? (
                    <LinkIcon size={14} />
                  ) : (
                    <KeyRound size={14} />
                  )}
                  {m === "magic" ? "Sans mot de passe" : "Mot de passe"}
                </span>
              </button>
            ))}
          </div>

          <div className="p-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Messages Erreur/Succès */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 text-center"
                  >
                    {error}
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Champ Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-3">
                  Email Universitaire
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors">
                    <Mail size={20} />
                  </div>
                  {/* text-base important pour éviter le zoom iOS */}
                  <input
                    type="email"
                    inputMode="email"
                    required
                    placeholder="prenom.nom@uha.fr"
                    className="w-full pl-12 pr-4 py-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-base font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all placeholder:text-slate-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <AnimatePresence>
                {mode === "password" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-3">
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
                        className="w-full pl-12 pr-4 py-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-base font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all placeholder:text-slate-400"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end pt-1 pr-1">
                      <button
                        type="button"
                        onClick={handleForgot}
                        className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors p-1"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bouton Principal (Gros pour le pouce) */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-sm mt-2 shadow-xl shadow-teal-500/20 active:scale-[0.98]"
              >
                {loading ? (
                  "Connexion..."
                ) : mode === "magic" ? (
                  <>
                    Recevoir mon lien <ArrowRight size={18} />
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2">
                {mode === "magic"
                  ? "Nous vous enverrons un email pour vous connecter instantanément."
                  : "Connexion classique avec votre mot de passe."}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
