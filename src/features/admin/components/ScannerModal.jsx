import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Flashlight } from "lucide-react";
import QrScanner from "qr-scanner";
import qrWorkerUrl from "qr-scanner/qr-scanner-worker.min.js?url";

QrScanner.WORKER_PATH = qrWorkerUrl;

export default function ScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const [error, setError] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const normalizeToken = (raw) => {
    if (!raw) return "";
    const s = String(raw).trim();
    if (s.includes("http://") || s.includes("https://")) {
      const last = s.split("/").filter(Boolean).pop() || s;
      return last.trim().toUpperCase();
    }
    return s.toUpperCase();
  };

  const stop = async () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy?.();
        scannerRef.current = null;
      }
    } catch {
      // Ignorer
    }
    setTorchSupported(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    try {
      const sc = scannerRef.current;
      if (!sc) return;
      const has = await sc.hasFlash?.();
      if (!has) return;

      await sc.toggleFlash?.();

      const isOn = await sc.isFlashOn?.();
      if (typeof isOn === "boolean") setTorchOn(isOn);
      else setTorchOn((v) => !v);
    } catch {
      // Ignorer
    }
  };

  useEffect(() => {
    if (!open) {
      stop();
      setError("");
      return;
    }

    (async () => {
      setError("");

      if (!window.isSecureContext) {
        setError("Caméra bloquée : il faut HTTPS sur mobile (sauf localhost).");
        return;
      }

      try {
        const video = videoRef.current;
        if (!video) return;

        const scanner = new QrScanner(
          video,
          (result) => {
            const raw = typeof result === "string" ? result : result?.data;
            const token = normalizeToken(raw);
            if (token) {
              onScan(token);
              onClose();
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 8,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();

        try {
          const has = await scanner.hasFlash?.();
          setTorchSupported(!!has);
          if (has) {
            const isOn = await scanner.isFlashOn?.();
            if (typeof isOn === "boolean") setTorchOn(isOn);
          }
        } catch {
          setTorchSupported(false);
        }
      } catch {
        setError(
          "Impossible de lancer la caméra. Autorise la caméra et vérifie HTTPS."
        );
      }
    })();

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-3">
      <div className="w-full sm:max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-black text-gray-800 flex items-center gap-2">
            <Camera size={18} className="text-teal-700" />
            Scanner QR
          </div>
          <button
            onClick={async () => {
              await stop();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X />
          </button>
        </div>

        <div className="p-3">
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-[340px] object-cover"
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>

            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`absolute top-3 right-3 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg ${
                  torchOn
                    ? "bg-yellow-400 text-black"
                    : "bg-white text-gray-900"
                }`}
              >
                <Flashlight size={16} />
                {torchOn ? "FLASH ON" : "FLASH"}
              </button>
            )}
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600 font-bold bg-red-50 border border-red-100 p-3 rounded-xl">
              {error}
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-500">
              Pointe le QR du client. Le code sera rempli automatiquement.
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                await stop();
                onClose();
              }}
              className="flex-1 bg-white border border-gray-200 py-3 rounded-xl font-black text-gray-800"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
