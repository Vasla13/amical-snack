import React from "react";
import { Trophy, Wallet } from "lucide-react";
import RouletteGame from "./components/RouletteGame";
import PointsShop from "./components/PointsShop";
import { UserProfile, Product } from "../../types";
import { Firestore } from "firebase/firestore";

interface LoyaltyScreenProps {
  user: UserProfile | null;
  products: Product[];
  db: Firestore;
  onGoToPass: () => void;
  notify: (msg: string, type: "success" | "error" | "info") => void;
  onConfirm: (opts: any) => void;
}

export default function LoyaltyScreen({
  user,
  products,
  db,
  onGoToPass,
  notify,
  onConfirm,
}: LoyaltyScreenProps) {
  return (
    <div className="p-4 pb-24 bg-slate-50 dark:bg-slate-950 min-h-dvh transition-colors font-sans">
      <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-700 dark:text-teal-400">
          <Trophy size={22} />
        </div>
        Programme Fidélité
      </h1>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-yellow-400/20" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
            <Wallet size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Solde disponible
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter">
              {Number(user?.points || 0)
                .toFixed(2)
                .replace(/[.,]00$/, "")}
            </span>
            <span className="text-xl font-bold text-yellow-500">PTS</span>
          </div>

          <p className="text-xs text-slate-400 font-medium mt-2">
            Utilise tes points pour jouer ou acheter !
          </p>
        </div>
      </div>

      <RouletteGame
        user={user}
        products={products}
        db={db}
        notify={notify}
        onConfirm={onConfirm}
        onGoToPass={onGoToPass}
      />

      <div className="mt-8">
        <PointsShop
          user={user}
          products={products}
          db={db}
          notify={notify}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}
