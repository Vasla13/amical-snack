import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Dices, Trophy, Loader2, Sparkles, ChevronDown } from "lucide-react";
import confetti from "canvas-confetti";
import Button from "../../../ui/Button.jsx";
import { generateToken } from "../../../lib/token.js";

// MODIFICATION ICI : Coût à 10 points
const COST = 10;

const ITEM_WIDTH = 120;
const ITEM_HEIGHT = 140;
const GAP = 12;
const TOTAL_ITEMS = 80;
const WINNER_INDEX = 60;
const SPIN_SECONDS = 7;
const EASING = "cubic-bezier(0.15, 0.85, 0.25, 1)";

// ... Reste du fichier inchangé ...
// Pour gagner de la place, je ne remets pas tout le contenu identique,
// assurez-vous juste de changer "const COST = 5;" en "const COST = 10;"
// et de garder le reste du fichier tel quel.

// Voici tout le code pour éviter les erreurs de copier-coller partiel :
function normalizePoints(points) {
  return typeof points === "number" && !Number.isNaN(points) ? points : 0;
}

function getRandomWeightedItem(items) {
  const clean = (items || []).filter((it) => it && it.id);
  if (clean.length === 0) return null;
  const weights = clean.map((it) =>
    typeof it.probability === "number" && it.probability > 0
      ? it.probability
      : 1
  );
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < clean.length; i++) {
    r -= weights[i];
    if (r <= 0) return clean[i];
  }
  return clean[clean.length - 1];
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );
}

function formatPrice(item) {
  if (!item) return null;
  if (typeof item.priceText === "string" && item.priceText.trim())
    return item.priceText.trim();
  if (typeof item.price === "number" && Number.isFinite(item.price)) {
    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(item.price);
    } catch {
      return `${item.price} €`;
    }
  }
  return null;
}

