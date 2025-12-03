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
    <div className="p-4 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transition-colors ${
          isReward
            ? "border-purple-200 dark:border-purple-900/50"
            : "border-gray-100 dark:border-slate-800"
        }`}
      >
        {/* EN-TÊTE */}
        <div
          className={`p-5 flex items-start justify-between gap-3 ${
            isReward
              ? "bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20"
              : "border-b border-gray-50 dark:border-slate-800"
          }`}
        >
          <div>
            <div
              className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                isReward
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {isReward ? "COUPON CADEAU" : "COMMANDE EN COURS"}
            </div>
            <div className="font-black text-3xl tracking-tighter font-mono text-gray-900 dark:text-white">
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
            className="p-2 rounded-full bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors"
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
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-black text-gray-600 dark:text-gray-300 text-xs border border-gray-200 dark:border-slate-700">
                    {it.qty}x
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 dark:text-gray-100 leading-tight text-sm">
                      {it.name}
                    </div>
                    {!isReward && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {formatPrice(it.price_cents)} / u
                      </div>
                    )}
                  </div>
                </div>
                {isReward && <Gift size={18} className="text-purple-500" />}
              </div>
            ))}
          </div>

          {/* ÉTATS (STATUS) */}
          {isReward && (
            <div className="bg-purple-600 dark:bg-purple-600 text-white rounded-2xl p-4 text-center shadow-lg shadow-purple-500/30">
              <div className="font-black text-base mb-1 flex items-center justify-center gap-2">
                <Gift className="animate-bounce" size={18} /> C'est gagné !
              </div>
              <div className="text-purple-100 text-xs font-medium leading-snug">
                Présentez ce QR code au bar pour récupérer votre lot.
              </div>
            </div>
          )}

          {!isReward && order.status === "created" && (
            <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex gap-3 items-center">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                <Hourglass
                  className="text-gray-400 dark:text-gray-300"
                  size={20}
                />
              </div>
              <div>
                <div className="font-black text-gray-800 dark:text-white text-sm">
                  En attente du scan
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Présentez ce code au vendeur.
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
              <div className="font-black flex items-center gap-2 mb-1 text-sm">
                <Banknote size={18} /> Paiement Espèces
              </div>
              <div className="text-xs opacity-90">
                Veuillez régler au comptoir.
              </div>
            </div>
          )}

          {order.status === "paid" && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 text-emerald-800 dark:text-emerald-200">
              <div className="font-black flex items-center gap-2 mb-1 text-sm">
                <CheckCircle2 size={18} /> Commande Payée !
              </div>
              <div className="text-xs opacity-90">
                Vous pouvez récupérer vos articles.
              </div>
            </div>
          )}

          {order.status === "served" && (
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl p-4 text-center shadow-lg">
              <div className="font-black flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 size={18} /> Commande Terminée
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                Bon appétit !
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
