import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Star, Flame } from "lucide-react";
import { formatPrice } from "../../lib/format.js";
import Button from "../../ui/Button.jsx";

export default function ProductModal({
  product,
  isOpen,
  onClose,
  onAdd,
  onToggleFav,
  isFav,
  allProducts,
}) {
  if (!product) return null;

  // Intelligence : Recommandation (Cross-selling) Améliorée
  const recommendations = useMemo(() => {
    if (!allProducts || !product) return [];

    const cat = product.category;
    let targetCats = [];

    // Logique croisée : Snack <-> Boissons
    if (cat === "Snacks" || cat === "Formules") {
      targetCats = ["Boissons", "Boissons Chaudes"];
    } else {
      // C'est une boisson (chaude ou froide) -> on propose un snack
      targetCats = ["Snacks"];
    }

    return allProducts
      .filter(
        (p) =>
          targetCats.includes(p.category) &&
          p.id !== product.id &&
          p.is_available !== false
      )
      .sort(() => 0.5 - Math.random()) // Shuffle simple
      .slice(0, 2);
  }, [product, allProducts]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2rem] p-6 z-[70] shadow-2xl max-w-md mx-auto max-h-[85vh] overflow-y-auto"
          >
            {/* Header Modal */}
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={() => onToggleFav(product)}
                className={`p-3 rounded-full transition-colors ${
                  isFav
                    ? "bg-yellow-50 text-yellow-500 dark:bg-yellow-900/20"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                <Star size={24} fill={isFav ? "currentColor" : "none"} />
              </button>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto self-center opacity-50" />
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Image & Infos */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-48 h-48 flex items-center justify-center mb-4 relative">
                {/* Lueur derrière l'image */}
                <div className="absolute inset-0 bg-radial-gradient from-teal-500/10 to-transparent blur-2xl rounded-full" />
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain drop-shadow-xl relative z-10"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>

              <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center leading-tight">
                {product.name}
              </h2>
              <p className="text-teal-600 dark:text-teal-400 font-black text-3xl mt-2 tracking-tight">
                {formatPrice(product.price_cents)}
              </p>
            </div>

            {/* Cross-Selling */}
            {recommendations.length > 0 && (
              <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Flame size={14} className="text-orange-500" /> Souvent acheté
                  avec
                </h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => onAdd(rec)}
                      className="flex-shrink-0 w-28 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center cursor-pointer active:scale-95 transition-transform"
                    >
                      <img
                        src={rec.image}
                        className="w-12 h-12 mx-auto object-contain mb-2"
                        alt={rec.name}
                      />
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full">
                        {rec.name}
                      </p>
                      <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                        + {formatPrice(rec.price_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <Button
              onClick={() => onAdd(product)}
              className="w-full text-lg py-4 shadow-xl shadow-teal-500/20"
            >
              <ShoppingCart size={20} /> AJOUTER AU PANIER
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
