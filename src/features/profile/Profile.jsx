import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { User, LogOut, Trophy, KeyRound, Sparkles, Medal } from "lucide-react";
import NotificationButton from "./NotificationButton"; // AJOUT Import du composant créé plus haut

export default function Profile({ user, logout, db, uid, auth }) {
  const [users, setUsers] = useState([]);
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");

  // AJOUT : État pour le filtre temporel
  const [timeframe, setTimeframe] = useState("all"); // 'all' | 'month'

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "users"), (s) => {
      setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [db]);

  const changePassword = async () => {
    if (newPwd.length < 6) return alert("6 caractères min.");
    try {
      if (!auth.currentUser) return;
      await updatePassword(auth.currentUser, newPwd);
      setMsg("Mot de passe modifié !");
      setNewPwd("");
      setTimeout(() => setShowPwd(false), 2000);
    } catch {
      alert("Erreur : reconnecte-toi pour changer le mot de passe.");
    }
  };

  const leaderboard = useMemo(() => {
    // Calcul de la clé du mois courant (ex: "2023-10")
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    const list = (users || [])
      .filter((u) => !!u.email && u.role !== "admin")
      .map((u) => ({
        id: u.id,
        name: u.displayName || u.email.split("@")[0],
        // Logique de bascule des points
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
    { name: "Bienvenue", icon: "👋", unlocked: true },
    { name: "Caféinomane", icon: "☕", unlocked: (user?.points || 0) > 20 },
    { name: "Gros Mangeur", icon: "🍔", unlocked: (user?.points || 0) > 50 },
    { name: "VIP", icon: "👑", unlocked: user?.role === "admin" },
  ];

  return (
    <div className="px-4 pb-8 pt-2 space-y-6">
      {/* CARTE FIDÉLITÉ */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -ml-16 -mb-16"></div>

        <div className="relative z-10 flex flex-col h-32 justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                Solde actuel
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tighter">
                  {fmtPoints(user?.points)}
                </span>
                <span className="text-teal-400 font-bold">PTS</span>
              </div>
            </div>
            <Sparkles className="text-yellow-400 animate-pulse w-6 h-6" />
          </div>
          <div className="flex items-center gap-3 mt-auto">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <User className="text-teal-300 w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">
                {user?.displayName || "Membre"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 opacity-80">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BADGES */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <Medal className="text-purple-500" size={20} /> Mes Succès
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {badges.map((badge) => (
            <div
              key={badge.name}
              className={`flex flex-col items-center min-w-[70px] transition-all ${
                badge.unlocked ? "" : "opacity-40 grayscale"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 border ${
                  badge.unlocked
                    ? "bg-purple-50 border-purple-100 dark:bg-slate-800 dark:border-slate-700"
                    : "bg-slate-100 border-slate-200"
                }`}
              >
                {badge.icon}
              </div>
              <span className="text-[10px] font-bold text-center text-slate-600 dark:text-slate-400 leading-tight">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CLASSEMENT */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Trophy className="text-yellow-500 fill-yellow-500" size={18} />{" "}
            Leaderboard
          </h3>

          {/* AJOUT : Switch Global / Mois */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setTimeframe("all")}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                timeframe === "all"
                  ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white"
                  : "text-slate-400"
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                timeframe === "month"
                  ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white"
                  : "text-slate-400"
              }`}
            >
              Ce mois
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {top10.map((u, i) => {
            const isMe = uid === u.id;
            let rankClass =
              "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
            if (i === 0)
              rankClass =
                "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-900";
            if (i === 1)
              rankClass =
                "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
            if (i === 2)
              rankClass =
                "bg-orange-100 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-900";

            return (
              <div
                key={u.id}
                className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                  isMe
                    ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-900/20 dark:ring-teal-800"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm ${rankClass}`}
                  >
                    {i + 1}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      isMe
                        ? "text-teal-900 dark:text-teal-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {u.name} {isMe && "(Moi)"}
                  </div>
                </div>
                <div className="font-black text-slate-900 dark:text-white text-sm">
                  {fmtPoints(u.points)}{" "}
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PARAMÈTRES */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setShowPwd(!showPwd)}
          className="w-full flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyRound size={18} /> Changer mot de passe
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-400">
            {showPwd ? "Fermer" : "Modifier"}
          </span>
        </button>

        {showPwd && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
            {msg ? (
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-center">
                {msg}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  className="flex-1 p-3 text-sm bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 border rounded-xl outline-none transition-all font-bold dark:text-white placeholder:text-slate-400"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <button
                  onClick={changePassword}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-4 rounded-xl active:scale-95 transition-transform"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}

        {/* AJOUT : Bouton de notifications */}
        <NotificationButton />
      </div>

      <button
        onClick={logout}
        className="w-full py-4 text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95"
      >
        <LogOut size={18} /> Se déconnecter
      </button>
    </div>
  );
}
