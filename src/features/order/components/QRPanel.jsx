import React, { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy } from "lucide-react";

export default function QRPanel({ token }) {
  const qrValue = useMemo(
    () => `${window.location.origin}/c/${token}`,
    [token]
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(token));
    } catch {
      const t = document.createElement("textarea");
      t.value = String(token);
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
  };

  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-black uppercase text-gray-400">
          QR Code
        </div>
        <button
          onClick={copyCode}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-black text-xs flex items-center gap-2"
          aria-label="Copier le code"
        >
          <Copy size={16} /> Copier
        </button>
      </div>

      <div className="mt-2 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center">
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          <QRCodeCanvas value={qrValue} size={210} includeMargin />
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Montre ce QR au vendeur (ou donne le code : <b>{token}</b>)
      </div>
    </div>
  );
}
