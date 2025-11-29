import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useLocation } from "react-router-dom"; // Import nécessaire pour lire l'état de navigation
import {
  Ticket,
  ShoppingBag,
  ChevronRight,
  Gift,
  Clock,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import OrderFlow from "./OrderFlow.jsx"; //
import { formatPrice } from "../../lib/format.js"; //
import { useAuth } from "../../context/AuthContext.jsx"; //

export default function PassScreen({ db, onPay, onRequestCash }) {
  const { userData: user } = useAuth();
  const location = useLocation(); // Récupération des données passées par Cart
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // On stocke l'ID à ouvrir automatiquement s'il existe
  const [autoOpenId, setAutoOpenId] = useState(location.state?.openOrderId);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, "orders"), where("user_id", "==", user.uid)); //

    const unsub = onSnapshot(
      q,
      (s) => {
        const loadedOrders = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) =>
            ["created", "scanned", "cash", "paid", "reward_pending"].includes(
              o.status
            )
          )
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

  // EFFET : Ouvrir automatiquement la commande dès qu'elle est chargée
  useEffect(() => {
    if (autoOpenId && orders.length > 0) {
      const target = orders.find((o) => o.id === autoOpenId);
      if (target) {
        setSelectedOrder(target);
        setAutoOpenId(null); // On reset pour ne pas le rouvrir si on ferme
        // Nettoyer l'historique pour éviter réouverture au refresh (optionnel)
        window.history.replaceState({}, "");
      }
    }
  }, [orders, autoOpenId]);

  if (selectedOrder) {
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
    <div className="p-4 min-h-full bg-slate-50 pb-24">
      <h1 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700">
          <Ticket size={22} />
        </div>
        Mes Commandes
      </h1>

      {/* SECTION CADEAUX */}
      {coupons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
            <Gift size={14} /> Récompenses
          </h2>
          <div className="space-y-3">
            {coupons.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full bg-white p-4 rounded-3xl border border-purple-100 shadow-sm shadow-purple-100/50 flex items-center justify-between active:scale-95 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/30">
                    🎁
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-800 text-lg leading-none mb-1">
                      {order.items?.[0]?.name || "Cadeau"}
                    </div>
                    <div className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-full inline-block uppercase tracking-wider">
                      À récupérer
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                  <ChevronRight
                    size={18}
                    className="text-slate-300 group-hover:text-purple-500"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION COMMANDES */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
          <ShoppingBag size={14} /> En cours
        </h2>

        {regularOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-slate-100 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <ShoppingBag size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Aucune commande active.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {regularOrders.map((order) => {
              const isPaid = order.status === "paid";
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center justify-between active:scale-95 transition-all group relative overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isPaid ? "bg-emerald-500" : "bg-teal-500"
                    }`}
                  />

                  <div className="flex items-center gap-4 pl-3">
                    <div className="text-left">
                      <div className="font-black text-slate-800 text-xl mb-1">
                        {formatPrice(order.total_cents || 0)}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Clock size={12} />
                        {order.items?.length} article(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-teal-50 text-teal-600"
                      }`}
                    >
                      {isPaid ? "Payé" : "En attente"}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-900 text-white"
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <QrCode size={20} />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
