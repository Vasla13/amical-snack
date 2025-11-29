import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { User, LogOut, Trophy } from "lucide-react";

export default function Profile({ user, logout, db, uid }) {
  const [users, setUsers] = useState([]);
  const [loadingLb, setLoadingLb] = useState(true);

  useEffect(() => {
    if (!db) return;

    const unsub = onSnapshot(collection(db, "users"), (s) => {
      const list = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
      setLoadingLb(false);
    });

    return () => unsub();
  }, [db]);

  // Leaderboard : uniquement les comptes "clients" (email présent, pas admin)
  const leaderboard = useMemo(() => {
    const list = (users || [])
      .filter((u) => !!u.email)
      .filter((u) => u.role !== "admin")
      .map((u) => ({
        id: u.id,
        name: u.displayName || u.email || "etudiant",
        email: u.email || "",
        points: Number(u.points || 0),
      }));

    // tri desc points
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (a.email || "").localeCompare(b.email || "");
    });

    return list;
  }, [users]);

  const myRank = useMemo(() => {
    if (!uid) return -1;
    return leaderboard.findIndex((u) => u.id === uid);
  }, [leaderboard, uid]);

  const top10 = leaderboard.slice(0, 10);

  const fmtPoints = (p) => {
    // affiche propre : 12, 12.5, 12.34 (sans poussière float)
    const n = Number(p || 0);
    const centi = Math.round(n * 100);
    const clean = centi / 100;
    return Number.isInteger(clean)
      ? String(clean)
      : String(clean).replace(/\.?0+$/, "");
  };

  const medalClass = (rankIndex) => {
    if (rankIndex === 0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (rankIndex === 1) return "bg-gray-100 text-gray-800 border-gray-200";
    if (rankIndex === 2)
      return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-white text-gray-700 border-gray-200";
  };

  return (
    <div className="p-4">
      <div className="bg-teal-700 text-white p-8 rounded-3xl shadow-lg mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-yellow-400">
            {fmtPoints(user?.points || 0)}
          </h2>
          <p className="font-bold text-teal-200">POINTS FIDÉLITÉ</p>
          <p className="text-xs text-teal-200 mt-2 opacity-90">1€ = 1 point</p>
        </div>
        <User className="absolute -bottom-4 -right-4 text-teal-600 w-32 h-32" />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
        <p className="text-gray-500 text-xs uppercase font-bold">Compte</p>
        <p className="font-bold text-lg">{user?.displayName || "-"}</p>
        <p className="text-teal-600 break-all">{user?.email || "-"}</p>
      </div>

      {/* ✅ Leaderboard */}
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            <h3 className="font-black text-gray-800">Leaderboard</h3>
          </div>
          <span className="text-[10px] font-bold uppercase text-gray-400">
            {leaderboard.length} comptes
          </span>
        </div>

        <div className="text-xs text-gray-600 leading-relaxed mb-3">
          <p className="font-bold text-gray-700">Récompenses :</p>
          <p>Top 1 : 5 produits au choix</p>
          <p>Top 2 : 3 produits au choix</p>
          <p>Top 3 : 1 produit au choix</p>
        </div>

        <div className="border-t border-gray-100 pt-3">
          {loadingLb ? (
            <p className="text-center text-gray-400 italic py-4">
              Chargement du classement…
            </p>
          ) : top10.length === 0 ? (
            <p className="text-center text-gray-400 italic py-4">
              Aucun compte pour l’instant
            </p>
          ) : (
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
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs bg-gray-900 text-white">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">
                          {u.name}
                          {isMe ? " (moi)" : ""}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-teal-700">
                        {fmtPoints(u.points)}
                      </div>
                      <div className="text-[10px] uppercase text-gray-400 font-bold">
                        pts
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* si tu n'es pas dans le top10, on affiche ta ligne */}
              {myRank >= 10 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 font-bold uppercase mb-2">
                    Ta position
                  </div>
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2 bg-teal-50 border-teal-100 ring-1 ring-teal-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs bg-teal-700 text-white">
                        {myRank + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">
                          {user?.displayName || "moi"}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {user?.email || ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-teal-700">
                        {fmtPoints(user?.points || 0)}
                      </div>
                      <div className="text-[10px] uppercase text-gray-400 font-bold">
                        pts
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-2 w-full p-4 text-red-500 font-bold bg-red-50 rounded-xl flex items-center justify-center gap-2"
      >
        <LogOut size={20} /> DÉCONNEXION
      </button>
    </div>
  );
}
