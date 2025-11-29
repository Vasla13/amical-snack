import React, { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export default function Toast({ msg, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    info: "bg-gray-900 text-white",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
  };

  const Icon =
    type === "success" ? CheckCircle : type === "error" ? AlertCircle : Info;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none animate-in slide-in-from-top-2 fade-in">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${styles[type]} max-w-sm w-full`}
      >
        <Icon size={20} />
        <span className="font-bold text-sm flex-1">{msg}</span>
        <button onClick={onClose}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
