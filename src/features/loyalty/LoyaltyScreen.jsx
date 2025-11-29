import React, { useState, useRef } from "react";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { Gift, Dices, Sparkles, Ticket } from "lucide-react";
import Button from "../../ui/Button.jsx";
import { generateToken } from "../../lib/token.js"; // Import du générateur propre

const COST_ROULETTE = 5;
const COST_STD = 10;
const COST_REDBULL = 12;

const CARD_WIDTH = 128;
const GAP = 8;
const ITEM_SIZE = CARD_WIDTH + GAP;
const WINNER_INDEX = 35;
const TOTAL_ITEMS = 40;

// Fonction pure (helpers) en dehors du composant pour éviter les erreurs de linter
const pickRandomWeighted = (pool) => {
  const itemsWithWeight = pool.map((p) => ({
    ...p,
    weight: 1000 / (Number(p.price_cents) || 100),
  }));
  const totalWeight = itemsWithWeight.reduce(
    (sum, item) => sum + item.weight,
    0
  );
  let random = Math.random() * totalWeight;
  for (const item of itemsWithWeight) {
    if (random < item.weight) return item;
    random -= item.weight;
  }
  return pool[0];
};

export default function LoyaltyScreen({ user, products, db, onGoToPass }) {
  const [spinning, setSpinning] = useState(false);
  const [rouletteItems, setRouletteItems] = useState([]);

  const stripRef = useRef(null);
  const containerRef = useRef(null);

  const spin = async () => {
    if (spinning) return;
    if ((user?.points || 0) < COST_ROULETTE)
      return alert("Pas assez de points !");

    const pool = (products || []).filter((p) => p.is_available !== false);
    if (!pool.length) return alert("Stock vide !");

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { points: user.points - COST_ROULETTE });

    const winnerItem = pickRandomWeighted(pool);

    const strip = [];
    for (let i = 0; i < TOTAL_ITEMS; i++) {
      if (i === WINNER_INDEX) {
        strip.push({ ...winnerItem, isWinner: true });
      } else {
        strip.push({ ...pickRandomWeighted(pool), isWinner: false });
      }
    }
    setRouletteItems(strip);
    setSpinning(true);

    if (stripRef.current) {
      stripRef.current.style.transition = "none";
      stripRef.current.style.transform = "translateX(0px)";
    }

    setTimeout(() => {
      if (stripRef.current && containerRef.current) {
        const containerW = containerRef.current.clientWidth;
        const centerOfWinner = WINNER_INDEX * ITEM_SIZE + CARD_WIDTH / 2;
        const scrollAmount = centerOfWinner - containerW / 2;
        const randomOffset = Math.floor(Math.random() * 20) - 10;

        stripRef.current.style.transition =
          "transform 5s cubic-bezier(0.15, 0.9, 0.25, 1)";
        stripRef.current.style.transform = `translateX(-${
          scrollAmount + randomOffset
        }px)`;
      }
    }, 100);

    setTimeout(async () => {
      await createCoupon(winnerItem, "Roulette");
      setSpinning(false);
      if (
        confirm(
          `GAGNÉ : ${winnerItem.name} !\n\nTon coupon a été généré. Veux-tu l'afficher maintenant ?`
        )
      ) {
        onGoToPass();
      }
    }, 5500);
  };

  const buyDirect = async (product) => {
    const isRedBull = (product.name || "").toLowerCase().includes("red bull");
    const cost = isRedBull ? COST_REDBULL : COST_STD;

    if ((user?.points || 0) < cost) return alert("Pas assez de points !");
    if (!confirm(`Échanger ${cost} points contre : ${product.name} ?`)) return;

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { points: user.points - cost });

    await createCoupon(product, "Boutique Points");
    if (confirm("Coupon généré ! Voir mon coupon ?")) {
      onGoToPass();
    }
  };

  const createCoupon = async (item, source) => {
    const couponData = {
      user_id: user.uid,
      items: [{ ...item, qty: 1, price_cents: 0, name: item.name }],
      total_cents: 0,
      status: "reward_pending",
      payment_method: "loyalty",
      source: source,
      created_at: serverTimestamp(),
      qr_token: generateToken(), // Utilisation du helper propre
    };
    await addDoc(collection(db, "orders"), couponData);
  };

  return (
    <div className="p-4 pb-24 bg-gray-50 min-h-full">
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
        <Sparkles className="absolute right-[-10px] bottom-[-10px] text-purple-400/20 w-32 h-32" />
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
            <Dices className="text-indigo-600" /> Case Opening
          </h2>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-lg">
            {COST_ROULETTE} pts
          </span>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-30">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-gray-800 filter drop-shadow-md"></div>
          </div>
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 z-30">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-gray-800 filter drop-shadow-md"></div>
          </div>

          <div
            ref={containerRef}
            className="h-44 bg-[#1a1a1a] rounded-2xl border-4 border-gray-800 shadow-inner overflow-hidden relative flex items-center"
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500/30 z-20 -translate-x-1/2"></div>

            <div
              ref={stripRef}
              className="flex gap-2 pl-[50%] will-change-transform"
              style={{ transform: "translateX(0px)" }}
            >
              {(spinning || rouletteItems.length > 0
                ? rouletteItems
                : products.slice(0, 10)
              ).map((p, i) => {
                const isRare = p.price_cents > 140;
                const borderColor = isRare
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-gray-700 bg-white";

                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-32 h-32 rounded-xl border-2 ${borderColor} p-2 flex flex-col items-center justify-center relative overflow-hidden`}
                  >
                    <img
                      src={p.image}
                      className="h-20 w-20 object-contain z-10"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    {isRare && (
                      <div className="absolute inset-0 bg-yellow-400/10 z-0 animate-pulse"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Button
          onClick={spin}
          disabled={spinning || (user?.points || 0) < COST_ROULETTE}
          className={`w-full mt-4 py-4 text-lg font-black shadow-lg ${
            spinning
              ? "grayscale opacity-80 cursor-wait"
              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
          }`}
        >
          {spinning ? "TIRAGE EN COURS..." : "LANCER LA ROULETTE"}
        </Button>
      </div>

      <div>
        <h2 className="font-black text-xl text-gray-800 mb-4 flex items-center gap-2 px-1">
          <Ticket className="text-teal-600" /> Boutique
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
                  className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col relative group"
                >
                  <div className="absolute top-2 right-2 bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-1 rounded-full">
                    {cost} pts
                  </div>

                  <div className="h-24 w-full flex items-center justify-center mb-2">
                    <img
                      src={p.image}
                      className="h-20 w-20 object-contain transition-transform group-hover:scale-110"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  </div>

                  <div className="font-bold text-xs leading-tight mb-3 line-clamp-1 text-gray-800">
                    {p.name}
                  </div>

                  <button
                    onClick={() => buyDirect(p)}
                    disabled={!canBuy}
                    className={`mt-auto w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                      canBuy
                        ? "bg-teal-600 text-white shadow-md shadow-teal-100 hover:bg-teal-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    OBTENIR
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
