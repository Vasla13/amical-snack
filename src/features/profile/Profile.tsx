import React, { useState } from "react";
// SUPPRIMÉ : import { collection, onSnapshot } from "firebase/firestore";
import {
  User,
  Trophy,
  Medal,
  Settings,
  CreditCard,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileLeaderboard from "./tabs/ProfileLeaderboard";
import ProfileSettings from "./tabs/ProfileSettings";
import ProfileLevels from "./tabs/ProfileLevels";
import ProfileHistory from "./tabs/ProfileHistory.jsx";

export default function Profile({ user, logout, db, uid, auth }) {
  // SUPPRIMÉ : const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("levels");

  // SUPPRIMÉ : useEffect(...) qui chargeait toute la collection "users"

  const fmtPoints = (p) =>
    Number(p || 0)
      .toFixed(2)
      .replace(/[.,]00$/, "");

  // Configuration des onglets
  const tabs = [
    { id: "levels", label: "Niveaux", icon: Medal },
    { id: "history", label: "Historique", icon: History },
    { id: "leaderboard", label: "Classement", icon: Trophy },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="min-h-full pb-24 px-4 pt-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans transition-colors">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md mx-auto space-y-8"
      >
        {/* ... (Le header "Mon Espace" et la carte "Solde" restent identiques) ... */}
        {/* Je raccourcis ici pour la clarté, copiez le code JSX existant pour le header et la carte */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              Mon Espace
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">
              Ravi de te revoir,{" "}
              <span className="text-teal-600 dark:text-teal-400 font-bold">
                {user?.displayName || "l'ami"}
              </span>{" "}
              !
            </p>
          </div>
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
            <User size={24} strokeWidth={2} />
          </div>
        </div>

        {/* ... (Carte Solde identique au fichier original) ... */}
        <div className="group relative w-full aspect-[1.586/1] rounded-[24px] transition-all duration-500 hover:scale-[1.02] shadow-2xl shadow-slate-200/50 dark:shadow-none">
          {/* ... contenu carte ... */}
          <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border border-slate-100 dark:border-slate-700">
            {/* ... (contenu carte inchangé) ... */}
            <div className="relative h-full flex flex-col justify-between p-6 z-10">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
                  Solde actuel
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter text-slate-800 dark:text-white">
                    {fmtPoints(user?.points)}
                  </span>
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                    PTS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex gap-1 relative z-20 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 min-w-fit ${
                activeTab === tab.id
                  ? "bg-slate-900 dark:bg-slate-800 text-white shadow-md transform scale-[1.02]"
                  : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600"
              }`}
            >
              <tab.icon size={16} strokeWidth={2.5} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "levels" && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfileLevels user={user} />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfileHistory db={db} user={user} />
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* MODIFICATION : On passe db pour charger le document unique */}
              <ProfileLeaderboard db={db} uid={uid} />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfileSettings auth={auth} logout={logout} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
