import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Dices } from "lucide-react";
import Button from "../../../ui/Button.jsx";
import { generateToken } from "../../../lib/token.js";

const COST_ROULETTE = 5;
const CARD_WIDTH = 128;
const GAP = 8;
const ITEM_FULL_WIDTH = CARD_WIDTH + GAP;
const WINNER_INDEX = 30;
const TOTAL_ITEMS = 35;

const pickRandomWeighted = (pool) => {
  if (!pool || pool.length === 0) return null;
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

export default function RouletteGame({
  user,
  products,
  db,
  notify,
  onConfirm,
  onGoToPass,
}) {
  const [spinning, setSpinning] = useState(false);
  const [rouletteItems, setRouletteItems] = useState([]);
  const [winner, setWinner] = useState(null);
  const containerRef = useRef(null);
  const stripRef = useRef(null);
  const onConfirmRef = useRef(onConfirm);
  const onGoToPassRef = useRef(onGoToPass);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onGoToPassRef.current = onGoToPass;
  }, [onConfirm, onGoToPass]);

  useEffect(() => {
    if (!spinning || rouletteItems.length === 0 || !winner) return;
    const strip = stripRef.current;
    if (!strip) return;

    strip.style.transition = "none";
    strip.style.transform = "translateX(0px)";
    // eslint-disable-next-line no-unused-expressions
    strip.offsetHeight;

    const containerW = containerRef.current?.clientWidth || 0;
    const centerTarget = WINNER_INDEX * ITEM_FULL_WIDTH + CARD_WIDTH / 2;
    const translateX = centerTarget - containerW / 2;
    const jitter = Math.floor(Math.random() * 40) - 20;

    const animTimer = setTimeout(() => {
      strip.style.transition =
        "transform 5.5s cubic-bezier(0.15, 0.85, 0.25, 1)";
      strip.style.transform = `translateX(-${translateX + jitter}px)`;
    }, 50);

    const finishTimer = setTimeout(() => {
      setSpinning(false);
      if (onConfirmRef.current) {
        onConfirmRef.current({
          title: "C'est gagné ! 🎉",
          text: `Tu as remporté : ${winner.name}.`,
          confirmText: "Voir mon Pass",
          cancelText: "Rejouer",
          onOk: () => onGoToPassRef.current && onGoToPassRef.current(),
        });
      }
    }, 6000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(finishTimer);
    };
  }, [spinning, rouletteItems, winner]);

  const spin = async () => {
    if (spinning) return;
    if ((user?.points || 0) < COST_ROULETTE)
      return notify("Pas assez de points !", "error");
    const pool = (products || []).filter((p) => p.is_available !== false);
    if (!pool.length) return notify("Stock vide !", "error");

    setSpinning(true);
    setRouletteItems([]);
    setWinner(null);

    try {
      const winnerItem = pickRandomWeighted(pool);
      setWinner(winnerItem);

      const batch = writeBatch(db);
      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, { points: user.points - COST_ROULETTE });

      const couponRef = doc(collection(db, "orders"));
      batch.set(couponRef, {
        user_id: user.uid,
        items: [
          { ...winnerItem, qty: 1, price_cents: 0, name: winnerItem.name },
        ],
        total_cents: 0,
        status: "reward_pending",
        payment_method: "loyalty",
        source: "Roulette",
        created_at: serverTimestamp(),
        qr_token: generateToken(),
      });
      await batch.commit();

      const strip = [];
      for (let i = 0; i < TOTAL_ITEMS; i++) {
        strip.push(
          i === WINNER_INDEX
            ? { ...winnerItem, isWinner: true }
            : { ...pickRandomWeighted(pool), isWinner: false }
        );
      }
      setRouletteItems(strip);
    } catch (error) {
      console.error(error);
      setSpinning(false);
      notify("Erreur technique.", "error");
    }
  };

  return (
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
        <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-30 drop-shadow-lg">
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-yellow-500"></div>
        </div>
        <div
          ref={containerRef}
          className="h-40 bg-[#151515] rounded-2xl border-4 border-gray-800 shadow-inner overflow-hidden relative flex items-center"
        >
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-20 -translate-x-1/2 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
          <div
            ref={stripRef}
            className="flex gap-2 will-change-transform pl-[50%]"
          >
            {(rouletteItems.length > 0
              ? rouletteItems
              : products.slice(0, 10)
            ).map((p, i) => (
              <div
                key={i}
                className={`flex-shrink-0 w-32 h-32 bg-white rounded-lg p-2 flex flex-col items-center justify-center border-2 ${
                  p.price_cents > 140 ? "border-yellow-400" : "border-gray-600"
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
            ))}
          </div>
        </div>
      </div>
      <Button
        onClick={spin}
        disabled={spinning || (user?.points || 0) < COST_ROULETTE}
        className={`w-full mt-4 py-4 text-lg font-black shadow-lg ${
          spinning
            ? "grayscale opacity-50"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {spinning ? "..." : "LANCER LA ROULETTE"}
      </Button>
    </div>
  );
}
