import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
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

const normalizePoints = (value) => {
  const num =
    typeof value === "string"
      ? Number(value.replace(",", ".").trim())
      : Number(value);
  return Number.isFinite(num) ? num : 0;
};

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
  const [animKey, setAnimKey] = useState(0);
  const [animConfig, setAnimConfig] = useState({ distance: 0, duration: 5500 });

  const containerRef = useRef(null);
  const onConfirmRef = useRef(onConfirm);
  const onGoToPassRef = useRef(onGoToPass);
  const winnerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const animDoneRef = useRef(false);
  const txDoneRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onGoToPassRef.current = onGoToPass;
  }, [onConfirm, onGoToPass]);

  useEffect(() => () => finishTimerRef.current && clearTimeout(finishTimerRef.current), []);

  const maybeFinish = () => {
    if (finishedRef.current) return;
    if (!animDoneRef.current || !txDoneRef.current) return;
    finishedRef.current = true;
    setSpinning(false);

    const currentWinner = winnerRef.current;
    if (onConfirmRef.current && currentWinner) {
      onConfirmRef.current({
        title: "C'est gagné !",
        text: `Tu as remporté : ${currentWinner.name}.`,
        confirmText: "Voir mon Pass",
        cancelText: "Rejouer",
        onOk: () => onGoToPassRef.current && onGoToPassRef.current(),
      });
    }
  };

  const handleAnimationEnd = () => {
    animDoneRef.current = true;
    maybeFinish();
  };

  const spin = async () => {
    if (spinning) return;
    if (normalizePoints(user?.points) < COST_ROULETTE)
      return notify("Pas assez de points !", "error");
    const pool = (products || []).filter((p) => p.is_available !== false);
    if (!pool.length) return notify("Stock vide !", "error");

    setSpinning(true);
    finishedRef.current = false;
    animDoneRef.current = false;
    txDoneRef.current = false;

    try {
      const winnerItem = pickRandomWeighted(pool);
      if (!winnerItem) throw new Error("Aucun lot disponible");
      winnerRef.current = winnerItem;

      const strip = [];
      for (let i = 0; i < TOTAL_ITEMS; i++) {
        strip.push(
          i === WINNER_INDEX
            ? { ...winnerItem, isWinner: true }
            : { ...pickRandomWeighted(pool), isWinner: false }
        );
      }
      setRouletteItems(strip);

      const containerW = containerRef.current?.clientWidth || 320;
      const centerTarget = WINNER_INDEX * ITEM_FULL_WIDTH + CARD_WIDTH / 2;
      const distance =
        centerTarget - containerW / 2 + (Math.floor(Math.random() * 40) - 20);
      setAnimConfig({ distance, duration: 5500 });
      setAnimKey((k) => k + 1);

      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        animDoneRef.current = true;
        maybeFinish();
      }, 6000);

      const userRef = doc(db, "users", user.uid);
      const couponRef = doc(collection(db, "orders"));

      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        const currentPoints = normalizePoints(userSnap.data()?.points);
        if (currentPoints < COST_ROULETTE) throw new Error("POINTS_LOW");
        const nextPoints =
          Math.round((currentPoints - COST_ROULETTE) * 100) / 100;

        tx.update(userRef, { points: nextPoints });
        tx.set(couponRef, {
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
      });

      txDoneRef.current = true;
      maybeFinish();
    } catch (error) {
      console.error("Roulette error", error);
      finishedRef.current = true;
      setSpinning(false);
      notify(
        error?.message === "POINTS_LOW"
          ? "Pas assez de points !"
          : `Erreur technique${error?.message ? ` : ${error.message}` : ""}.`,
        "error"
      );
    }
  };

  const stripStyle = spinning
    ? {
        "--spin-distance": `${animConfig.distance}px`,
        animationName: "roulette-spin",
        animationDuration: `${animConfig.duration}ms`,
        animationTimingFunction: "cubic-bezier(0.15, 0.85, 0.25, 1)",
        animationFillMode: "forwards",
        animationIterationCount: 1,
        filter: "blur(0.4px)",
      }
    : { transform: "translateX(0px)" };

  return (
    <div className="mb-12">
      <style>
        {`
          @keyframes roulette-spin {
            to { transform: translateX(calc(-1 * var(--spin-distance, 0px))); }
          }
          @keyframes shimmer {
            0% { opacity: 0.05; transform: translateX(-50%); }
            50% { opacity: 0.25; transform: translateX(50%); }
            100% { opacity: 0.05; transform: translateX(150%); }
          }
        `}
      </style>

      <div className="bg-gradient-to-br from-slate-950 via-indigo-900 to-slate-900 rounded-3xl p-4 shadow-2xl border border-indigo-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.25),transparent_35%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_40%,rgba(255,255,255,0.05)_80%)] animate-[shimmer_4s_linear_infinite] opacity-40 pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-700/40 border border-indigo-300/30 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Dices className="text-indigo-100" size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/80 font-semibold">
                Case Opening
              </p>
              <h2 className="text-xl font-black text-white">Booster mystère</h2>
            </div>
          </div>
          <span className="bg-emerald-500/20 text-emerald-100 text-xs font-black px-3 py-1 rounded-full border border-emerald-400/40 shadow-inner shadow-emerald-500/30">
            {COST_ROULETTE} pts
          </span>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 blur-3xl bg-indigo-500/10"></div>
          <div className="relative">
            <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-30 drop-shadow-lg">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-amber-400"></div>
            </div>
            <div
              ref={containerRef}
              className="h-40 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-indigo-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.45)] overflow-hidden relative flex items-center"
            >
              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-amber-400 z-20 -translate-x-1/2 shadow-[0_0_20px_rgba(251,191,36,0.8)]"></div>
              <div
                key={animKey}
                className="flex gap-2 pl-[50%] will-change-transform"
                style={stripStyle}
                onAnimationEnd={handleAnimationEnd}
              >
                {(rouletteItems.length > 0
                  ? rouletteItems
                  : (products || []).slice(0, 10)
                ).map((p, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-32 h-32 bg-white/95 rounded-xl p-3 flex flex-col items-center justify-center border-2 ${
                      p.price_cents > 140
                        ? "border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.45)]"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-16 w-16 object-contain mb-2"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    <div className="text-[11px] font-bold text-center leading-tight line-clamp-2 text-slate-800">
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={spin}
          disabled={spinning || normalizePoints(user?.points) < COST_ROULETTE}
          className={`w-full py-4 text-lg font-black shadow-xl rounded-2xl ${
            spinning
              ? "bg-slate-600 text-slate-200 opacity-70"
              : "bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white"
          }`}
        >
          {spinning ? "OUVERTURE..." : "LANCER L'OUVERTURE"}
        </Button>
      </div>
    </div>
  );
}
