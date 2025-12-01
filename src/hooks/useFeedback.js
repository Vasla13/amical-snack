import { useCallback } from "react";

// Tu peux remplacer ces URL par tes propres fichiers mp3 dans le dossier public/
const SOUNDS = {
  click: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3", // Petit pop
  // Son de révélation "Rare" style CS:GO/Lootbox
  success: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  // Son de roulement (optionnel, pour le début du spin)
  spin: "https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3",
};

export function useFeedback() {
  const trigger = useCallback((type = "click") => {
    // 1. Haptique (Vibration)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "success")
        navigator.vibrate([50, 50, 100]); // Vibration gagnante
      else if (type === "error") navigator.vibrate(200);
      else if (type === "spin") navigator.vibrate(20);
      else navigator.vibrate(10); // Clic léger
    }

    // 2. Son
    try {
      const audioUrl = SOUNDS[type];
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        // Volume un peu plus fort pour le "Win"
        audio.volume = type === "success" ? 0.8 : 0.4;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn("Audio feedback error", e);
    }
  }, []);

  return { trigger };
}
