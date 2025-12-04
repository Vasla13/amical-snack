import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { X, Scan, Zap, ZapOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScannerModal({ open, onClose, onScan }) {
  const [flash, setFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    let timer;
    if (open) {
      timer = setTimeout(() => setCameraActive(true), 300);
    } else {
      setCameraActive(false);
      setFlash(false);
    }
    return () => clearTimeout(timer);
  }, [open]);

  const handleScan = (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      if (code) {
        if (navigator.vibrate) navigator.vibrate(50);
        onScan(code);
        onClose();
      }
    }
  };

  const handleError = (error) => {
    console.warn("Erreur scanner:", error?.message);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col"
        >
          {/* HEADER */}
          <div className="relative z-20 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2 text-white/80">
              <Scan size={20} className="text-teal-400" />
              <span className="text-sm font-bold tracking-wider uppercase">
                Scan Commande
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors active:scale-95"
            >
              <X size={24} />
            </button>
          </div>

          {/* ZONE VIDÉO */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
            {cameraActive ? (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                components={{
                  torch: flash,
                  zoom: true,
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" },
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500 animate-pulse">
                <Scan size={48} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Initialisation caméra...
                </span>
              </div>
            )}

            {/* OVERLAY SOMBRE */}
            <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

            {/* VISEUR ANIMÉ */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-64 h-64 rounded-3xl z-10">
                {/* Coins */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-[1rem] -mt-1 -ml-1 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-[1rem] -mt-1 -mr-1 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-[1rem] -mb-1 -ml-1 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-[1rem] -mb-1 -mr-1 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]" />

                {/* Cadre fin interne */}
                <div className="absolute inset-2 border-2 border-teal-500/30 rounded-2xl" />

                {/* Laser scan */}
                <div className="absolute inset-x-0 h-0.5 bg-teal-400/80 shadow-[0_0_15px_rgba(45,212,191,0.8)] animate-[scan_3s_ease-in-out_infinite_alternate] top-1/2" />

                <div className="absolute -bottom-14 left-0 right-0 text-center">
                  <p className="text-white/90 text-xs font-bold bg-black/60 px-4 py-1.5 rounded-full inline-block backdrop-blur-md border border-white/10">
                    Placez le QR Code ici
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER FLASH */}
          <div className="relative z-20 p-6 pb-10 bg-gradient-to-t from-black/90 to-transparent flex justify-center">
            <button
              onClick={() => setFlash(!flash)}
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all active:scale-90 ${
                flash
                  ? "bg-yellow-400 text-slate-900 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)]"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              {flash ? (
                <Zap size={28} fill="currentColor" />
              ) : (
                <ZapOff size={28} />
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
