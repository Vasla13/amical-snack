import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Ticket,
  ShoppingBag,
  ChevronRight,
  Gift,
  Clock,
  QrCode,
} from "lucide-react";
import OrderFlow from "./OrderFlow.jsx";
import { formatPrice } from "../../lib/format.js";

export default function PassScreen({ user, db, onPay, onRequestCash }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    // Requête pour récupérer tes commandes et coupons
    const q = query(
      collection(db, "orders"),
      where("user_id", "==", user.uid),
      where("status", "in", [
        "created",
        "scanned",
        "cash",
        "paid",
        "reward_pending",
      ]),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(
      q,
      (s) => {
        setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Erreur index ou permission :", error);
        // Si erreur d'index (très probable), on ne plante pas l'app
      }
    );

    return () => unsub();
  }, [user, db]);

  // Si on clique sur une commande, on affiche son détail (QR Code)
  if (selectedOrder) {
    return (
      <OrderFlow
        order={selectedOrder}
        user={user}
        onPay={onPay}
        onRequestCash={onRequestCash}
        onClose={() => setSelectedOrder(null)}
      />
    );
  }

  const coupons = orders.filter((o) => o.status === "reward_pending");
  const regularOrders = orders.filter((o) => o.status !== "reward_pending");

  return (
    <div className="p-4 min-h-full bg-gray-50 pb-24">
      <h1 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
        <Ticket className="text-teal-700" /> Mon Pass
      </h1>

      {/* SECTION CADEAUX */}
      {coupons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-black text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Gift size={16} /> Mes Récompenses
          </h2>
          <div className="space-y-3">
            {coupons.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between active:scale-95 transition-all relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-2xl">
                    🎁
                  </div>
                  <div className="text-left">
                    <div className="font-black text-gray-800 text-lg leading-none mb-1">
                      {order.items?.[0]?.name || "Cadeau"}
                    </div>
                    <div className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded inline-block">
                      À récupérer
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION COMMANDES */}
      <div>
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShoppingBag size={16} /> Commandes en cours
        </h2>

        {regularOrders.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 border-dashed">
            <div className="text-gray-300 mb-2">
              <ShoppingBag size={48} className="mx-auto" />
            </div>
            <p className="text-gray-400 text-sm font-medium">
              Aucune commande active.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {regularOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-95 transition-all relative overflow-hidden"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    order.status === "paid" ? "bg-green-500" : "bg-teal-500"
                  }`}
                />
                <div className="text-left pl-2">
                  <div className="font-black text-gray-800 text-lg mb-1">
                    {formatPrice(order.total_cents || 0)}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} />
                    {order.items?.length} article(s) •{" "}
                    <span className="uppercase font-bold">{order.status}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <QrCode size={20} className="text-gray-700" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
