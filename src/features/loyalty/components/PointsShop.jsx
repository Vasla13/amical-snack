import React from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Ticket } from "lucide-react";
import { generateToken } from "../../../lib/token.js";

// MODIFICATION ICI : Coût à 15 points pour tout
const COST_STD = 15;
const COST_REDBULL = 15;

const normalizePoints = (value) => {
  const num =
    typeof value === "string"
      ? Number(value.replace(",", ".").trim())
      : Number(value);
  return Number.isFinite(num) ? num : 0;
};

export default function PointsShop({ user, products, db, notify, onConfirm }) {
  const buyDirect = async (product) => {
    const isRedBull = (product.name || "").toLowerCase().includes("red bull");
    const cost = isRedBull ? COST_REDBULL : COST_STD;

    if ((user?.points || 0) < cost)
      return notify("Points insuffisants", "error");

    onConfirm({
      title: "\u00c9changer des points",
      text: `Acheter ${product.name} pour ${cost} points ?`,
      onOk: async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const couponRef = doc(collection(db, "orders"));

          await runTransaction(db, async (tx) => {
            const userSnap = await tx.get(userRef);
            const currentPoints = normalizePoints(userSnap.data()?.points);
            if (currentPoints < cost) throw new Error("POINTS_LOW");
            const nextPoints = Math.round((currentPoints - cost) * 100) / 100;

            tx.update(userRef, { points: nextPoints });
            tx.set(couponRef, {
              user_id: user.uid,
              items: [
                { ...product, qty: 1, price_cents: 0, name: product.name },
              ],
              total_cents: 0,
              status: "reward_pending",
              payment_method: "loyalty",
              source: "Boutique",
              created_at: serverTimestamp(),
              qr_token: generateToken(),
            });
          });

          notify("Coupon ajout\u00e9 au Pass !", "success");
        } catch (error) {
          notify(
            error?.message === "POINTS_LOW"
              ? "Points insuffisants"
              : "Erreur lors de l'achat.",
            "error"
          );
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
            const isRB = (p.name || "").toLowerCase().includes("red bull");
            const cost = isRB ? COST_REDBULL : COST_STD;
            const canBuy = (user?.points || 0) >= cost;

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
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
                <div className="font-bold text-xs leading-tight mb-3 line-clamp-1 text-gray-800 dark:text-gray-200">
                  {p.name}
                </div>
                <button
                  onClick={() => buyDirect(p)}
                  disabled={!canBuy}
                  className={`mt-auto w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                    canBuy
                      ? "bg-teal-600 dark:bg-teal-500 text-white shadow-md hover:bg-teal-700 dark:hover:bg-teal-400"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
                  }`}
                >
                  OBTENIR
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
