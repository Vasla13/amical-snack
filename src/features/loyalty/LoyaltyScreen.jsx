import React from "react";
import { Sparkles } from "lucide-react";
import RouletteGame from "./components/RouletteGame.jsx";
import PointsShop from "./components/PointsShop.jsx";

export default function LoyaltyScreen({
  user,
  products,
  db,
  onGoToPass,
  notify,
  onConfirm,
}) {
  return (
    <div className="p-4 pb-24 bg-gray-50 min-h-full">
      {/* HEADER SOLDE */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-800 p-6 rounded-3xl text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 text-center">
          <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">
            Solde Fidélité
          </div>
          <div className="text-6xl font-black text-yellow-400 drop-shadow-md">
            {Number(user?.points || 0)
              .toFixed(2)
              .replace(/[.,]00$/, "")}
            <span className="text-xl text-yellow-200 ml-2">pts</span>
          </div>
        </div>
        <Sparkles className="absolute left-4 top-4 text-yellow-400/30 w-12 h-12 animate-pulse" />
      </div>

      <RouletteGame
        user={user}
        products={products}
        db={db}
        notify={notify}
        onConfirm={onConfirm}
        onGoToPass={onGoToPass}
      />
      <PointsShop
        user={user}
        products={products}
        db={db}
        notify={notify}
        onConfirm={onConfirm}
      />
    </div>
  );
}
