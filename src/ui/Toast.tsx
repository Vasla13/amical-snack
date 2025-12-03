import React, { useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Toast({ msg, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    info: "bg-slate-900 dark:bg-slate-800 text-white border-slate-700",
    success: "bg-emerald-600 text-white border-emerald-500",
    error: "bg-rose-600 text-white border-rose-500",
  };

  const Icon =
    type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : Info;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] flex justify-center pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.9 }}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${styles[type]} w-full max-w-sm backdrop-blur-md`}
        >
          <Icon size={24} strokeWidth={2.5} />
          <div className="flex-1">
            <p className="font-bold text-sm">{msg}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
