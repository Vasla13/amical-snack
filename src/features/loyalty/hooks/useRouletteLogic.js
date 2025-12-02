import { useState, useRef, useEffect, useMemo } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { generateToken } from "../../../lib/token.js";
import { useFeedback } from "../../../hooks/useFeedback.js";

const COST = 10;
const TOTAL_ITEMS = 80;
const WINNER_INDEX = 60;
const SPIN_SECONDS = 7;
const ITEM_WIDTH = 120;
const GAP = 12;
const EASING = "cubic-bezier(0.15, 0.85, 0.25, 1)";

function normalizePoints(points) {
  return typeof points === "number" && !Number.isNaN(points) ? points : 0;
}

// Fonction aléatoire pondérée
function getRandomWeightedItem(items, badLuckCount = 0) {
  const clean = (items || []).filter((it) => it && it.id);
  if (clean.length === 0) return null;

  // PROTECTION BAD LUCK : Si le joueur a perdu beaucoup, on booste les "gros lots" (ceux avec une proba faible)
  const boostFactor = badLuckCount > 5 ? 3 : 1;

  const weights = clean.map((it) => {
    let w =
      typeof it.probability === "number" && it.probability > 0
        ? it.probability
        : 1;
    // Si c'est un item rare (proba < 0.1) et qu'on a de la malchance, on booste
    if (boostFactor > 1 && w < 0.1) w *= boostFactor;
    return w;
  });

  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < clean.length; i++) {
    r -= weights[i];
    if (r <= 0) return clean[i];
  }
  return clean[clean.length - 1];
}

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

export function useRouletteLogic({ user, products, db, notify }) {
  const [gameState, setGameState] = useState("idle");
  const [strip, setStrip] = useState([]);
  const containerRef = useRef(null);
  const stripRef = useRef(null);
  const winnerRef = useRef(null);
  const animationRef = useRef(null);
  const mountedRef = useRef(false);

  const { trigger } = useFeedback();

  const availableProducts = useMemo(
    () => (products || []).filter((p) => p && p.id && p.is_available !== false),
    [products]
  );

  const canPlay =
    normalizePoints(user?.points) >= COST &&
    availableProducts.length > 0 &&
    (gameState === "idle" || gameState === "won");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationRef.current) animationRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (availableProducts.length > 0 && strip.length === 0) {
      setStrip(
        Array.from({ length: 15 }, () =>
          getRandomWeightedItem(availableProducts)
        )
      );
    }
  }, [availableProducts.length]);

  const spin = async (onSuccess) => {
    if (!user?.uid) return notify?.("Utilisateur non connecté", "error");
    if (!db) return notify?.("Database non disponible", "error");
    if (!canPlay) return;

    if (normalizePoints(user?.points) < COST)
      return notify?.("Points insuffisants !", "error");

    // On utilise le compteur de malchance de l'utilisateur
    const badLuck = user?.bad_luck_count || 0;
    const winnerItem = getRandomWeightedItem(availableProducts, badLuck);

    if (!winnerItem) return notify?.("Stock vide !", "error");
    winnerRef.current = winnerItem;

    const gameStrip = Array.from(
      { length: TOTAL_ITEMS },
      () => getRandomWeightedItem(availableProducts) // Strip visuel standard
    );
    gameStrip[WINNER_INDEX] = winnerItem;

    setStrip(gameStrip);
    setGameState("spinning");
    trigger("spin");

    await nextFrame();
    await nextFrame();
    if (!mountedRef.current) return;

    const el = stripRef.current;
    const cont = containerRef.current;
    if (!el || !cont) {
      setGameState("idle");
      return;
    }

    el.style.transition = "none";
    el.style.transform = "translate3d(0px,0px,0px)";
    await nextFrame();

    const containerWidth = cont.clientWidth || 0;
    const offset = containerWidth / 2 - ITEM_WIDTH / 2;
    const targetLeft = WINNER_INDEX * (ITEM_WIDTH + GAP);
    // Petite variation pour le "Near Miss" (on s'arrête parfois un peu avant/après le centre)
    const randomShift = Math.floor(Math.random() * 24) - 12;
    const finalX = -(targetLeft - offset + randomShift);

    if (typeof el.animate === "function") {
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
      }
    } else {
      el.style.transition = `transform ${SPIN_SECONDS}s ${EASING}`;
      el.style.transform = `translate3d(${finalX}px,0,0)`;
      await new Promise((r) => setTimeout(r, SPIN_SECONDS * 1000));
    }

    if (!mountedRef.current) return;

    setGameState("saving");
    try {
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", user.uid);
        const orderRef = doc(collection(db, "orders"));
        const historyRef = doc(
          collection(db, "users", user.uid, "transactions")
        ); // HISTORIQUE

        const snap = await tx.get(userRef);
        if (!snap.exists()) throw new Error("USER_NOT_FOUND");
        const pts = normalizePoints(snap.data()?.points);
        if (pts < COST) throw new Error("POINTS_LOW");

        // Mise à jour des points et Reset/Increment Bad Luck
        // On considère un "gros lot" si le prix > 150 cents par exemple, sinon c'est un lot de consolation
        const isBigWin = winnerItem.price_cents > 150;

        tx.update(userRef, {
          points: pts - COST,
          lastUpdated: serverTimestamp(),
          bad_luck_count: isBigWin ? 0 : increment(1), // Reset si gros gain, sinon +1
        });

        // Enregistrement historique débit
        tx.set(historyRef, {
          type: "spend",
          amount: -COST,
          reason: "Roulette",
          date: serverTimestamp(),
        });

        tx.set(orderRef, {
          user_id: user.uid,
          items: [{ ...winnerItem, qty: 1, price_cents: 0 }],
          total_cents: 0,
          status: "reward_pending",
          payment_method: "roulette",
          qr_token: generateToken(),
          created_at: serverTimestamp(),
          source: "Roulette",
        });
      });

      setGameState("won");
      trigger("success");

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
        scalar: 0.8,
        drift: 0,
        ticks: 200,
      });

      if (onSuccess) onSuccess(winnerItem);
    } catch (err) {
      setGameState("idle");
      trigger("error");
      notify?.(
        err?.message === "POINTS_LOW"
          ? "Points insuffisants"
          : "Erreur technique",
        "error"
      );
    }
  };

  return {
    gameState,
    strip,
    containerRef,
    stripRef,
    canPlay,
    spin,
    COST,
    ITEM_WIDTH,
    GAP,
    WINNER_INDEX,
  };
}
