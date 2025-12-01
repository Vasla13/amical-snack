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
  // On utilise le hook créé précédemment pour la logique
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
      // Callback de succès pour afficher la modale (reprise de ton ancien code UI)
      onConfirm?.({
        title: "🎉 C'EST GAGNÉ !",
        text: (
          <div className="flex flex-col items-center gap-4 py-4 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 animate-pulse rounded-full" />
              <div className="relative z-10 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl">
                <img
                  src={winnerItem?.image}
                  className="w-24 h-24 object-contain"
                  alt={winnerItem?.name}
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-teal-600 text-xs font-black uppercase tracking-widest mb-1">
                Félicitations
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                {winnerItem?.name}
              </p>
            </div>
          </div>
        ),
        confirmText: "VOIR MON CADEAU",
        cancelText: "REJOUER",
        onOk: () => onGoToPass?.(),
      });
    });
  };

  return (
    <div className="mb-8 select-none">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <Dices className="text-purple-600" size={20} strokeWidth={2.5} />
          Mystery Box
        </h2>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
          Coût : {COST} pts
        </span>
      </div>

      {/* Zone de Jeu */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-2 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        {/* Fenêtre de la roulette */}
        <div className="relative z-10 bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800/50 h-[160px] overflow-hidden">
          {/* Ombres internes pour effet de profondeur */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-20" />

          {/* Viseur Central */}
          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col justify-between items-center py-1">
            <ChevronDown
              className="text-teal-500 drop-shadow-sm"
              size={24}
              strokeWidth={4}
            />
            <div className="h-full w-0.5 bg-teal-500/20 rounded-full" />
            <ChevronDown
              className="text-teal-500 drop-shadow-sm rotate-180"
              size={24}
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
              // CORRECTION ICI : J'ai retiré "pl-[50%]"
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
                        ? "bg-white dark:bg-slate-800 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] scale-110 z-10"
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-80"
                    }`}
                    style={{ width: ITEM_WIDTH, height: 120 }}
                  >
                    <div className="relative mb-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 object-contain"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-center leading-tight line-clamp-2 px-2 text-slate-700 dark:text-slate-300">
                      {item.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bouton d'action */}
        <div className="mt-2">
          <Button
            onClick={handleSpinClick}
            disabled={
              !canPlay || gameState === "spinning" || gameState === "saving"
            }
            className={`w-full py-4 text-sm shadow-none ${
              !canPlay
                ? "bg-slate-100 text-slate-400 border border-slate-200"
                : "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
            }`}
          >
            {gameState === "saving" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} /> Validation...
              </span>
            ) : gameState === "spinning" ? (
              <span className="flex items-center gap-2">Bonne chance !</span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className={canPlay ? "text-yellow-400" : ""}
                />
                Lancer la roue
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
