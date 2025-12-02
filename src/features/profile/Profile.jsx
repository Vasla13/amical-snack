import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
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
import ProfileHistory from "./tabs/ProfileHistory.jsx"; // Nouvel import

export default function Profile({ user, logout, db, uid, auth }) {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("levels");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "users"), (s) => {
      setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [db]);

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

        <div className="group relative w-full aspect-[1.586/1] rounded-[24px] transition-all duration-500 hover:scale-[1.02] shadow-2xl shadow-slate-200/50 dark:shadow-none">
          <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16" />
            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white/40 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative h-full flex flex-col justify-between p-6 z-10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 border border-yellow-500/30 flex items-center justify-center shadow-sm">
                    <div className="w-8 h-5 border border-yellow-600/20 rounded-[2px]" />
                  </div>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-slate-300 dark:text-slate-600"
                  >
                    <path
                      d="M5 12.55a11 11 0 0 1 14.08 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.5 15.5a6 6 0 0 1 7 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 18.5a1 1 0 0 1 0 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Actif
                  </span>
                </div>
              </div>

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

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Membre
                  </p>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    {user?.displayName || "Étudiant"}
                  </p>
                </div>
                <CreditCard
                  className="text-slate-200 dark:text-slate-700"
                  size={40}
                  strokeWidth={1}
                />
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
              <ProfileLeaderboard users={users} uid={uid} />
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
