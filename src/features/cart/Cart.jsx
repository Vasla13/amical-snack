import React from "react";
import { ShoppingBag, ChevronRight } from "lucide-react";
import Button from "../../ui/Button.jsx";
import { formatPrice } from "../../lib/format.js";
import { useCart } from "../../context/CartContext.jsx"; //
import { useNavigate } from "react-router-dom";

export default function Cart({ notify }) {
  const { cart, addToCart, removeFromCart, createOrder } = useCart(); //
  const navigate = useNavigate();

  const handleValidate = () => {
    createOrder(
      (newOrderId) => {
        notify("Commande créée !", "success");
        // C'est ici que la magie opère : on envoie l'ID à la page suivante
        navigate("/pass", { state: { openOrderId: newOrderId } });
      },
      (err) => notify(err, "error")
    );
  };

  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);

  if (!cart.length)
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag size={40} className="opacity-20 text-slate-900" />
        </div>
        <p className="font-bold text-lg text-slate-600">Ton panier est vide</p>
        <p className="text-sm mt-1">Ajoute des snacks pour commencer !</p>
      </div>
    );

  return (
    <div className="p-4 flex flex-col h-full bg-slate-50">
      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <ShoppingBag className="text-teal-600" size={24} /> Mon Panier
      </h2>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-4">
        {cart.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center p-1">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-contain"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>

              <div>
                <div className="font-bold text-sm text-slate-800">{p.name}</div>
                <div className="text-teal-600 text-xs font-black">
                  {formatPrice(p.price_cents)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
              <button
                onClick={() => removeFromCart(p.id)}
                className="w-8 h-8 flex items-center justify-center font-bold text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                -
              </button>
              <span className="font-black text-sm w-4 text-center text-slate-800">
                {p.qty}
              </span>
              <button
                onClick={() => addToCart(p)}
                className="w-8 h-8 flex items-center justify-center font-bold text-slate-800 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-[0_-10px_40px_rgb(0,0,0,0.05)] border border-slate-100 mt-2">
        <div className="flex justify-between items-end mb-6">
          <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">
            Total
          </span>
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {formatPrice(total)}
          </span>
        </div>
        <Button
          onClick={handleValidate}
          className="w-full text-lg shadow-teal-500/30"
        >
          <span>COMMANDER</span>
          <ChevronRight size={20} className="opacity-50" />
        </Button>
      </div>
    </div>
  );
}
