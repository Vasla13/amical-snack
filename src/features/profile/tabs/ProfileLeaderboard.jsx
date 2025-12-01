import React, { useMemo, useState } from "react";
import { User, Trophy, Calendar, Crown, Medal, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// Helper : Nettoyage des points
const normalizePoints = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const str = String(value).replace(",", ".").trim();
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
};

// Helper : Initiales
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
  const [timeframe, setTimeframe] = useState("month");

  const leaderboard = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    const list = (users || [])
      .filter((u) => !!u.email && u.role !== "admin")
      .map((u) => {
        let score = 0;
        if (timeframe === "month") {
          score = normalizePoints(u.points_history?.[currentMonthKey]);
        } else {
          const history = u.points_history || {};
          const historySum = Object.values(history).reduce(
            (sum, val) => sum + normalizePoints(val),
            0
          );
          score = historySum > 0 ? historySum : normalizePoints(u.points);
        }
        return {
          id: u.id,
          name: u.displayName || u.email.split("@")[0],
          score: score,
        };
      });

    list.sort((a, b) => b.score - a.score);
    // On garde le top 50 pour la performance, mais on n'affiche que ceux qui ont des points
    return list.filter((u) => u.score > 0).slice(0, 50);
  }, [users, timeframe]);

  // Animation des items
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[500px]">
      {/* HEADER FILTRES */}
      <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setTimeframe("month")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              timeframe === "month"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Calendar size={14} /> Ce mois
          </button>
          <button
            onClick={() => setTimeframe("all")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              timeframe === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Trophy size={14} /> Global
          </button>
        </div>
      </div>

      {/* LISTE DÉFILANTE */}
      <motion.div
        className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar scroll-smooth"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {leaderboard.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 opacity-60">
            <Trophy size={48} strokeWidth={1} />
            <p className="text-sm font-medium">
              Aucun classement pour le moment.
            </p>
          </div>
        ) : (
          leaderboard.map((u, i) => {
            const isMe = uid === u.id;
            const rank = i + 1;

            // Styles spécifiques pour le TOP 3
            let cardStyle =
              "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800";
            let rankIcon = (
              <span className="font-black text-slate-400 text-sm">#{rank}</span>
            );
            let textColor = "text-slate-700 dark:text-slate-200";

            if (rank === 1) {
              cardStyle =
                "bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-yellow-900/10 dark:to-yellow-900/5 border-yellow-200 dark:border-yellow-900/30 shadow-sm";
              rankIcon = (
                <div className="p-1.5 bg-yellow-400 text-white rounded-full shadow-lg shadow-yellow-400/40">
                  <Crown size={16} fill="currentColor" />
                </div>
              );
              textColor = "text-yellow-800 dark:text-yellow-200";
            } else if (rank === 2) {
              cardStyle =
                "bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-800/10 border-slate-200 dark:border-slate-700";
              rankIcon = (
                <div className="p-1.5 bg-slate-300 text-slate-600 rounded-full">
                  <Medal size={16} fill="currentColor" />
                </div>
              );
              textColor = "text-slate-700 dark:text-slate-300";
            } else if (rank === 3) {
              cardStyle =
                "bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-900/5 border-orange-200 dark:border-orange-900/30";
              rankIcon = (
                <div className="p-1.5 bg-orange-400 text-white rounded-full">
                  <Medal size={16} fill="currentColor" />
                </div>
              );
              textColor = "text-orange-800 dark:text-orange-200";
            }

            // Surcharge si c'est moi (sauf si je suis 1er, on garde le gold)
            if (isMe && rank > 1) {
              cardStyle =
                "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 ring-1 ring-teal-300 dark:ring-teal-700";
            }

            return (
              <motion.div
                key={u.id}
                variants={itemAnim}
                className={`flex items-center justify-between p-3 rounded-2xl border ${cardStyle} transition-all`}
              >
                <div className="flex items-center gap-3">
                  {/* Rang */}
                  <div className="w-8 flex justify-center">{rankIcon}</div>

                  {/* Avatar + Nom */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                        rank === 1
                          ? "bg-yellow-400 text-yellow-900"
                          : rank === 2
                          ? "bg-slate-300 text-slate-700"
                          : rank === 3
                          ? "bg-orange-400 text-orange-900"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {getInitials(u.name)}
                    </div>

                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-bold truncate max-w-[120px] ${textColor}`}
                      >
                        {u.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles size={8} /> C'est moi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right pr-2">
                  <div className={`font-black text-base ${textColor}`}>
                    {fmtPoints(u.score)}
                  </div>
                  <div
                    className={`text-[9px] font-bold uppercase opacity-60 ${textColor}`}
                  >
                    pts
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
