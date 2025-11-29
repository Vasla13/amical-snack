import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { User, LogOut, Trophy, KeyRound } from "lucide-react";

export default function Profile({ user, logout, db, uid, auth }) {
  // ✅ CORRIGÉ ICI
  const [users, setUsers] = useState([]);
  const [loadingLb, setLoadingLb] = useState(true);

  // États pour changement de mot de passe
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, "users"), (s) => {
      setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingLb(false);
    });
    return () => unsub();
  }, [db]);

  const changePassword = async () => {
    if (newPwd.length < 6) return alert("Mot de passe trop court (6 min)");
    try {
      if (!auth.currentUser) return;
      await updatePassword(auth.currentUser, newPwd);
      setMsg("Mot de passe modifié avec succès !");
      setNewPwd("");
      setTimeout(() => setShowPwd(false), 2000);
    } catch (e) {
      alert(
        "Erreur: Pour changer le mot de passe, tu dois t'être connecté récemment. Déconnecte-toi et réessaie."
      );
    }
  };

  const leaderboard = useMemo(() => {
    const list = (users || [])
      .filter((u) => !!u.email && u.role !== "admin")
      .map((u) => ({
        id: u.id,
        name: u.displayName || u.email || "etudiant",
        email: u.email || "",
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

  const medalClass = (i) => {
    if (i === 0) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (i === 1) return "bg-gray-100 text-gray-800 border-gray-200";
    if (i === 2) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-white text-gray-700 border-gray-200";
  };

  return (
    <div className="p-4">
      <div className="bg-teal-700 text-white p-8 rounded-3xl shadow-lg mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-yellow-400">
            {fmtPoints(user?.points)}
          </h2>
          <p className="font-bold text-teal-200">POINTS FIDÉLITÉ</p>
        </div>
        <User className="absolute -bottom-4 -right-4 text-teal-600 w-32 h-32" />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
        <p className="text-gray-500 text-xs uppercase font-bold">Compte</p>
        <p className="font-bold text-lg">{user?.displayName || "Anonyme"}</p>
        <p className="text-teal-600 break-all">{user?.email}</p>

        {/* Changer mot de passe */}
        <button
          onClick={() => setShowPwd(!showPwd)}
          className="mt-3 text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-teal-700"
        >
          <KeyRound size={14} /> Changer mot de passe
        </button>

        {showPwd && (
          <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            {msg ? (
              <p className="text-green-600 text-xs font-bold">{msg}</p>
            ) : (
              <>
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  className="w-full p-2 text-sm border rounded-lg mb-2"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <button
                  onClick={changePassword}
                  className="bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-lg w-full"
                >
                  VALIDER
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            <h3 className="font-black text-gray-800">Classement</h3>
          </div>
        </div>

        <div className="space-y-2">
          {top10.map((u, i) => {
            const isMe = uid && u.id === uid;
            return (
              <div
                key={u.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${medalClass(
                  i
                )} ${isMe ? "ring-2 ring-teal-500" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-black text-xs">{i + 1}</div>
                  <div className="truncate text-sm font-bold">{u.name}</div>
                </div>
                <div className="font-black text-teal-700">
                  {fmtPoints(u.points)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full p-4 text-red-500 font-bold bg-red-50 rounded-xl flex items-center justify-center gap-2"
      >
        <LogOut size={20} /> DÉCONNEXION
      </button>
    </div>
  );
}
