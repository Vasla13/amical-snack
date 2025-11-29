import React, { useState, useRef, useEffect } from "react";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { Gift, Dices, Sparkles } from "lucide-react";
import Button from "../../ui/Button.jsx";

const COST_ROULETTE = 5;
const COST_STD = 10;
const COST_REDBULL = 12;

export default function LoyaltyScreen({ user, products, db }) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rouletteItems, setRouletteItems] = useState([]);

  const stripRef = useRef(null);

  // LOGIQUE PROBABILITÉS
  const pickWinner = () => {
    // 1. Filtrer les produits valides
    const pool = (products || []).filter((p) => p.is_available !== false);

    // SÉCURITÉ : Si aucun produit dispo, on renvoie null
    if (!pool || pool.length === 0) return null;

    // 2. Poids = 1 / prix. (Moins cher = Plus lourd = Plus de chance)
    const itemsWithWeight = pool.map((p) => ({
      ...p,
      weight: 1 / (Number(p.price_cents) || 100), // Sécurité si price_cents est 0 ou null
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

  const spin = async () => {
    if (spinning) return;
    if ((user?.points || 0) < COST_ROULETTE)
      return alert("Pas assez de points !");

    // SÉCURITÉ : Vérifier qu'on a des produits avant de lancer
    const testWinner = pickWinner();
    if (!testWinner)
      return alert(
        "Oups ! La roulette est vide pour le moment (stock épuisé ?)."
      );

    const userRef = doc(db, "users", user.uid);
    const newPoints = user.points - COST_ROULETTE;
    await updateDoc(userRef, { points: newPoints });

    const winItem = pickWinner(); // Vrai gagnant
    setWinner(null);
    setSpinning(true);

    // Générer la bande
    const strip = [];
    for (let i = 0; i < 50; i++) {
      if (i === 45) strip.push(winItem);
      else {
        const randomItem = pickWinner();
        if (randomItem) strip.push(randomItem);
      }
    }
    setRouletteItems(strip);

    setTimeout(() => {
      if (stripRef.current) {
        const scrollAmount = 45 * 136 - stripRef.current.clientWidth / 2 + 64;
        stripRef.current.style.transition =
          "transform 4s cubic-bezier(0.1, 0.9, 0.2, 1)";
        stripRef.current.style.transform = `translateX(-${scrollAmount}px)`;
      }
    }, 50);

    setTimeout(async () => {
      setSpinning(false);
      setWinner(winItem);
      await createFreeOrder(winItem, "Roulette");
    }, 4100);
  };

  const buyDirect = async (product) => {
    const isRedBull = (product.name || "").toLowerCase().includes("red bull");
    const cost = isRedBull ? COST_REDBULL : COST_STD;

    if ((user?.points || 0) < cost) return alert("Pas assez de points !");
    if (!confirm(`Acheter ${product.name} pour ${cost} points ?`)) return;

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { points: user.points - cost });

    await createFreeOrder(product, "Achat Points");
    alert(`Bravo ! ${product.name} commandé.`);
  };

  const createFreeOrder = async (item, method) => {
    const orderData = {
      user_id: user.uid,
      items: [
        {
          ...item,
          qty: 1,
          price_cents: 0,
          name: `${item.name} (CADEAU ${method})`,
        },
      ],
      total_cents: 0,
      status: "paid",
      payment_method: "loyalty_gift",
      created_at: serverTimestamp(),
      qr_token: Math.random().toString(36).substring(2, 6).toUpperCase(),
      points_earned: 0,
    };
    await addDoc(collection(db, "orders"), orderData);
  };

  return (
    <div className="p-4 pb-24 bg-gray-50 min-h-full">
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-6 rounded-3xl text-white shadow-lg mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-xs font-bold text-teal-200 uppercase mb-1">
            Mon Solde
          </div>
          <div className="text-5xl font-black text-yellow-400 flex items-baseline gap-2">
            {Number(user?.points || 0)
              .toFixed(2)
              .replace(/[.,]00$/, "")}
            <span className="text-lg text-white">pts</span>
          </div>
        </div>
        <Sparkles className="absolute right-[-20px] top-[-20px] text-yellow-400/20 w-32 h-32 animate-pulse" />
      </div>

      <div className="mb-8">
        <h2 className="font-black text-xl text-gray-800 mb-2 flex items-center gap-2">
          <Dices className="text-purple-600" /> La Roulette
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Tente ta chance pour <strong>{COST_ROULETTE} pts</strong>. Plus le
          produit est cher, plus il est rare !
        </p>

        <div className="bg-gray-900 rounded-2xl p-1 shadow-inner border-4 border-gray-800 relative overflow-hidden h-40 flex items-center">
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-yellow-500 z-20 -translate-x-1/2 shadow-[0_0_10px_yellow]"></div>

          <div
            ref={stripRef}
            className="flex gap-2 px-[50%] will-change-transform"
            style={{ transform: "translateX(0px)" }}
          >
            {(spinning || rouletteItems.length > 0
              ? rouletteItems
              : products.slice(0, 15)
            ).map((p, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 h-32 bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-gray-700 relative"
              >
                <img
                  src={p.image}
                  className="h-16 w-16 object-contain mb-2"
                  onError={(e) => (e.target.style.display = "none")}
                />
                <div className="text-[10px] font-bold text-center leading-tight line-clamp-2">
                  {p.name}
                </div>
                <div
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    p.price_cents > 150
                      ? "bg-red-500"
                      : p.price_cents > 100
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                />
              </div>
            ))}
          </div>

          {winner && !spinning && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 animate-in fade-in">
              <h3 className="text-white font-black text-xl mb-1 text-center">
                GAGNÉ !
              </h3>
              <img
                src={winner.image}
                className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              />
              <p className="text-yellow-400 font-bold text-sm mt-1">
                {winner.name}
              </p>
              <button
                onClick={() => {
                  setWinner(null);
                  setRouletteItems([]);
                  if (stripRef.current)
                    stripRef.current.style.transform = "translateX(0)";
                }}
                className="mt-2 text-xs bg-white text-black px-3 py-1 rounded-full font-bold hover:scale-105 transition"
              >
                Récupérer
              </button>
            </div>
          )}
        </div>

        <Button
          onClick={spin}
          disabled={spinning || (user?.points || 0) < COST_ROULETTE}
          className={`w-full mt-4 py-4 text-lg shadow-purple-200 ${
            spinning ? "grayscale" : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {spinning ? "Bonne chance..." : `LANCER (${COST_ROULETTE} pts)`}
        </Button>
      </div>

      <div>
        <h2 className="font-black text-xl text-gray-800 mb-2 flex items-center gap-2">
          <Gift className="text-teal-600" /> Échanger
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Achète directement. <strong>{COST_STD} pts</strong> (ou{" "}
          <strong>{COST_REDBULL} pts</strong> pour Red Bull).
        </p>

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
                  className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
                >
                  <div className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded-full mb-2">
                    {cost} pts
                  </div>
                  <img
                    src={p.image}
                    className="h-20 w-20 object-contain mb-2"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <div className="font-bold text-xs leading-tight mb-2 line-clamp-1">
                    {p.name}
                  </div>

                  <button
                    onClick={() => buyDirect(p)}
                    disabled={!canBuy}
                    className={`w-full py-2 rounded-lg text-xs font-black transition-all active:scale-95 ${
                      canBuy
                        ? "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                        : "bg-gray-50 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    ÉCHANGER
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
