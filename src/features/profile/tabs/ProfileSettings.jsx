import React, { useState } from "react";
import { updatePassword } from "firebase/auth";
import { LogOut, KeyRound, ShieldCheck, BellRing } from "lucide-react";
import Button from "../../../ui/Button";
import NotificationButton from "../NotificationButton";

export default function ProfileSettings({ auth, logout }) {
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdError, setPwdError] = useState(null);

  const changePasswordAction = async () => {
    setPwdMsg(null);
    setPwdError(null);
    if (newPwd.length < 6) return setPwdError("6 caractères minimum.");

    try {
      if (!auth.currentUser) return;
      await updatePassword(auth.currentUser, newPwd);
      setPwdMsg("Mot de passe mis à jour !");
      setNewPwd("");
    } catch (e) {
      console.error(e);
      if (e.code === "auth/requires-recent-login") {
        setPwdError(
          "Sécurité : Pour changer le mot de passe, déconnecte-toi et reconnecte-toi."
        );
      } else {
        setPwdError("Erreur : " + e.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* Sécurité */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-black text-slate-800 dark:text-white text-sm">
            Sécurité
          </h3>
        </div>

        <div className="space-y-3">
          <div className="relative group">
            <KeyRound
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors"
              size={18}
            />
            {/* Ajout d'une bordure (border-slate-200) pour mieux voir le champ */}
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 dark:text-white"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
          </div>

          {/* CORRECTION ICI : Style explicite pour rendre le bouton visible sans survol */}
          <Button
            onClick={changePasswordAction}
            className="w-full py-3.5 text-xs font-black shadow-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            METTRE À JOUR
          </Button>

          {pwdMsg && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold text-center border border-emerald-100">
              {pwdMsg}
            </div>
          )}
          {pwdError && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold text-center border border-rose-100">
              {pwdError}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
            <BellRing size={20} />
          </div>
          <h3 className="font-black text-slate-800 dark:text-white text-sm">
            Notifications
          </h3>
        </div>
        <NotificationButton />
      </div>

      <button
        onClick={logout}
        className="w-full py-4 text-rose-500 font-bold bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm group"
      >
        <LogOut
          size={18}
          className="group-hover:scale-110 transition-transform"
        />
        Se déconnecter
      </button>
    </div>
  );
}
