import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import {
  User,
  LogOut,
  Trophy,
  KeyRound,
  Sparkles,
  Medal,
  Settings,
  CreditCard,
  ShieldCheck,
  BellRing,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationButton from "./NotificationButton";
import Button from "../../ui/Button";

const getInitials = (name) => {
  return name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
};

export default function Profile({ user, logout, db, uid, auth }) {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");

  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdError, setPwdError] = useState(null);
  const [timeframe, setTimeframe] = useState("all");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "users"), (s) => {
      setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [db]);

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
      // CORRECTION : Message explicite pour la sécurité
      setPwdError(
        "Sécurité : Déconnecte-toi et reconnecte-toi pour changer ton mot de passe."
      );
    }
  };

  const leaderboard = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const list = (users || [])
      .filter((u) => !!u.email && u.role !== "admin")
      .map((u) => ({
        id: u.id,
        name: u.displayName || u.email.split("@")[0],
        points:
          timeframe === "month"
            ? u.points_history?.[currentMonthKey] || 0
            : Number(u.points || 0),
      }));
    list.sort((a, b) => b.points - a.points);
    return list;
  }, [users, timeframe]);

  const top10 = leaderboard.slice(0, 10);
  const fmtPoints = (p) =>
    Number(p || 0)
      .toFixed(2)
      .replace(/[.,]00$/, "");

  const badges = [
    {
      name: "Bienvenue",
      icon: "👋",
      unlocked: true,
      desc: "Première connexion",
    },
    {
      name: "Caféinomane",
      icon: "☕",
      unlocked: (user?.points || 0) > 20,
      desc: "20 pts cumulés",
    },
    {
      name: "Gros Mangeur",
      icon: "🍔",
      unlocked: (user?.points || 0) > 50,
      desc: "50 pts cumulés",
    },
    {
      name: "Légende",
      icon: "👑",
      unlocked: user?.role === "admin",
      desc: "Être Admin",
    },
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

        <div className="group relative w-full aspect-[1.586/1] rounded-[24px] transition-all duration-500 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-slate-900 rounded-[24px] overflow-hidden shadow-2xl shadow-slate-900/30 border border-slate-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#334155,_#0f172a)]" />
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-50" />
            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine" />

            <div className="relative h-full flex flex-col justify-between p-6 z-10 text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-5 rounded bg-yellow-200/20 border border-yellow-200/40 backdrop-blur-md flex items-center justify-center">
                    <div className="w-6 h-3 border border-yellow-200/30 rounded-[2px]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                    Amicale Pass
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    Actif
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  Solde actuel
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">
                    {fmtPoints(user?.points)}
                  </span>
                  <span className="text-lg font-bold text-teal-400">PTS</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Titulaire
                  </p>
                  <p className="font-bold tracking-wide uppercase text-sm text-slate-200 truncate max-w-[150px]">
                    {user?.displayName || "Étudiant"}
                  </p>
                </div>
                <CreditCard
                  className="text-slate-600 opacity-50"
                  size={32}
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex gap-1 relative z-20">
          {[
            { id: "stats", label: "Succès", icon: Medal },
            { id: "leaderboard", label: "Classement", icon: Trophy },
            { id: "settings", label: "Paramètres", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
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
          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 gap-4"
            >
              {badges.map((badge, idx) => (
                <div
                  key={idx}
                  className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group ${
                    badge.unlocked
                      ? "bg-white dark:bg-slate-900 border-purple-100 dark:border-purple-900 shadow-lg shadow-purple-100/50 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 grayscale"
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="text-4xl drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300">
                      {badge.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white text-sm">
                        {badge.name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                        {badge.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  {["all", "month"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        timeframe === t
                          ? "bg-slate-900 text-white shadow"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                    >
                      {t === "all" ? "Global" : "Ce mois"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {top10.map((u, i) => {
                  const isMe = uid === u.id;
                  let rankStyle =
                    "bg-slate-100 dark:bg-slate-800 text-slate-500";
                  let rowStyle = isMe
                    ? "bg-teal-50/50 dark:bg-teal-900/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50";

                  if (i === 0)
                    rankStyle =
                      "bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-yellow-200";
                  if (i === 1)
                    rankStyle =
                      "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-200";
                  if (i === 2)
                    rankStyle =
                      "bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-orange-200";

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-4 transition-colors ${rowStyle}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${rankStyle}`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {getInitials(u.name)}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-bold ${
                                isMe
                                  ? "text-teal-700 dark:text-teal-400"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {u.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] font-bold text-teal-500 uppercase tracking-wider">
                                C'est moi !
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800 dark:text-slate-200 text-sm">
                          {fmtPoints(u.points)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">
                          pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
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
                    <input
                      type="password"
                      placeholder="Nouveau mot de passe"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 dark:text-white"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={changePasswordAction}
                    className="w-full py-3 text-xs shadow-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    Mettre à jour
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
