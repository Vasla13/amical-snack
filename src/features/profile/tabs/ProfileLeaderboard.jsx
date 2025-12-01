import React, { useMemo, useState } from "react";
import { User } from "lucide-react";

// Helper interne
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

const fmtPoints = (p) =>
  Number(p || 0)
    .toFixed(2)
    .replace(/[.,]00$/, "");

export default function ProfileLeaderboard({ users, uid }) {
  const [timeframe, setTimeframe] = useState("all");

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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
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
          let rankStyle = "bg-slate-100 dark:bg-slate-800 text-slate-500";
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
    </div>
  );
}
