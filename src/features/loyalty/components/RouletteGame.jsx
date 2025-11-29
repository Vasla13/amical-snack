import React, { useState, useRef, useEffect } from "react";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Dices, Trophy, Loader2, Sparkles } from "lucide-react";
import Button from "../../../ui/Button.jsx";
import { generateToken } from "../../../lib/token.js";

// --- CONFIGURATION ---
const COST = 5;
const ITEM_SIZE = 120; // Taille (largeur) d'une case
const GAP = 12; // Espace entre les cases
const WINNER_POS_INDEX = 55; // On place le gagnant loin (55ème position) pour que ça tourne longtemps
const TOTAL_ITEMS = 70; // Nombre total de cases sur la bande
const SPIN_SECONDS = 6; // Durée de l’animation de spin en secondes

// --- UTILITAIRES ---

// Normalise les points (évite les NaN, null, undefined)
function normalizePoints(points) {
  if (typeof points === "number" && !Number.isNaN(points)) return points;
  return 0;
}

// Tire un produit au hasard, pondéré par la probabilité (ou par défaut 1)
function getRandomWeightedItem(items) {
  const cleanItems = items.filter((item) => item && item.id);
  if (cleanItems.length === 0) return null;

  const weights = cleanItems.map((item) => item.probability || 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const r = Math.random() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < cleanItems.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return cleanItems[i];
  }
  return cleanItems[cleanItems.length - 1];
}

