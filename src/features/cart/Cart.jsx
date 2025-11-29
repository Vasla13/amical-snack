import React from "react";
import { ShoppingBag } from "lucide-react";
import Button from "../../ui/Button.jsx";
import { formatPrice } from "../../lib/format.js";
import { useCart } from "../../context/CartContext.jsx"; // <--- Import
import { useNavigate } from "react-router-dom";

export default function Cart({ notify }) {
  const { cart, addToCart, removeFromCart, createOrder } = useCart(); // <--- Hook
  const navigate = useNavigate();

  const handleValidate = () => {
    createOrder(
      () => {
        notify("Commande créée !", "success");
        navigate("/pass");
      },
      (err) => notify(err, "error")
    );
  };

  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);

  if (!cart.length)
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <ShoppingBag size={48} />
        <p className="mt-4 font-medium">Panier vide</p>
      </div>
    );

  return (
    <div className="p-4 flex flex-col h-full bg-gray-50">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ShoppingBag size={20} /> Ma Commande
      </h2>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {cart.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100"
          >
            <div>
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-teal-600 text-xs font-bold">
                {formatPrice(p.price_cents)}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => removeFromCart(p.id)}
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-600"
              >
                -
              </button>
              <span className="font-bold text-sm w-4 text-center">{p.qty}</span>
              <button
                onClick={() => addToCart(p)}
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-600"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-t-3xl shadow-xl -mx-4">
        <div className="flex justify-between text-2xl font-black mb-6">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <Button
          onClick={handleValidate}
          className="w-full text-lg shadow-teal-200"
        >
          VALIDER LE PANIER
        </Button>
      </div>
    </div>
  );
}
