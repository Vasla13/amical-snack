import React from "react";

export default function Modal({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      {/* AJOUT : dark:bg-slate-900 dark:border dark:border-slate-800 */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 relative border border-transparent dark:border-slate-800 transition-colors">
        {/* AJOUT : dark:text-white */}
        <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2 text-center">
          {title}
        </h3>

        {/* AJOUT : dark:text-slate-300 */}
        <div className="text-gray-600 dark:text-slate-300 mb-6 text-sm">
          {children}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              // AJOUT : Styles dark mode pour le bouton secondaire
              className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
