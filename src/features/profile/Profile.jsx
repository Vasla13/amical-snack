import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { User, LogOut, Trophy, KeyRound, Sparkles } from "lucide-react";

export default function Profile({ user, logout, db, uid, auth }) {
  const [users, setUsers] = useState([]);
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");

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
    const list = (users || [])
      .filter((u) => !!u.email && u.role !== "admin")
      .map((u) => ({
        id: u.id,
        name: u.displayName || u.email.split("@")[0],
        points: Number(u.points || 0),
      }));
    list.sort((a, b) => b.points - a.points);
    return list;
  }, [users]);

  const top10 = leaderboard.slice(0, 10);
  const fmtPoints = (p) =>
    Number(p || 0)
      .toFixed(2)
      .replace(/[.,]00$/, "");

  return (
    <div className="px-4 pb-8 pt-2 space-y-6">
      {/* CARTE FIDÉLITÉ (Look Carte Bancaire) */}
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

      {/* CLASSEMENT */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <Trophy className="text-yellow-500 fill-yellow-500" size={18} />
            Leaderboard
          </h3>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-wider">
            Top 10
          </span>
        </div>

        <div className="space-y-3">
          {top10.map((u, i) => {
            const isMe = uid === u.id;
            let rankClass = "bg-slate-100 text-slate-500";
            if (i === 0)
              rankClass =
                "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200";
            if (i === 1) rankClass = "bg-slate-200 text-slate-700";
            if (i === 2)
              rankClass =
                "bg-orange-100 text-orange-800 ring-1 ring-orange-200";

            return (
              <div
                key={u.id}
                className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                  isMe ? "bg-teal-50 ring-1 ring-teal-200" : ""
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
                      isMe ? "text-teal-900" : "text-slate-700"
                    }`}
                  >
                    {u.name} {isMe && "(Moi)"}
                  </div>
                </div>
                <div className="font-black text-slate-900 text-sm">
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
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <button
          onClick={() => setShowPwd(!showPwd)}
          className="w-full flex items-center justify-between text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyRound size={18} /> Changer mot de passe
          </span>
          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400">
            {showPwd ? "Fermer" : "Modifier"}
          </span>
        </button>

        {showPwd && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
            {msg ? (
              <p className="text-emerald-600 text-xs font-bold bg-emerald-50 p-3 rounded-xl text-center">
                {msg}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  className="flex-1 p-3 text-sm bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 border rounded-xl outline-none transition-all font-bold"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <button
                  onClick={changePassword}
                  className="bg-slate-900 text-white text-xs font-bold px-4 rounded-xl active:scale-95 transition-transform"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="w-full py-4 text-red-500 font-bold bg-red-50 border border-red-100 hover:bg-red-100 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95"
      >
        <LogOut size={18} /> Se déconnecter
      </button>
    </div>
  );
}
