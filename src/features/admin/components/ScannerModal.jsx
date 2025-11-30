import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Flashlight } from "lucide-react";
import QrScanner from "qr-scanner";

// NOTE: Les lignes d'import du worker ont été retirées car elles ne sont plus nécessaires
// avec les versions récentes de qr-scanner et provoquaient un warning.

export default function ScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const [error, setError] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Nettoie le token scanné (retire les URL, espaces, etc.)
  const normalizeToken = (raw) => {
    if (!raw) return "";
    const s = String(raw).trim();
    if (s.includes("http://") || s.includes("https://")) {
      const last = s.split("/").filter(Boolean).pop() || s;
      return last.trim().toUpperCase();
    }
    return s.toUpperCase();
  };

  // Arrêt propre du scanner
  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      } catch (e) {
        console.warn("Erreur arrêt scanner:", e);
      }
      scannerRef.current = null;
    }
    setTorchSupported(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    const sc = scannerRef.current;
    if (!sc) return;
    try {
      await sc.toggleFlash();
      const isOn = await sc.isFlashOn();
      setTorchOn(isOn);
    } catch (e) {
      console.warn("Erreur torch:", e);
    }
  };

  useEffect(() => {
    // Si la modale n'est pas ouverte, on ne fait rien.
    if (!open) {
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setError("");

      if (!window.isSecureContext) {
        if (isMounted)
          setError("Caméra bloquée : HTTPS requis (sauf localhost).");
        return;
      }

      // Petit délai pour laisser le temps au DOM (video) d'apparaître
      await new Promise((r) => setTimeout(r, 50));

      if (!videoRef.current) return;

      try {
        // Sécurité : on arrête l'ancien avant d'en créer un nouveau
        stopScanner();

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (!isMounted) return;
            const raw = typeof result === "string" ? result : result?.data;
            const token = normalizeToken(raw);
            if (token) {
              onScan(token);
              onClose(); // On ferme automatiquement après un succès
            }
          },
          {
            preferredCamera: "environment", // Caméra arrière
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5, // Suffisant et économise la batterie
          }
        );

        scannerRef.current = scanner;
        await scanner.start();

        if (isMounted) {
          try {
            const has = await scanner.hasFlash();
            setTorchSupported(!!has);
          } catch {
            setTorchSupported(false);
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(
            "Impossible d'accéder à la caméra. Vérifie les permissions."
          );
        }
      }
    };

    startScanner();

    // Cleanup lors du démontage ou fermeture (quand open passe à false)
    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b bg-white z-10">
          <div className="font-black text-gray-800 flex items-center gap-2 text-lg">
            <Camera className="text-teal-700" />
            Scanner QR
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Zone Vidéo */}
        <div className="relative bg-black flex-1 min-h-[300px] flex flex-col">
          <video
            ref={videoRef}
            className="w-full h-full object-cover absolute inset-0"
            muted
            playsInline
          />

          {/* Overlay Viseur */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/40 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Coins du viseur */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 -mt-1 -ml-1 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 -mt-1 -mr-1 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 -mb-1 -ml-1 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 -mb-1 -mr-1 rounded-br-xl" />
            </div>
          </div>

          {/* Bouton Flash */}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`absolute bottom-6 right-6 p-4 rounded-full shadow-lg transition-transform active:scale-90 ${
                torchOn
                  ? "bg-yellow-400 text-black"
                  : "bg-white/10 text-white backdrop-blur-md border border-white/20"
              }`}
            >
              <Flashlight size={24} fill={torchOn ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {/* Pied de page / Erreurs */}
        <div className="p-4 bg-white">
          {error ? (
            <div className="text-sm text-red-600 font-bold bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3">
              <span className="text-xl">⚠️</span> {error}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm font-medium">
              Place le QR Code client dans le cadre.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
