import React, { useMemo } from "react";
import { CheckCircle2, Hourglass, Banknote, X } from "lucide-react";
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
  if (!order) return null;

  const totalCents = Number(order?.total_cents || 0);

  const itemsSummary = useMemo(() => {
    const list = order?.items || [];
    const map = new Map();
    for (const it of list) {
      const key = it.id || it.name;
      const prev = map.get(key);
      if (prev) map.set(key, { ...prev, qty: (prev.qty || 0) + (it.qty || 0) });
      else map.set(key, { ...it });
    }
    return Array.from(map.values()).sort((a, b) => (b.qty || 0) - (a.qty || 0));
  }, [order?.items]);

  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-gray-400">
              Commande
            </div>
            <div className="font-black text-3xl tracking-widest font-mono text-gray-900">
              #{order.qr_token}
            </div>
            <div className="mt-1 text-sm text-gray-600 font-bold">
              Total :{" "}
              <span className="text-teal-700">{formatPrice(totalCents)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"
            aria-label="Fermer"
          >
            <X />
          </button>
        </div>

        {/* ✅ QR */}
        <QRPanel token={order.qr_token} />

        <div className="p-4">
          <div className="text-xs font-black uppercase text-gray-400 mb-2">
            Résumé
          </div>
          <div className="space-y-2">
            {itemsSummary.map((it, idx) => (
              <div
                key={(it.id || it.name) + "-" + idx}
                className="flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 truncate">
                    {it.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPrice(it.price_cents || 0)} / unité
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {it.qty}
                </div>
              </div>
            ))}
          </div>

          {order.status === "created" && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 font-black text-gray-800">
                <Hourglass size={18} /> Attente du vendeur…
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Le vendeur scanne ton QR ou tape ton code.
              </div>
            </div>
          )}

          {order.status === "scanned" && (
            <PaymentMethods
              order={order}
              user={user}
              onPay={onPay}
              onRequestCash={onRequestCash}
            />
          )}

          {order.status === "cash" && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="font-black text-yellow-800 flex items-center gap-2">
                <Banknote size={18} /> Paiement en espèces demandé
              </div>
              <div className="text-sm text-yellow-800 mt-1">
                Va voir le vendeur : il a été notifié.
              </div>
            </div>
          )}

          {order.status === "paid" && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="font-black text-green-800 flex items-center gap-2">
                <CheckCircle2 size={18} /> Paiement accepté
              </div>
              <div className="text-sm text-green-800 mt-1">
                Le vendeur te donne les produits.
              </div>
            </div>
          )}

          {order.status === "served" && (
            <div className="mt-4 bg-gray-900 text-white rounded-2xl p-4">
              <div className="font-black flex items-center gap-2">
                <CheckCircle2 size={18} /> Commande terminée
              </div>
              <div className="text-sm text-gray-200 mt-1">Merci 👌</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
