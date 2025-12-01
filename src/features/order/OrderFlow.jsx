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
  const itemsSummary = useMemo(() => {
    if (!order?.items) return [];
    const list = order.items;
    const map = new Map();
    for (const it of list) {
      const key = it.id || it.name;
      const prev = map.get(key);
      if (prev) map.set(key, { ...prev, qty: (prev.qty || 0) + (it.qty || 0) });
      else map.set(key, { ...it });
    }
    return Array.from(map.values()).sort((a, b) => (b.qty || 0) - (a.qty || 0));
  }, [order]);

  if (!order) return null;

  const totalCents = Number(order.total_cents || 0);
  const isReward = order.status === "reward_pending";

  return (
    <div className="p-4">
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-lg overflow-hidden ${
          isReward
            ? "border-purple-200 dark:border-purple-900 shadow-purple-100/50 dark:shadow-none"
            : "border-gray-100 dark:border-slate-800"
        }`}
      >
        {/* EN-TÊTE */}
        <div
          className={`p-5 flex items-start justify-between gap-3 ${
            isReward
              ? "bg-purple-50 dark:bg-purple-900/20"
              : "border-b border-gray-50 dark:border-slate-800"
          }`}
        >
          <div>
            <div
              className={`text-xs font-black uppercase tracking-wider mb-1 ${
                isReward
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {isReward ? "COUPON CADEAU" : "COMMANDE EN COURS"}
            </div>
            <div className="font-black text-3xl tracking-widest font-mono text-gray-900 dark:text-white">
              #{order.qr_token}
            </div>
            {!isReward && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-bold">
                Total :{" "}
                <span className="text-teal-700 dark:text-teal-400">
                  {formatPrice(totalCents)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-slate-700"
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
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-black text-gray-600 dark:text-gray-400 text-sm">
                    {it.qty}x
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 dark:text-gray-200 leading-tight">
                      {it.name}
                    </div>
                    {!isReward && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
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
            <div className="bg-purple-600 dark:bg-purple-700 text-white rounded-2xl p-4 text-center shadow-lg shadow-purple-200 dark:shadow-none">
              <div className="font-black text-lg mb-1 flex items-center justify-center gap-2">
                <Gift className="animate-bounce" /> C'est gagné !
              </div>
              <div className="text-purple-100 text-sm leading-snug">
                Montre ce QR code au bar pour récupérer ton lot gratuitement.
              </div>
            </div>
          )}

          {!isReward && order.status === "created" && (
            <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex gap-3">
              <Hourglass className="text-gray-400 dark:text-gray-500 shrink-0" />
              <div>
                <div className="font-black text-gray-800 dark:text-white text-sm">
                  En attente du scan...
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-2xl p-4 text-yellow-800 dark:text-yellow-200">
              <div className="font-black flex items-center gap-2 mb-1">
                <Banknote size={18} /> Espèces
              </div>
              <div className="text-xs">Va payer au comptoir.</div>
            </div>
          )}

          {order.status === "paid" && (
            <div className="bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-900/50 rounded-2xl p-4 text-green-800 dark:text-emerald-200">
              <div className="font-black flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} /> Payé !
              </div>
              <div className="text-xs">Récupère tes articles.</div>
            </div>
          )}

          {order.status === "served" && (
            <div className="bg-gray-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl p-4 text-center">
              <div className="font-black flex items-center justify-center gap-2">
                <CheckCircle2 /> Terminé
              </div>
              <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Bon appétit !
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
