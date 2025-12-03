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
    <div className="p-4 border-b border-gray-100 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-black uppercase text-gray-400 dark:text-gray-500">
          QR Code
        </div>
        <button
          onClick={copyCode}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-2 transition-colors"
          aria-label="Copier le code"
        >
          <Copy size={16} /> Copier
        </button>
      </div>

      {/* Conteneur QR adapté au Dark Mode */}
      <div className="mt-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-center transition-colors">
        {/* Le fond du QR reste blanc pour la lisibilité du scan, mais le cadre s'adapte */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          <QRCodeCanvas value={qrValue} size={210} includeMargin />
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-gray-500 dark:text-slate-400">
        Présente ce code au bar ou donne le numéro : <br />
        <span className="font-mono font-black text-lg text-slate-800 dark:text-white select-all">
          {token}
        </span>
      </div>
    </div>
  );
}
