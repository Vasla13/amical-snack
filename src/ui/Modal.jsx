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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95">
        <h3 className="text-xl font-black text-gray-800 mb-2">{title}</h3>
        <div className="text-gray-600 mb-6 text-sm">{children}</div>
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-lg shadow-teal-200"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
