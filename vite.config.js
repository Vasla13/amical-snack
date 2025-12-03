import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer"; // AJOUT

export default defineConfig({
  plugins: [
    react(),
    // AJOUT : Configuration de l'optimiseur d'images
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 75 },
      webp: { quality: 80, lossless: true },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.ico", "apple-touch-icon.png", "logo.png"],
      manifest: {
        name: "Amicale R&T",
        short_name: "Amicale",
        description: "Snack et Fidélité R&T Colmar",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        icons: [
          { src: "/logo.png", sizes: "192x192", type: "image/png" },
          { src: "/logo.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  esbuild: { target: "es2015" },
  build: {
    target: "es2015",
    chunkSizeWarningLimit: 1500,
  },
});
