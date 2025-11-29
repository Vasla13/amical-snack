import React, { useMemo } from "react";
import { CheckCircle2, Hourglass, Banknote, X, Gift } from "lucide-react";
import { formatPrice } from "../../lib/format.js";
import QRPanel from "./components/QRPanel.jsx";
import PaymentMethods from "./components/PaymentMethods.jsx";

export default function OrderFlow({
  order,
  user,
  onPay,
  onRequestCash,
  onClose,
}) {
  // 1. Hooks TOUJOURS en premier (avant les if/return)
  const itemsSummary = useMemo(() => {
    if (!order?.items) return []; // Sécurité interne
    const list = order.items;
    const map = new Map();
    for (const it of list) {
      const key = it.id || it.name;
      const prev = map.get(key);
      if (prev) map.set(key, { ...prev, qty: (prev.qty || 0) + (it.qty || 0) });
      else map.set(key, { ...it });
    }
    return Array.from(map.values()).sort((a, b) => (b.qty || 0) - (a.qty || 0));
  }, [order]); // On dépend de l'objet order entier pour être sûr

  // 2. Ensuite les conditions d'affichage
  if (!order) return null;

  const totalCents = Number(order.total_cents || 0);
  const isReward = order.status === "reward_pending";

  return (
    <div className="p-4">
      <div
        className={`bg-white rounded-3xl border shadow-lg overflow-hidden ${
          isReward ? "border-purple-200 shadow-purple-100" : "border-gray-100"
        }`}
      >
        {/* EN-TÊTE */}
        <div
          className={`p-5 flex items-start justify-between gap-3 ${
            isReward ? "bg-purple-50" : "border-b border-gray-50"
          }`}
        >
          <div>
            <div
              className={`text-xs font-black uppercase tracking-wider mb-1 ${
                isReward ? "text-purple-600" : "text-gray-400"
              }`}
            >
              {isReward ? "COUPON CADEAU" : "COMMANDE EN COURS"}
            </div>
            <div className="font-black text-3xl tracking-widest font-mono text-gray-900">
              #{order.qr_token}
            </div>
            {!isReward && (
              <div className="mt-1 text-sm text-gray-600 font-bold">
                Total :{" "}
                <span className="text-teal-700">{formatPrice(totalCents)}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white hover:bg-gray-50 text-gray-600 shadow-sm border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR CODE */}
        <QRPanel token={order.qr_token} />

        <div className="p-5">
          {/* LISTE PRODUITS */}
          <div className="space-y-3 mb-6">
            {itemsSummary.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-gray-600 text-sm">
                    {it.qty}x
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 leading-tight">
                      {it.name}
                    </div>
                    {!isReward && (
                      <div className="text-xs text-gray-400">
                        {formatPrice(it.price_cents)}/u
                      </div>
                    )}
                  </div>
                </div>
                {isReward && <Gift size={20} className="text-purple-500" />}
              </div>
            ))}
          </div>

          {/* ÉTATS (STATUS) */}

          {isReward && (
            <div className="bg-purple-600 text-white rounded-2xl p-4 text-center shadow-lg shadow-purple-200">
              <div className="font-black text-lg mb-1 flex items-center justify-center gap-2">
                <Gift className="animate-bounce" /> C'est gagné !
              </div>
              <div className="text-purple-100 text-sm leading-snug">
                Montre ce QR code au bar pour récupérer ton lot gratuitement.
              </div>
            </div>
          )}

          {!isReward && order.status === "created" && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex gap-3">
              <Hourglass className="text-gray-400 shrink-0" />
              <div>
                <div className="font-black text-gray-800 text-sm">
                  En attente du scan...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Le vendeur doit scanner ce code.
                </div>
              </div>
            </div>
          )}

          {order.status === "scanned" && !isReward && (
            <PaymentMethods
              order={order}
              user={user}
              onPay={onPay}
              onRequestCash={onRequestCash}
            />
          )}

          {order.status === "cash" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-800">
              <div className="font-black flex items-center gap-2 mb-1">
                <Banknote size={18} /> Espèces
              </div>
              <div className="text-xs">Va payer au comptoir.</div>
            </div>
          )}

          {order.status === "paid" && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800">
              <div className="font-black flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} /> Payé !
              </div>
              <div className="text-xs">Récupère tes articles.</div>
            </div>
          )}

          {order.status === "served" && (
            <div className="bg-gray-900 text-white rounded-2xl p-4 text-center">
              <div className="font-black flex items-center justify-center gap-2">
                <CheckCircle2 /> Terminé
              </div>
              <div className="text-xs text-gray-400 mt-1">Bon appétit !</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
