import React from "react";
import { RefreshCw, CheckCircle, Smartphone } from "lucide-react";
import Button from "../../ui/Button.jsx";
import { formatPrice } from "../../lib/format.js";

export default function OrderFlow({ order, onPay, onClose }) {
  if (!order) return <div className="p-10 text-center">Aucune commande.</div>;

  // ETAPE 1 : ATTENTE SCAN (Client bloqué ici tant que l'admin ne scanne pas)
  if (order.status === "created") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-teal-800 text-white p-6 text-center animate-in fade-in">
        <h2 className="text-2xl font-black mb-2">SCANNEZ CE CODE</h2>
        <p className="text-teal-200 mb-8 text-sm">
          Présentez votre écran au vendeur pour payer.
        </p>
        <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8 transform scale-110">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${order.qr_token}&color=0f766e`}
            alt="QR"
            className="w-56 h-56"
          />
        </div>
        <p className="font-mono text-4xl font-black tracking-widest">
          {order.qr_token}
        </p>
        <div className="mt-8 flex items-center gap-2 text-teal-300 animate-pulse">
          <RefreshCw size={16} className="animate-spin" /> En attente du
          vendeur...
        </div>
      </div>
    );
  }

  // ETAPE 2 : PAIEMENT (L'admin a scanné -> le bouton de paiement apparaît)
  if (order.status === "scanned") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center animate-in slide-in-from-bottom">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-bounce">
          <CheckCircle size={50} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">
          Code Validé !
        </h2>
        <p className="text-gray-500 mb-8">
          Le vendeur a confirmé. Vous pouvez régler.
        </p>
        <div className="w-full bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
          <p className="text-gray-400 text-sm uppercase font-bold mb-1">
            Total à régler
          </p>
          <p className="text-6xl font-black text-teal-700">
            {formatPrice(order.total_cents)}
          </p>
        </div>
        <Button
          onClick={onPay}
          variant="primary"
          className="w-full bg-black text-white h-16 text-lg shadow-xl gap-3"
        >
          <Smartphone size={24} /> Payer avec Apple Pay
        </Button>
      </div>
    );
  }

  // ETAPE 3 : FINI (Paiement effectué)
  if (order.status === "paid" || order.status === "served") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-green-500 text-white p-6 text-center animate-in zoom-in">
        <CheckCircle size={80} className="mb-6 text-white" />
        <h2 className="text-3xl font-black mb-2">PAIEMENT REÇU !</h2>
        <p className="text-green-100 text-lg mb-8">
          Vous pouvez récupérer vos produits.
        </p>
        <Button
          onClick={onClose}
          className="bg-white text-green-600 w-full font-bold"
        >
          TERMINER
        </Button>
      </div>
    );
  }

  return null;
}
