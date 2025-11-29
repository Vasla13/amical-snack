import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
import { useAuth } from "../../context/AuthContext.jsx";

export default function PassScreen({ db, onPay, onRequestCash }) {
  const { userData: user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    // 1. REQUÊTE SIMPLIFIÉE (Pour éviter les bugs d'index Firestore)
    // On ne demande que les commandes de l'utilisateur, sans tri complexe côté serveur.
    const q = query(collection(db, "orders"), where("user_id", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (s) => {
        // 2. TRI ET FILTRE CÔTÉ CLIENT (JavaScript) -> C'est instantané
        const loadedOrders = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          // On garde seulement les statuts actifs
          .filter((o) =>
            ["created", "scanned", "cash", "paid", "reward_pending"].includes(
              o.status
            )
          )
          // On trie par date (le plus récent en haut)
          .sort((a, b) => {
            const tA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
            const tB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
            return tB - tA;
          });

        setOrders(loadedOrders);
      },
      (error) => {
        console.error("Erreur temps réel PassScreen :", error);
      }
    );

    return () => unsub();
  }, [user, db]);

  // Si on clique sur une commande, on affiche son détail
  if (selectedOrder) {
    // On s'assure que l'order affiché est bien à jour avec les données du live
    const liveOrder =
      orders.find((o) => o.id === selectedOrder.id) || selectedOrder;

    return (
      <OrderFlow
        order={liveOrder}
        user={user}
        onPay={(method) => onPay(method, liveOrder)}
        onRequestCash={() => onRequestCash(liveOrder)}
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
