import { useState, useRef, useEffect, useMemo } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import confetti from "canvas-confetti";
import { generateToken } from "../../../lib/token.js";

// Configuration du jeu
const COST = 10;
const TOTAL_ITEMS = 80;
const WINNER_INDEX = 60;
const SPIN_SECONDS = 7;
const ITEM_WIDTH = 120;
const GAP = 12;
const EASING = "cubic-bezier(0.15, 0.85, 0.25, 1)";

// Helpers
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

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

// Le Hook Principal (C'est ici que sont parties tes 300 lignes !)
export function useRouletteLogic({ user, products, db, notify }) {
  const [gameState, setGameState] = useState("idle");
  const [strip, setStrip] = useState([]);
  const containerRef = useRef(null);
  const stripRef = useRef(null);
  const winnerRef = useRef(null);
  const animationRef = useRef(null);
  const mountedRef = useRef(false);

  // Filtrer les produits disponibles
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

  // Initialisation de la bande visuelle (au repos)
  useEffect(() => {
    if (availableProducts.length > 0 && strip.length === 0) {
      setStrip(
        Array.from({ length: 15 }, () =>
          getRandomWeightedItem(availableProducts)
        )
      );
    }
  }, [availableProducts.length]);

  // Fonction pour lancer le jeu
  const spin = async (onSuccess) => {
    // Vérifications de sécurité
    if (!user?.uid) return notify?.("Utilisateur non connecté", "error");
    if (!db) return notify?.("Database non disponible", "error");
    if (!canPlay) return;

    if (normalizePoints(user?.points) < COST)
      return notify?.("Points insuffisants !", "error");

    // Choix du gagnant (Le Destin)
    const winnerItem = getRandomWeightedItem(availableProducts);
    if (!winnerItem) return notify?.("Stock vide !", "error");
    winnerRef.current = winnerItem;

    // Préparer la bande longue pour l'animation
    const gameStrip = Array.from({ length: TOTAL_ITEMS }, () =>
      getRandomWeightedItem(availableProducts)
    );
    // On force l'item gagnant à la position d'arrêt
    gameStrip[WINNER_INDEX] = winnerItem;

    setStrip(gameStrip);
    setGameState("spinning");

    // Attendre que le DOM se mette à jour
    await nextFrame();
    await nextFrame();
    if (!mountedRef.current) return;

    // Calculs de géométrie pour l'animation
    const el = stripRef.current;
    const cont = containerRef.current;
    if (!el || !cont) {
      setGameState("idle");
      return;
    }

    // Reset position départ
    el.style.transition = "none";
    el.style.transform = "translate3d(0px,0px,0px)";
    await nextFrame();

    // Calcul de la position finale exacte (centrée)
    const containerWidth = cont.clientWidth || 0;
    const offset = containerWidth / 2 - ITEM_WIDTH / 2;
    const targetLeft = WINNER_INDEX * (ITEM_WIDTH + GAP);
    // Petit décalage aléatoire pour le réalisme (ne tombe pas pile au pixel près)
    const randomShift = Math.floor(Math.random() * 24) - 12;
    const finalX = -(targetLeft - offset + randomShift);

    // Lancer l'animation (Web Animations API)
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
        return; // Animation annulée (ex: changement de page)
      }
    } else {
      // Fallback CSS
      el.style.transition = `transform ${SPIN_SECONDS}s ${EASING}`;
      el.style.transform = `translate3d(${finalX}px,0,0)`;
      await new Promise((r) => setTimeout(r, SPIN_SECONDS * 1000));
    }

    if (!mountedRef.current) return;

    // Transaction Base de Données (Débit points + Création lot)
    setGameState("saving");
    try {
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", user.uid);
        const orderRef = doc(collection(db, "orders"));

        const snap = await tx.get(userRef);
        if (!snap.exists()) throw new Error("USER_NOT_FOUND");

        const pts = normalizePoints(snap.data()?.points);
        if (pts < COST) throw new Error("POINTS_LOW");

        // 1. Débiter les points
        tx.update(userRef, {
          points: pts - COST,
          lastUpdated: serverTimestamp(),
        });

        // 2. Créer le ticket gagnant
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

      // Succès !
      setGameState("won");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      if (onSuccess) onSuccess(winnerItem);
    } catch (err) {
      setGameState("idle");
      notify?.(
        err?.message === "POINTS_LOW"
          ? "Points insuffisants"
          : "Erreur technique",
        "error"
      );
    }
  };

  // On retourne tout ce dont l'interface a besoin
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
