import React, { useMemo } from "react";
import { Trophy, Star, Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";

const LEVELS = [
  {
    name: "Novice",
    min: 0,
    icon: Star,
    color: "text-slate-400",
    bg: "bg-slate-100",
  },
  {
    name: "Habitué",
    min: 100,
    icon: Zap,
    color: "text-teal-500",
    bg: "bg-teal-100",
  },
  {
    name: "VIP",
    min: 500,
    icon: Trophy,
    color: "text-yellow-500",
    bg: "bg-yellow-100",
  },
  {
    name: "Roi du Snack",
    min: 1000,
    icon: Crown,
    color: "text-purple-500",
    bg: "bg-purple-100",
  },
];

export default function ProfileLevels({ user }) {
  const lifetimeScore = useMemo(() => {
    const history = user?.points_history || {};
    const sum = Object.values(history).reduce(
      (acc, val) => acc + (typeof val === "number" ? val : 0),
      0
    );
    return sum > 0 ? sum : user?.points || 0;
  }, [user]);

  const currentLevelIndex = LEVELS.reduce((acc, lvl, idx) => {
    if (lifetimeScore >= lvl.min) return idx;
    return acc;
  }, 0);

  const currentLevel = LEVELS[currentLevelIndex];
  const nextLevel = LEVELS[currentLevelIndex + 1];

  const progress = nextLevel
    ? Math.min(
        100,
        Math.max(
          0,
          ((lifetimeScore - currentLevel.min) /
            (nextLevel.min - currentLevel.min)) *
            100
        )
      )
    : 100;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Niveau Actuel
            </p>
            <h2
              className={`text-3xl font-black ${currentLevel.color.replace(
                "text-",
                "text-"
              )}`}
            >
              {currentLevel.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Total à vie :{" "}
              <span className="text-slate-900 dark:text-white font-black">
                {lifetimeScore.toFixed(0)} pts
              </span>
            </p>
          </div>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${currentLevel.bg} ${currentLevel.color}`}
          >
            <currentLevel.icon size={28} strokeWidth={2.5} />
          </div>
        </div>

        <div className="mt-6 relative z-10">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Progression</span>
            {nextLevel ? (
              <span>
                {nextLevel.min - lifetimeScore.toFixed(0)} pts restants
              </span>
            ) : (
              <span>Niveau Max !</span>
            )}
          </div>
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${currentLevel.color.replace(
                "text-",
                "bg-"
              )}`}
            />
          </div>
        </div>
        <div
          className={`absolute -right-4 -bottom-4 w-32 h-32 rounded-full opacity-10 ${currentLevel.bg.replace(
            "bg-",
            "bg-"
          )}`}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-800 dark:text-white px-2">
          Échelons
        </h3>
        {LEVELS.map((lvl, idx) => {
          const isUnlocked = idx <= currentLevelIndex;
          const isNext = idx === currentLevelIndex + 1;

          return (
            <div
              key={lvl.name}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                isUnlocked
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  : "bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-60"
              } ${
                isNext
                  ? "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950"
                  : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isUnlocked
                    ? `${lvl.bg} ${lvl.color}`
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                <lvl.icon size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span
                    className={`font-bold ${
                      isUnlocked
                        ? "text-slate-800 dark:text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {lvl.name}
                  </span>
                  {isUnlocked && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">
                      Débloqué
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-bold mt-0.5">
                  Requis : {lvl.min} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