export default function RouletteGame({
  user,
  products = [],
  db,
  notify,
  onConfirm,
  onGoToPass,
}) {
  const [gameState, setGameState] = useState("idle");
  const [strip, setStrip] = useState([]);
  const containerRef = useRef(null);
  const stripRef = useRef(null);
  const winnerRef = useRef(null);
  const animationRef = useRef(null);
  const mountedRef = useRef(false);

  const availableProducts = useMemo(
    () => (products || []).filter((p) => p && p.id && p.is_available !== false),
    [products]
  );

  const canPlay =
    normalizePoints(user?.points) >= COST &&
    availableProducts.length > 0 &&
    (gameState === "idle" || gameState === "won");

  const cancelAnim = () => {
    if (animationRef.current) {
      try {
        animationRef.current.cancel();
      } catch {
        // ignore
      }
      animationRef.current = null;
    }
  };

  const resetPosition = () => {
    const el = stripRef.current;
    if (!el) return;
    cancelAnim();
    el.style.transition = "none";
    el.style.transform = "translate3d(0px,0px,0px)";
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnim();
    };
  }, []);

  useEffect(() => {
    if (availableProducts.length > 0 && strip.length === 0) {
      setStrip(
        Array.from({ length: 15 }, () =>
          getRandomWeightedItem(availableProducts)
        )
      );
      resetPosition();
    }
  }, [availableProducts.length]);

  const fireConfetti = () => {
    const end = Date.now() + 1000;
    const colors = ["#fbbf24", "#818cf8", "#34d399"];
    (function frame() {
      if (!mountedRef.current) return;
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const processTransaction = async (item) => {
    if (!db) throw new Error("DB_UNDEFINED");
    if (!user?.uid) throw new Error("USER_UID_MISSING");
    if (!item?.id) throw new Error("ITEM_MISSING");

    const userRef = doc(db, "users", user.uid);
    const orderRef = doc(collection(db, "orders"));
    const token = generateToken();

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error("USER_NOT_FOUND");
      const currentPoints = normalizePoints(snap.data()?.points);
      if (currentPoints < COST) throw new Error("POINTS_LOW");

      tx.update(userRef, {
        points: currentPoints - COST,
        lastUpdated: serverTimestamp(),
      });

      tx.set(orderRef, {
        user_id: user.uid,
        items: [{ ...item, qty: 1, price_cents: 0 }],
        total_cents: 0,
        status: "reward_pending",
        payment_method: "roulette",
        qr_token: token,
        created_at: serverTimestamp(),
        source: "Roulette",
      });
    });

    return { token, orderId: orderRef.id };
  };

  const showWinModal = (wonItem) => {
    const price = formatPrice(wonItem);
    onConfirm?.({
      title: "🎉 C'EST GAGNÉ !",
      text: (
        <div className="flex flex-col items-center gap-4 py-4 animate-in zoom-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 animate-pulse rounded-full" />
            <div className="relative z-10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 rounded-3xl border border-slate-700 shadow-2xl">
              {wonItem?.image ? (
                <img
                  src={wonItem.image}
                  className="w-32 h-32 object-contain drop-shadow-xl"
                  alt={wonItem.name}
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                  <Trophy size={48} />
                </div>
              )}
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-teal-600 text-xs font-black uppercase tracking-widest">
              Félicitations
            </p>
            <p className="text-2xl font-black text-slate-800 leading-tight">
              {wonItem?.name}
            </p>
            {price && (
              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                  Valeur : {price}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
      confirmText: "VOIR MON CADEAU",
      cancelText: "REJOUER",
      onOk: () => onGoToPass?.(),
      onCancel: () => {
        setGameState("idle");
        winnerRef.current = null;
        setStrip(
          Array.from({ length: 15 }, () =>
            getRandomWeightedItem(availableProducts)
          )
        );
        resetPosition();
      },
    });
  };

  const handleSpin = async () => {
    if (!user?.uid) return notify?.("Utilisateur non connecté", "error");
    if (!db) return notify?.("Database non disponible", "error");
    if (!canPlay) return;

    const userPoints = normalizePoints(user?.points);
    if (userPoints < COST) return notify?.("Points insuffisants !", "error");
    if (availableProducts.length === 0)
      return notify?.("Stock vide !", "error");
    if (gameState === "spinning" || gameState === "saving") return;

    const winnerItem = getRandomWeightedItem(availableProducts);
    if (!winnerItem) return notify?.("Stock vide !", "error");
    winnerRef.current = winnerItem;

    const gameStrip = Array.from({ length: TOTAL_ITEMS }, () =>
      getRandomWeightedItem(availableProducts)
    );
    gameStrip[WINNER_INDEX] = winnerItem;

    setStrip(gameStrip);
    setGameState("spinning");

    await nextFrame();
    await nextFrame();
    if (!mountedRef.current) return;

    const cont = containerRef.current;
    const el = stripRef.current;
    if (!cont || !el) {
      setGameState("idle");
      return;
    }

    resetPosition();
    await nextFrame();

    const containerWidth = cont.clientWidth || 0;
    if (containerWidth <= 0) {
      setGameState("idle");
      return;
    }

    const offset = containerWidth / 2 - ITEM_WIDTH / 2;
    const targetLeft = WINNER_INDEX * (ITEM_WIDTH + GAP);
    const randomShift = Math.floor(Math.random() * 24) - 12;
    const finalX = -(targetLeft - offset + randomShift);

    if (prefersReducedMotion()) {
      el.style.transform = `translate3d(${finalX}px,0,0)`;
    } else if (typeof el.animate === "function") {
      cancelAnim();
      const anim = el.animate(
        [
          { transform: "translate3d(0px,0px,0px)" },
          { transform: `translate3d(${finalX}px,0,0)` },
        ],
        { duration: SPIN_SECONDS * 1000, easing: EASING, fill: "forwards" }
      );
      animationRef.current = anim;
      try {
        await anim.finished;
      } catch {
        return;
      } finally {
        animationRef.current = null;
      }
    } else {
      el.style.transition = `transform ${SPIN_SECONDS}s ${EASING}`;
      el.style.transform = `translate3d(${finalX}px,0,0)`;
      await new Promise((r) => setTimeout(r, SPIN_SECONDS * 1000));
    }

    if (!mountedRef.current) return;

    setGameState("saving");
    try {
      await processTransaction(winnerItem);
    } catch (err) {
      setGameState("idle");
      return notify?.(
        err?.message === "POINTS_LOW"
          ? "Points insuffisants"
          : "Erreur technique",
        "error"
      );
    }

    if (!mountedRef.current) return;

    setGameState("won");
    fireConfetti();
    setTimeout(() => showWinModal(winnerItem), 800);
  };

  return (
    <div className="mb-10 select-none">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2">
          <Dices className="text-purple-600" size={24} strokeWidth={2.5} />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            Mystery Box
          </span>
        </h2>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
            {COST} pts / tirage
          </span>
        </div>
      </div>

      <div className="relative bg-slate-900 rounded-[2.5rem] p-1.5 shadow-2xl shadow-slate-900/30 overflow-hidden border border-slate-800 ring-4 ring-slate-100 dark:ring-slate-800/50">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none opacity-50"></div>

        <div className="relative z-10 bg-slate-950/80 backdrop-blur-sm rounded-[2rem] border border-slate-800/50 px-0 py-8 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-20" />

          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col justify-between items-center py-2">
            <ChevronDown
              className="text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              size={32}
              strokeWidth={4}
            />
            <ChevronDown
              className="text-yellow-400 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.8)] rotate-180"
              size={32}
              strokeWidth={4}
            />
          </div>

          <div ref={containerRef} className="relative w-full">
            <div
              ref={stripRef}
              className="flex items-center will-change-transform"
              style={{
                gap: `${GAP}px`,
                transform: "translate3d(0px,0px,0px)",
              }}
            >
              {strip.map((item, index) => {
                if (!item) return null;
                const isWon = gameState === "won" && index === WINNER_INDEX;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={[
                      "flex-shrink-0 relative rounded-2xl flex flex-col items-center justify-center transition-all duration-500",
                      "bg-slate-800 border border-slate-700",
                      isWon
                        ? "scale-105 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)] z-10 bg-slate-700"
                        : "",
                    ].join(" ")}
                    style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                  >
                    {isWon && (
                      <div className="absolute inset-0 bg-yellow-400/10 rounded-2xl animate-pulse" />
                    )}
                    <div className="relative mb-3 z-10">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-contain drop-shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-slate-900/50 flex items-center justify-center text-slate-500 text-xs">
                          ?
                        </div>
                      )}
                    </div>
                    <p
                      className={`relative z-10 text-[11px] font-bold text-center leading-tight line-clamp-2 px-2 ${
                        isWon ? "text-yellow-100" : "text-slate-300"
                      }`}
                    >
                      {item.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 pt-2 flex justify-center relative z-20 -mt-4">
          <Button
            onClick={handleSpin}
            disabled={
              !canPlay || gameState === "spinning" || gameState === "saving"
            }
            className={`w-full max-w-xs shadow-2xl transition-all border-t border-white/10 ${
              !canPlay || gameState === "spinning" || gameState === "saving"
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/40"
            }`}
          >
            {gameState === "saving" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} /> Validation...
              </span>
            ) : gameState === "spinning" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} /> Les jeux sont
                faits...
              </span>
            ) : gameState === "won" ? (
              <span className="flex items-center gap-2 text-indigo-100">
                <Trophy size={18} className="text-yellow-400" /> BINGO !
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-300" /> TENTER SA
                CHANCE
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
