import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Star, Flame } from "lucide-react";
// CORRECTION DES CHEMINS D'IMPORT ICI :
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

  // Intelligence : Recommandation (Cross-selling)
  // Si c'est un snack, propose une boisson, et inversement.
  const recommendations = useMemo(() => {
    if (!allProducts) return [];
    const isDrink = product.category === "Boissons";
    const targetCat = isDrink ? "Snacks" : "Boissons";
    return allProducts
      .filter((p) => p.category === targetCat && p.is_available !== false)
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
                    ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                <Star size={24} fill={isFav ? "currentColor" : "none"} />
              </button>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto self-center" />
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Image & Infos */}
            <div className="flex flex-col items-center mb-6">
              <img
                src={product.image}
                alt={product.name}
                className="w-48 h-48 object-contain drop-shadow-xl mb-4"
              />
              <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center leading-tight">
                {product.name}
              </h2>
              <p className="text-teal-600 dark:text-teal-400 font-black text-xl mt-2">
                {formatPrice(product.price_cents)}
              </p>
            </div>

            {/* Cross-Selling */}
            {recommendations.length > 0 && (
              <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Flame size={14} className="text-orange-500" /> Souvent acheté
                  avec
                </h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => onAdd(rec)} // Quick add recommendation
                      className="flex-shrink-0 w-24 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center cursor-pointer active:scale-95 transition-transform"
                    >
                      <img
                        src={rec.image}
                        className="w-12 h-12 mx-auto object-contain mb-1"
                        alt={rec.name}
                      />
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                        {rec.name}
                      </p>
                      <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                        + {formatPrice(rec.price_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <Button onClick={() => onAdd(product)} className="w-full text-lg">
              <ShoppingCart size={20} /> AJOUTER AU PANIER
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
