import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Dices, Trophy, Loader2, Sparkles } from "lucide-react";
import Button from "../../../ui/Button.jsx";
import { generateToken } from "../../../lib/token.js";

// --- CONFIG ---
const COST = 5;

const ITEM_WIDTH = 120;
const ITEM_HEIGHT = 140;
const GAP = 12;

const TOTAL_ITEMS = 70;
const WINNER_INDEX = 55;

const SPIN_SECONDS = 6;
const EASING = "cubic-bezier(0.12, 0.80, 0.18, 1)";

// --- UTILS ---
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

// Affiche un prix si tu as un champ price (number) ou priceText (string)
// (tu peux adapter à ton modèle produit)
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
  const [gameState, setGameState] = useState("idle"); // idle | spinning | saving | won
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

  // Bande démo au chargement
  useEffect(() => {
    if (availableProducts.length > 0 && strip.length === 0) {
      setStrip(
        Array.from({ length: 10 }, () =>
          getRandomWeightedItem(availableProducts)
        )
      );
      resetPosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableProducts.length]);

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
        userId: user.uid,
        productId: item.id,
        productName: item.name ?? null,
        productImage: item.image ?? null,
        productPrice: item.price ?? null,
        productPriceText: item.priceText ?? null,
        pointsUsed: COST,
        token,
        status: "won",
        createdAt: serverTimestamp(),
      });
    });

    return { token, orderId: orderRef.id };
  };

  const showWinModal = (wonItem) => {
    const price = formatPrice(wonItem);

    onConfirm?.({
      title: "🎉 C'EST GAGNÉ !",
      text: (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 animate-pulse rounded-full" />
            {wonItem?.image ? (
              <img
                src={wonItem.image}
                className="w-32 h-32 object-contain relative z-10 drop-shadow-xl"
                alt={wonItem.name}
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-slate-200">
                Aucun visuel
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">
              Tu remportes
            </p>
            <p className="text-xl font-black text-gray-900 leading-tight">
              {wonItem?.name}
            </p>
            {price && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  Valeur : {price}
                </span>
              </p>
            )}
          </div>
        </div>
      ),
      confirmText: "VOIR MON PASS",
      cancelText: "REJOUER",
      onOk: () => onGoToPass?.(),
      onCancel: () => {
        setGameState("idle");
        winnerRef.current = null;
        setStrip(
          Array.from({ length: 10 }, () =>
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

    // 1) Choix du gagnant + strip
    const winnerItem = getRandomWeightedItem(availableProducts);
    if (!winnerItem) return notify?.("Stock vide !", "error");
    winnerRef.current = winnerItem;

    const gameStrip = Array.from({ length: TOTAL_ITEMS }, () =>
      getRandomWeightedItem(availableProducts)
    );
    gameStrip[WINNER_INDEX] = winnerItem;

    setStrip(gameStrip);
    setGameState("spinning");

    // 2) Attente DOM + animation
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
    const randomShift = Math.floor(Math.random() * 36) - 18;
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
        // cancel => stop clean
        return;
      } finally {
        animationRef.current = null;
      }
    } else {
      // Fallback transition
      el.style.transition = `transform ${SPIN_SECONDS}s ${EASING}`;
      el.style.transform = `translate3d(${finalX}px,0,0)`;
      await new Promise((r) => setTimeout(r, SPIN_SECONDS * 1000));
    }

    if (!mountedRef.current) return;

    // 3) Transaction après l’anim
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
    showWinModal(winnerItem);
  };

  return (
    <div className="mb-10 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-200 shadow-sm">
            <Dices size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>La Roulette des Récompenses</span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </h2>
            <p className="text-xs text-gray-500">
              Dépense {COST} points pour tenter de gagner un cadeau ✨
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-gray-500">
          <div>Coût par tirage : {COST} pts</div>
          <div>Probabilités pondérées 🎯</div>
        </div>
      </div>

      {/* Zone roulette */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl shadow-2xl border border-indigo-700/40 p-4 sm:p-5">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/10 to-cyan-400/20 rounded-3xl blur-xl -z-10" />

        <div className="relative bg-slate-950/70 rounded-2xl border border-indigo-700/60 px-4 py-5 overflow-hidden">
          {/* Masques */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 via-slate-950/60 to-transparent z-20" />

          {/* Marqueur central */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 bg-gradient-to-b from-yellow-400 via-yellow-300 to-transparent z-30 opacity-80" />
          <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-30">
            <div className="w-0 h-0 border-l-6 border-r-6 border-b-[10px] border-l-transparent border-r-transparent border-b-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
          </div>

          {/* Bande */}
          <div ref={containerRef} className="relative overflow-hidden w-full">
            <div
              ref={stripRef}
              className="flex items-center will-change-transform"
              style={{ gap: `${GAP}px`, transform: "translate3d(0px,0px,0px)" }}
            >
              {strip.map((item, index) => {
                if (!item) return null;
                const isWinnerSpot = index === WINNER_INDEX;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={[
                      "flex-shrink-0 rounded-2xl border flex flex-col items-center justify-center px-2 transition-[transform,box-shadow] duration-300",
                      isWinnerSpot
                        ? "border-yellow-400/80 bg-gradient-to-b from-yellow-500/20 via-slate-900/80 to-slate-950 shadow-[0_0_25px_rgba(250,204,21,0.45)] scale-[1.02]"
                        : "border-slate-700/70 bg-slate-900/80",
                    ].join(" ")}
                    style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                  >
                    <div className="relative mb-2">
                      {isWinnerSpot && (
                        <div className="absolute -inset-2 bg-yellow-400/20 blur-md rounded-full" />
                      )}
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="relative z-10 w-16 h-16 object-contain drop-shadow-[0_8px_20px_rgba(15,23,42,0.9)]"
                        />
                      ) : (
                        <div className="relative z-10 w-16 h-16 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-200 text-xs">
                          N/A
                        </div>
                      )}
                    </div>

                    <p
                      className={`text-[11px] font-semibold text-center leading-tight ${
                        isWinnerSpot ? "text-yellow-50" : "text-slate-100"
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

        {/* Bouton (sans overlay) */}
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleSpin}
            disabled={
              !canPlay || gameState === "spinning" || gameState === "saving"
            }
            className={[
              "px-6 rounded-full text-sm font-semibold shadow-lg transition",
              !canPlay || gameState === "spinning" || gameState === "saving"
                ? "bg-slate-700/70 text-slate-300 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-300 text-slate-900",
            ].join(" ")}
          >
            {gameState === "saving" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> ENREGISTREMENT...
              </span>
            ) : gameState === "spinning" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> SUSPENSE...
              </span>
            ) : gameState === "won" ? (
              <span className="flex items-center gap-2 text-yellow-300">
                <Trophy /> C'EST GAGNÉ !
              </span>
            ) : (
              `LANCER (${COST} PTS)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