export default function RouletteGame({
  user,
  products,
  db,
  notify,
  onConfirm,
  onGoToPass,
}) {
  const [gameState, setGameState] = useState("idle"); // idle, spinning, won
  const [strip, setStrip] = useState([]);

  // Référence directe vers l'élément DOM de la bande (plus fiable pour l'animation)
  const stripRef = useRef(null);
  const containerRef = useRef(null);
  const winnerRef = useRef(null); // On garde le gagnant en mémoire

  // Initialisation : on montre une bande statique au chargement
  useEffect(() => {
    if (products.length > 0 && strip.length === 0) {
      const demoStrip = Array.from({ length: 8 }).map(() =>
        getRandomWeightedItem(products.filter((p) => p.is_available !== false))
      );
      setStrip(demoStrip);
    }
  }, [products, strip.length]);

  const handleSpin = async () => {
    const userPoints = normalizePoints(user?.points);
    const availableProducts = (products || []).filter(
      (p) => p.is_available !== false
    );

    if (userPoints < COST) return notify("Points insuffisants !", "error");
    if (availableProducts.length === 0) return notify("Stock vide !", "error");
    if (gameState === "spinning") return;

    // 1. Choix du vainqueur
    const winnerItem = getRandomWeightedItem(availableProducts);
    winnerRef.current = winnerItem;

    // 2. Construction de la bande de jeu
    const gameStrip = Array.from({ length: TOTAL_ITEMS }).map(() =>
      getRandomWeightedItem(availableProducts)
    );
    // On insère le vainqueur à la position cible
    gameStrip[WINNER_POS_INDEX] = winnerItem;
    setStrip(gameStrip);

    setGameState("spinning");

    // 3. LANCEMENT DE L'ANIMATION (Manipulation DOM directe)
    // On utilise requestAnimationFrame pour être sûr que le DOM est à jour,
    // puis on sépare bien le RESET et le START sur deux frames différentes.
    requestAnimationFrame(() => {
      const el = stripRef.current;
      const cont = containerRef.current;
      if (!el || !cont) return;

      // A. RESET : On se place au début (0px) sans transition
      el.style.transition = "none";
      el.style.transform = "translateX(0px)";

      // B. FORCE REFLOW : on force le navigateur à appliquer la position 0
      // avant de lancer la vraie animation
      el.getBoundingClientRect();

      // C. CALCUL DE LA CIBLE
      // Position gauche de la case gagnante
      const targetLeft = WINNER_POS_INDEX * (ITEM_SIZE + GAP);
      // On centre cette case dans le conteneur
      const offset = cont.offsetWidth / 2 - ITEM_SIZE / 2;
      // Petit aléatoire pour ne pas s'arrêter toujours au pixel près au centre (réalisme)
      const randomShift = Math.floor(Math.random() * 40) - 20;

      const finalTranslate = -(targetLeft - offset + randomShift);

      // D. START : on lance l'animation sur la frame suivante
      requestAnimationFrame(() => {
        // cubic-bezier(0.15, 0.85, 0.15, 1.0) donne un effet de freinage progressif
        el.style.transition = `transform ${SPIN_SECONDS}s cubic-bezier(0.15, 0.85, 0.15, 1.0)`;
        el.style.transform = `translateX(${finalTranslate}px)`;

        // E. Transaction Firebase en parallèle (pendant que ça tourne)
        processTransaction(winnerItem);
      });
    });
  };

  const processTransaction = async (item) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const couponRef = doc(collection(db, "orders"));

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("USER_NOT_FOUND");

        const currentPoints = normalizePoints(userDoc.data().points);

        if (currentPoints < COST) throw new Error("POINTS_LOW");

        const newPoints = currentPoints - COST;

        transaction.update(userRef, {
          points: newPoints,
          lastUpdated: serverTimestamp(),
        });

        const token = generateToken();

        transaction.set(couponRef, {
          userId: user.uid,
          productId: item.id,
          productName: item.name,
          pointsUsed: COST,
          token,
          status: "won",
          createdAt: serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("Erreur transaction roulette:", error);
      setGameState("idle");
      notify(
        error.message === "POINTS_LOW"
          ? "Points insuffisants"
          : "Erreur technique",
        "error"
      );
    }
  };

  // 4. FIN DE L'ANIMATION
  const onTransitionEnd = (e) => {
    if (!stripRef.current) return;
    // On ne réagit que si c'est bien la bande qui termine sa transition
    if (e.target !== stripRef.current) return;
    if (e.propertyName !== "transform") return;
    if (gameState !== "spinning") return;

    setGameState("won");
    const wonItem = winnerRef.current;

    onConfirm({
      title: "🎉 C'EST GAGNÉ !",
      text: (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 animate-pulse rounded-full"></div>
            <img
              src={wonItem.image}
              className="w-32 h-32 object-contain relative z-10 drop-shadow-xl"
              alt={wonItem.name}
            />
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">
              Tu remportes
            </p>
            <p className="text-xl font-black text-gray-900 leading-tight">
              {wonItem.name}
            </p>
          </div>
        </div>
      ),
      confirmText: "VOIR MON PASS",
      cancelText: "REJOUER",
      onOk: () => onGoToPass && onGoToPass(),
      onCancel: () => {
        // Reset pour rejouer
        setGameState("idle");
        // On remet une petite bande démo
        const demoStrip = Array.from({ length: 8 }).map(() =>
          getRandomWeightedItem(
            products.filter((p) => p.is_available !== false)
          )
        );
        setStrip(demoStrip);
        if (stripRef.current) {
          stripRef.current.style.transition = "none";
          stripRef.current.style.transform = "translateX(0px)";
        }
      },
    });
  };

  const availableProducts = products.filter((p) => p.is_available !== false);
  const canPlay =
    normalizePoints(user?.points) >= COST &&
    availableProducts.length > 0 &&
    gameState !== "spinning";

  return (
    <div className="mb-10 select-none">
      {/* --- Header du jeu --- */}
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
              Dépense 5 points pour tenter de gagner un cadeau instantané ✨
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Coût par tirage : 5 pts</div>
          <div>
            Probabilités pondérées selon les disponibilités des produits 🎯
          </div>
        </div>
      </div>

      {/* --- Zone de la roulette --- */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl shadow-2xl border border-indigo-700/40 p-4 sm:p-5">
        {/* Halo lumineux */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/10 to-cyan-400/20 rounded-3xl blur-xl -z-10" />

        {/* Bandeau central */}
        <div className="relative bg-slate-950/70 rounded-2xl border border-indigo-700/60 px-4 py-5 overflow-hidden">
          {/* Masque sombre sur les côtés pour un effet "focus" */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 via-slate-950/60 to-transparent z-20" />

          {/* Indicateur central (triangle / marqueur) */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 bg-gradient-to-b from-yellow-400 via-yellow-300 to-transparent z-30 opacity-80" />
          <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-30">
            <div className="w-0 h-0 border-l-6 border-r-6 border-b-[10px] border-l-transparent border-r-transparent border-b-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
          </div>

          {/* Bande des récompenses */}
          <div ref={containerRef} className="relative overflow-hidden w-full">
            <div
              ref={stripRef}
              className="flex items-center"
              style={{ gap: `${GAP}px` }}
              onTransitionEnd={onTransitionEnd}
            >
              {strip.map((item, index) => {
                if (!item) return null;
                const isWinnerSpot = index === WINNER_POS_INDEX;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={`flex-shrink-0 w-[${ITEM_SIZE}px] h-[140px] rounded-2xl border transition-all duration-300 ${
                      isWinnerSpot
                        ? "border-yellow-400/80 bg-gradient-to-b from-yellow-500/20 via-slate-900/80 to-slate-950 shadow-[0_0_25px_rgba(250,204,21,0.5)] scale-[1.02]"
                        : "border-slate-700/70 bg-slate-900/80"
                    } flex flex-col items-center justify-center px-2`}
                  >
                    <div className="relative mb-2">
                      {isWinnerSpot && (
                        <div className="absolute -inset-2 bg-yellow-400/20 blur-md rounded-full" />
                      )}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="relative z-10 w-16 h-16 object-contain drop-shadow-[0_8px_20px_rgba(15,23,42,0.9)]"
                      />
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

        {/* Bouton Lancer */}
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleSpin}
            disabled={!canPlay}
            className={`px-6 rounded-full text-sm font-semibold shadow-lg transition ${
              !canPlay
                ? "bg-slate-700/70 text-slate-300 cursor-not-allowed"
                : gameState === "spinning"
                ? "bg-yellow-400 text-slate-900 animate-pulse"
                : "bg-yellow-400 hover:bg-yellow-300 text-slate-900"
            }`}
          >
            {gameState === "spinning" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> SUSPENSE...
              </span>
            ) : gameState === "won" ? (
              <span className="flex items-center gap-2 text-yellow-300">
                <Trophy /> C'EST GAGNÉ !
              </span>
            ) : (
              "LANCER (5 PTS)"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
