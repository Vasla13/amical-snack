import React, { useState } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions"; // Import Cloud Functions
import { Product, UserProfile } from "../../../types";

// COÛT FIXE (Ou dynamique selon votre logique)
const COST_STD = 15;

interface PointsShopProps {
  user: UserProfile | null;
  products: Product[];
  db: any; // On le garde pour compatibilité, mais plus utilisé ici
  notify: (msg: string, type: "success" | "error" | "info") => void;
  onConfirm: (opts: any) => void;
}

export default function PointsShop({
  user,
  products,
  notify,
  onConfirm,
}: PointsShopProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const functions = getFunctions();

  const buyDirect = async (product: Product) => {
    const cost = COST_STD;

    if ((user?.points || 0) < cost)
      return notify("Points insuffisants", "error");

    onConfirm({
      title: "Échanger des points",
      text: `Acheter ${product.name} pour ${cost} points ?`,
      confirmText: "Oui, échanger",
      onOk: async () => {
        try {
          setLoadingId(product.id);

          // APPEL SÉCURISÉ CLOUD FUNCTION
          const buyFn = httpsCallable(functions, "buyShopItem");
          await buyFn({ productId: product.id });

          notify("Cadeau ajouté à ton Pass !", "success");
        } catch (error: any) {
          console.error(error);
          // Gestion fine des erreurs renvoyées par le backend
          const msg = error.message || "Erreur lors de l'achat.";
          if (msg.includes("Points insuffisants"))
            notify("Pas assez de points !", "error");
          else if (msg.includes("unavailable"))
            notify("Produit indisponible.", "error");
          else notify(msg, "error");
        } finally {
          setLoadingId(null);
        }
      },
    });
  };

  return (
    <div>
      <h2 className="font-black text-xl text-gray-800 dark:text-white mb-4 flex items-center gap-2 px-1">
        <Ticket className="text-teal-600 dark:text-teal-400" /> Boutique
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {(products || [])
          .filter((p) => p.is_available !== false)
          .map((p) => {
            const cost = COST_STD;
            const canBuy = (user?.points || 0) >= cost;
            const isLoading = loadingId === p.id;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col relative group"
              >
                <div className="absolute top-2 right-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] font-black px-2 py-1 rounded-full border border-gray-200 dark:border-slate-700">
                  {cost} pts
                </div>
                <div className="h-24 w-full flex items-center justify-center mb-2">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-20 w-20 object-contain transition-transform group-hover:scale-110"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
                <div className="font-bold text-xs leading-tight mb-3 line-clamp-1 text-gray-800 dark:text-gray-200">
                  {p.name}
                </div>
                <button
                  onClick={() => buyDirect(p)}
                  disabled={!canBuy || isLoading || loadingId !== null}
                  className={`mt-auto w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    canBuy
                      ? "bg-teal-600 dark:bg-teal-500 text-white shadow-md hover:bg-teal-700 dark:hover:bg-teal-400"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    "OBTENIR"
                  )}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
