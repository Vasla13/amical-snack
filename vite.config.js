import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // On augmente un peu la limite d'avertissement (optionnel, pour éviter le spam)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 1. On isole Firebase (c'est souvent le plus lourd)
          if (id.includes("node_modules/firebase")) {
            return "firebase";
          }
          // 2. On isole React et React-DOM (le moteur du site)
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "react-vendor";
          }
          // 3. On isole les outils QR Code (Scanner + Générateur)
          if (
            id.includes("node_modules/qr-scanner") ||
            id.includes("node_modules/qrcode.react")
          ) {
            return "qr-tools";
          }
          // 4. Le reste (Lucide, etc.) ira dans un fichier vendor commun ou avec le code principal
        },
      },
    },
  },
});
