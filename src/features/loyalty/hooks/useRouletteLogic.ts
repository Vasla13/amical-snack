import { useState, useRef, useEffect, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import confetti from "canvas-confetti";
import { useFeedback } from "../../../hooks/useFeedback";
import { Product, UserProfile } from "../../../types";

const COST = 10;
const TOTAL_ITEMS = 80;
const WINNER_INDEX = 60;
const SPIN_SECONDS = 7;
const ITEM_WIDTH = 120;
const GAP = 12;
const EASING = "cubic-bezier(0.15, 0.85, 0.25, 1)";

function getRandomItemForVisual(items: Product[]) {
  if (!items || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()));
}

interface UseRouletteProps {
  user: UserProfile | null;
  products: Product[];
  notify?: (msg: string, type: "success" | "error" | "info") => void;
}

export function useRouletteLogic({ user, products, notify }: UseRouletteProps) {
  const [gameState, setGameState] = useState<"idle" | "spinning" | "won">(
    "idle"
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const mountedRef = useRef(false);

  const functions = getFunctions();
  const { trigger } = useFeedback();

  const availableProducts = useMemo(
    () => (products || []).filter((p) => p && p.id && p.is_available !== false),
    [products]
  );

  // Lazy initialization correcte
  const [strip, setStrip] = useState<(Product | null)[]>(() => {
    if (availableProducts.length > 0) {
      return Array.from({ length: 15 }, () =>
        getRandomItemForVisual(availableProducts)
      );
    }
    return [];
  });

  useEffect(() => {
    if (strip.length === 0 && availableProducts.length > 0) {
      setStrip(
        Array.from({ length: 15 }, () =>
          getRandomItemForVisual(availableProducts)
        )
      );
    }
  }, [availableProducts.length]);

  const canPlay =
    (user?.points || 0) >= COST &&
    availableProducts.length > 0 &&
    (gameState === "idle" || gameState === "won");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationRef.current) animationRef.current.cancel();
    };
  }, []);

  const spin = async (onSuccess: (winner: Product) => void) => {
    if (!canPlay) return;

    setGameState("spinning");
    trigger("spin");

    try {
      const playRouletteFn = httpsCallable(functions, "playRoulette");

      // Génération de la bande visuelle
      const tempStrip = Array.from({ length: TOTAL_ITEMS }, () =>
        getRandomItemForVisual(availableProducts)
      );
      setStrip(tempStrip);

      // Appel Cloud Function
      const result: any = await playRouletteFn();
      const winner = result.data.winner as Product;

      // On place le vrai gagnant à l'index final
      const finalStrip = [...tempStrip];
      finalStrip[WINNER_INDEX] = winner;
      setStrip(finalStrip);

      setTimeout(async () => {
        if (!mountedRef.current) return;

        const el = stripRef.current;
        const cont = containerRef.current;

        if (el && cont) {
          el.style.transition = "none";
          el.style.transform = "translate3d(0px,0px,0px)";
          await nextFrame();

          const containerWidth = cont.clientWidth || 0;
          const offset = containerWidth / 2 - ITEM_WIDTH / 2;
          const targetLeft = WINNER_INDEX * (ITEM_WIDTH + GAP);
          // Petit décalage aléatoire pour le réalisme
          const randomShift = Math.floor(Math.random() * 40) - 20;
          const finalX = -(targetLeft - offset + randomShift);

          if (typeof el.animate === "function") {
            const anim = el.animate(
              [
                { transform: "translate3d(0px,0px,0px)" },
                { transform: `translate3d(${finalX}px,0,0)` },
              ],
              {
                duration: SPIN_SECONDS * 1000,
                easing: EASING,
                fill: "forwards",
              }
            );
            animationRef.current = anim;
            await anim.finished;
          } else {
            // Fallback
            el.style.transition = `transform ${SPIN_SECONDS}s ${EASING}`;
            el.style.transform = `translate3d(${finalX}px,0,0)`;
            await new Promise((r) => setTimeout(r, SPIN_SECONDS * 1000));
          }
        }

        if (!mountedRef.current) return;

        setGameState("won");
        trigger("success");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
          zIndex: 9999,
        });

        if (onSuccess) onSuccess(winner);
      }, 200);
    } catch (err: any) {
      console.error(err);
      setGameState("idle");
      trigger("error");
      notify?.(err.message || "Erreur serveur", "error");
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
