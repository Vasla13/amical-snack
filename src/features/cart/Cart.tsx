import React, { useState } from "react";
import { ShoppingBag, ChevronRight, Trash2 } from "lucide-react";
import Button from "../../ui/Button";
import { formatPrice } from "../../lib/format";
import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import Modal from "../../ui/Modal";
import { CartItem } from "../../types"; // Import du type
import { useFeedback } from "../../context/FeedbackContext";

export default function Cart() {
  const { notify } = useFeedback();
  const { cart, addToCart, removeFromCart, createOrder, clearCart } = useCart();
  const navigate = useNavigate();

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleValidate = () => {
    createOrder((newOrderId) => {
      notify("Commande créée !", "success");
      navigate("/pass", { state: { openOrderId: newOrderId } });
    });
  };

  const requestClearCart = () => {
    setIsClearModalOpen(true);
  };

  const confirmClearCart = () => {
    clearCart();
    setIsClearModalOpen(false);
    notify("Panier vidé.", "info");
  };

  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);

  if (!cart.length)
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-4 text-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ShoppingBag
            size={48}
            className="opacity-20 text-slate-900 dark:text-white"
          />
        </div>
        <p className="font-black text-xl text-slate-700 dark:text-slate-300">
          Ton panier est vide
        </p>
        <p className="text-sm mt-2 font-medium">
          Ajoute des snacks pour commencer !
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-8 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
        >
          Aller au catalogue
        </button>
      </div>
    );

  return (
    <div className="p-4 flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-24">
      <Modal
        isOpen={isClearModalOpen}
        title="Vider le panier ?"
        onCancel={() => setIsClearModalOpen(false)}
        onConfirm={confirmClearCart}
        confirmText="Oui, vider"
        cancelText="Annuler"
      >
        <p>
          Tu es sur le point de retirer tous les articles de ton panier. Cette
          action est irréversible.
        </p>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <ShoppingBag className="text-teal-600 dark:text-teal-400" size={28} />
          Mon Panier
        </h2>

        <button
          onClick={requestClearCart}
          aria-label="Vider le panier"
          className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors active:scale-90"
          title="Vider le panier"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Liste des articles */}
      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pb-4">
        {cart.map((p: CartItem) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center p-1.5 shrink-0">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-contain"
                  // CORRECTION TS : currentTarget
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-800 dark:text-white truncate pr-2">
                  {p.name}
                </div>
                <div className="text-teal-600 dark:text-teal-400 text-xs font-black mt-0.5">
                  {formatPrice(p.price_cents)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => removeFromCart(p.id)}
                className="w-8 h-8 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all bg-transparent"
              >
                -
              </button>
              <span className="font-black text-sm w-6 text-center text-slate-800 dark:text-white">
                {p.qty}
              </span>
              <button
                onClick={() => addToCart(p)}
                className="w-8 h-8 flex items-center justify-center font-bold text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all bg-transparent"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Total & Action */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-800 mt-2 relative z-10">
        <div className="flex justify-between items-end mb-6">
          <span className="text-slate-400 dark:text-slate-500 font-bold text-sm uppercase tracking-wider mb-1">
            Total à payer
          </span>
          <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatPrice(total)}
          </span>
        </div>
        <Button
          onClick={handleValidate}
          className="w-full text-base py-4 shadow-xl shadow-teal-500/20 active:scale-[0.98]"
        >
          <span>COMMANDER</span>
          <ChevronRight size={20} className="opacity-60" />
        </Button>
      </div>
    </div>
  );
}
