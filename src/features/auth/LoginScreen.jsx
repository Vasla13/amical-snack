import React from "react";
import {
  Mail,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../ui/Button.jsx";
import { useLogin } from "./hooks/useLogin.js"; // Import du hook

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

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        {/* ... (Décoration identique au code original) ... */}
        <div className="w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center relative z-10 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600 animate-bounce">
            <Mail size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            Vérifie tes mails !
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Un lien magique a été envoyé à{" "}
            <strong className="text-slate-800">{email}</strong>.
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans relative overflow-hidden">
      {/* ... (Décoration background inchangée) ... */}

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          {/* ... (Logo et Titre inchangés) ... */}
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            AMICALE <span className="text-teal-600">R&T</span>
          </h1>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="flex p-2 bg-slate-50/80 gap-1 border-b border-slate-100">
            {/* Boutons Onglets */}
            {["magic", "password"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all relative ${
                  mode === m
                    ? "text-teal-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-2xl"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {m === "magic" ? (
                    <Sparkles size={16} />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  {m === "magic" ? "Lien Magique" : "Mot de passe"}
                </span>
              </button>
            ))}
          </div>

          <div className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-3">
                  Email Universitaire
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    required
                    placeholder="prenom.nom@uha.fr"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

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
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
