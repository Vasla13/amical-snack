import React from "react";
import { Dices, Loader2, Sparkles, ChevronDown } from "lucide-react";
import Button from "../../../ui/Button.jsx";
import { useRouletteLogic } from "../hooks/useRouletteLogic.js";

export default function RouletteGame({
  user,
  products = [],
  db,
  notify,
  onConfirm,
  onGoToPass,
}) {
  const {
    gameState,
    strip,
    containerRef,
    stripRef,
    canPlay,
    spin,
    COST,
    ITEM_WIDTH,
    GAP,
    WINNER_INDEX,
  } = useRouletteLogic({ user, products, db, notify });

  const handleSpinClick = () => {
    spin((winnerItem) => {
      if (onConfirm) {
        onConfirm({
          title: "🎉 C'EST GAGNÉ !",
          text: (
            <div className="flex flex-col items-center gap-4 py-4 animate-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse rounded-full" />
                <div className="relative z-10 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl">
                  <img
                    src={winnerItem?.image}
                    className="w-28 h-28 object-contain drop-shadow-md"
                    alt={winnerItem?.name}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-teal-600 dark:text-teal-400 text-xs font-black uppercase tracking-widest mb-2">
                  Félicitations
                </p>
                <p className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  {winnerItem?.name}
                </p>
                <p className="text-xs text-slate-400 mt-2">Ajouté à ton Pass</p>
              </div>
            </div>
          ),
          confirmText: "VOIR MON CADEAU",
          cancelText: "REJOUER",
          onOk: () => onGoToPass?.(),
        });
      }
    });
  };

  return (
    <div className="mb-8 select-none">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Dices size={20} strokeWidth={2.5} />
          </div>
          Mystery Box
        </h2>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
          Coût : {COST} pts
        </span>
      </div>

      {/* Zone de Jeu */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-3 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden ring-4 ring-slate-50 dark:ring-slate-800 transition-colors">
        {/* Fenêtre de la roulette */}
        <div className="relative z-10 bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 h-[160px] overflow-hidden">
          {/* Ombres internes */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-20" />

          {/* Viseur Central */}
          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col justify-between items-center py-1">
            <ChevronDown
              className="text-purple-500 dark:text-yellow-400 drop-shadow-sm"
              size={28}
              strokeWidth={4}
            />
            <div className="h-full w-[2px] bg-purple-500/20 dark:bg-yellow-400/20 rounded-full" />
            <ChevronDown
              className="text-purple-500 dark:text-yellow-400 drop-shadow-sm rotate-180"
              size={28}
              strokeWidth={4}
            />
          </div>

          {/* Bande défilante */}
          <div
            ref={containerRef}
            className="relative w-full h-full flex items-center"
          >
            <div
              ref={stripRef}
              className="flex items-center will-change-transform"
              style={{
                gap: `${GAP}px`,
                transform: "translate3d(0px,0px,0px)",
              }}
            >
              {strip.map((item, index) => {
                if (!item) return null;
                const isWon = gameState === "won" && index === WINNER_INDEX;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={`flex-shrink-0 relative rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border ${
                      isWon
                        ? "bg-white dark:bg-slate-800 border-purple-500 dark:border-yellow-400 shadow-lg scale-105 z-10"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 opacity-80"
                    }`}
                    style={{ width: ITEM_WIDTH, height: 120 }}
                  >
                    <div className="relative mb-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 object-contain drop-shadow-sm"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                    <p
                      className={`text-[10px] font-bold text-center leading-tight line-clamp-2 px-2 ${
                        isWon
                          ? "text-purple-600 dark:text-yellow-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {item.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bouton d'action */}
        <div className="mt-3">
          <Button
            onClick={handleSpinClick}
            disabled={!canPlay || gameState === "spinning"}
            className={`w-full py-4 text-sm font-black tracking-wide shadow-lg active:scale-[0.98] ${
              !canPlay
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none"
                : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            }`}
          >
            {gameState === "spinning" ? (
              <span className="flex items-center gap-2 animate-pulse">
                <Loader2 className="animate-spin" size={18} /> TENSION...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles
                  size={18}
                  className={
                    canPlay ? "text-yellow-400 dark:text-purple-600" : ""
                  }
                />
                LANCER LA BOÎTE
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
