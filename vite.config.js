import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Modification ici : favicon.ico remplacé par logo.ico
      includeAssets: ["logo.ico", "apple-touch-icon.png", "logo.png"],
      manifest: {
        name: "Amicale R&T",
        short_name: "Amicale",
        description: "Snack et Fidélité R&T Colmar",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        icons: [
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  // Optimisation pour éviter les écrans blancs sur iOS
  esbuild: {
    target: "es2015",
  },
  build: {
    target: "es2015",
    chunkSizeWarningLimit: 1500, // Augmenté pour éviter l'alerte jaune
  },
});
