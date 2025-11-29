import React, { useState, useRef } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Gift, Dices, Sparkles, Ticket } from "lucide-react";
import Button from "../../ui/Button.jsx";
import { generateToken } from "../../lib/token.js";

const COST_ROULETTE = 5;
const COST_STD = 10;
const COST_REDBULL = 12;

// --- CONFIGURATION ROULETTE PIXEL PERFECT ---
const CARD_WIDTH = 128; // px
const GAP = 8; // px
const ITEM_FULL_WIDTH = CARD_WIDTH + GAP;
const WINNER_INDEX = 30; // On arrête toujours au 30ème item
const TOTAL_ITEMS = 35;

// Fonction Helper pure pour le tirage aléatoire pondéré
const pickRandomWeighted = (pool) => {
  if (!pool || pool.length === 0) return null;
  // On inverse le prix pour le poids : moins c'est cher, plus c'est probable
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

export default function LoyaltyScreen({
  user,
  products,
  db,
  onGoToPass,
  notify,
  onConfirm,
}) {
  const [spinning, setSpinning] = useState(false);
  const [rouletteItems, setRouletteItems] = useState([]);
  const containerRef = useRef(null);
  const stripRef = useRef(null);

  const spin = async () => {
    if (spinning) return;
    if ((user?.points || 0) < COST_ROULETTE) {
      return notify("Pas assez de points !", "error");
    }

    const pool = (products || []).filter((p) => p.is_available !== false);
    if (!pool.length) return notify("Stock vide !", "error");

    setSpinning(true); // Bloque le bouton immédiatement

    try {
      // 1. Déterminer le gagnant à l'avance
      const winnerItem = pickRandomWeighted(pool);

      // 2. Préparer la transaction (Batch) pour atomicité
      // On déduit les points ET on crée le coupon EN MÊME TEMPS avant l'animation.
      // Si l'app plante pendant l'animation, le coupon sera déjà dans "Mon Pass".
      const batch = writeBatch(db);

      // A. Déduction des points
      const userRef = doc(db, "users", user.uid);
      const newPoints = user.points - COST_ROULETTE;
      batch.update(userRef, { points: newPoints });

      // B. Création du coupon
      // On génère l'ID manuellement pour pouvoir l'utiliser dans le batch
      const couponRef = doc(collection(db, "orders"));
      const couponData = {
        user_id: user.uid,
        items: [
          { ...winnerItem, qty: 1, price_cents: 0, name: `${winnerItem.name}` },
        ],
        total_cents: 0,
        status: "reward_pending",
        payment_method: "loyalty",
        source: "Roulette",
        created_at: serverTimestamp(),
        qr_token: generateToken(),
      };
      batch.set(couponRef, couponData);

      // C. Exécution de la sauvegarde
      await batch.commit();

      // 3. Construire la bande visuelle pour l'animation
      const strip = [];
      for (let i = 0; i < TOTAL_ITEMS; i++) {
        // Le gagnant est FORCÉ à l'index WINNER_INDEX
        if (i === WINNER_INDEX) strip.push({ ...winnerItem, isWinner: true });
        else strip.push({ ...pickRandomWeighted(pool), isWinner: false });
      }
      setRouletteItems(strip);

      // 4. Lancer l'animation (Logique purement visuelle maintenant)
      if (stripRef.current) {
        stripRef.current.style.transition = "none";
        stripRef.current.style.transform = "translateX(0px)";
      }

      // Hack pour forcer le reflow avant de lancer la transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (stripRef.current && containerRef.current) {
            const containerW = containerRef.current.clientWidth;
            // Centre carte gagnante = (WINNER_INDEX * ITEM_FULL_WIDTH) + (CARD_WIDTH / 2)
            const centerTarget =
              WINNER_INDEX * ITEM_FULL_WIDTH + CARD_WIDTH / 2;
            const translateX = centerTarget - containerW / 2;

            // Petit décalage aléatoire réaliste (+/- 20px)
            const jitter = Math.floor(Math.random() * 40) - 20;

            stripRef.current.style.transition =
              "transform 5s cubic-bezier(0.15, 0.85, 0.25, 1)"; // Easing réaliste
            stripRef.current.style.transform = `translateX(-${
              translateX + jitter
            }px)`;
          }
        });
      });

      // 5. Fin de l'animation : Affichage du résultat
      setTimeout(() => {
        setSpinning(false);
        onConfirm({
          title: "C'est gagné ! 🎉",
          text: `Tu as remporté : ${winnerItem.name}. Ton coupon est déjà sécurisé dans ton Pass.`,
          confirmText: "Voir mon Pass",
          cancelText: "Rejouer",
          onOk: onGoToPass,
        });
      }, 5500);
    } catch (error) {
      console.error("Erreur roulette:", error);
      setSpinning(false);
      notify("Erreur de connexion. Réessaie.", "error");
    }
  };

  const buyDirect = async (product) => {
    const isRedBull = (product.name || "").toLowerCase().includes("red bull");
    const cost = isRedBull ? COST_REDBULL : COST_STD;

    if ((user?.points || 0) < cost)
      return notify("Points insuffisants", "error");

    onConfirm({
      title: "Échanger des points",
      text: `Acheter ${product.name} pour ${cost} points ?`,
      onOk: async () => {
        try {
          const batch = writeBatch(db);

          const userRef = doc(db, "users", user.uid);
          batch.update(userRef, { points: user.points - cost });

          const couponRef = doc(collection(db, "orders"));
          const couponData = {
            user_id: user.uid,
            items: [
              { ...product, qty: 1, price_cents: 0, name: `${product.name}` },
            ],
            total_cents: 0,
            status: "reward_pending",
            payment_method: "loyalty",
            source: "Boutique",
            created_at: serverTimestamp(),
            qr_token: generateToken(),
          };
          batch.set(couponRef, couponData);

          await batch.commit();
          notify("Coupon ajouté au Pass !", "success");
        } catch (e) {
          notify("Erreur lors de l'achat.", "error");
        }
      },
    });
  };

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

      {/* ZONE ROULETTE */}
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
          {/* Flèche fixe au centre */}
          <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-30 drop-shadow-lg">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-yellow-500"></div>
          </div>

          <div
            ref={containerRef}
            className="h-40 bg-[#151515] rounded-2xl border-4 border-gray-800 shadow-inner overflow-hidden relative flex items-center"
          >
            {/* Ligne centrale jaune */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-20 -translate-x-1/2 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>

            <div
              ref={stripRef}
              className="flex gap-2 will-change-transform pl-[50%]"
              style={{ transform: "translateX(0px)" }}
            >
              {(spinning || rouletteItems.length > 0
                ? rouletteItems
                : products.slice(0, 10)
              ).map((p, i) => {
                // Design carte
                const isRare = p.price_cents > 140;
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-32 h-32 bg-white rounded-lg p-2 flex flex-col items-center justify-center border-2 ${
                      isRare
                        ? "border-yellow-400 shadow-[inset_0_0_10px_rgba(250,204,21,0.2)]"
                        : "border-gray-600"
                    }`}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-16 w-16 object-contain mb-2"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    <div className="text-[10px] font-bold text-center leading-tight line-clamp-2 text-gray-800">
                      {p.name}
                    </div>
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
              ? "grayscale opacity-50 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
          }`}
        >
          {spinning ? "..." : "LANCER LA ROULETTE"}
        </Button>
      </div>

      {/* ZONE BOUTIQUE DIRECTE */}
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
                      alt={p.name}
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
