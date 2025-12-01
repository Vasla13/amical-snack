import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import {
  Ticket,
  ShoppingBag,
  ChevronRight,
  Gift,
  Clock,
  QrCode,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import OrderFlow from "./OrderFlow.jsx";
import { formatPrice } from "../../lib/format.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";

export default function PassScreen({ db, onPay, onRequestCash }) {
  const { userData: user } = useAuth();
  const { addToCart } = useCart();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [autoOpenId, setAutoOpenId] = useState(location.state?.openOrderId);

  const handleReorder = (orderItems) => {
    let count = 0;
    orderItems.forEach((item) => {
      for (let i = 0; i < (item.qty || 1); i++) {
        addToCart(item);
        count++;
      }
    });
    alert(`${count} articles ajoutés au panier !`);
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "orders"), where("user_id", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (s) => {
        const loadedOrders = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) =>
            [
              "created",
              "scanned",
              "cash",
              "paid",
              "served",
              "reward_pending",
            ].includes(o.status)
          )
          .sort((a, b) => {
            const tA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
            const tB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
            return tB - tA;
          });
        setOrders(loadedOrders);
      },
      (error) => console.error("Erreur PassScreen :", error)
    );
    return () => unsub();
  }, [user, db]);

  useEffect(() => {
    if (autoOpenId && orders.length > 0) {
      const target = orders.find((o) => o.id === autoOpenId);
      if (target) {
        setSelectedOrder(target);
        setAutoOpenId(null);
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
    <div className="p-4 min-h-full bg-slate-50 dark:bg-slate-950 pb-24 transition-colors">
      <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-700 dark:text-teal-400">
          <Ticket size={22} />
        </div>
        Mes Commandes
      </h1>

      {coupons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
            <Gift size={14} /> Récompenses
          </h2>
          <div className="space-y-3">
            {coupons.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full bg-white dark:bg-slate-900 p-4 rounded-3xl border border-purple-100 dark:border-purple-900/50 shadow-sm shadow-purple-100/50 dark:shadow-none flex items-center justify-between active:scale-95 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/30">
                    🎁
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-none mb-1">
                      {order.items?.[0]?.name || "Cadeau"}
                    </div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full inline-block uppercase tracking-wider">
                      À récupérer
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30 transition-colors">
                  <ChevronRight
                    size={18}
                    className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 dark:group-hover:text-purple-400"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 pl-1">
          <ShoppingBag size={14} /> En cours & Historique
        </h2>

        {regularOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <ShoppingBag
                size={24}
                className="text-slate-300 dark:text-slate-600"
              />
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
              Aucune commande active.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {regularOrders.map((order) => {
              const isPaid =
                order.status === "paid" || order.status === "served";
              return (
                <div key={order.id} className="relative group">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="w-full bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none flex items-center justify-between active:scale-95 transition-all relative overflow-hidden pr-14"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        isPaid ? "bg-emerald-500" : "bg-teal-500"
                      }`}
                    />
                    <div className="flex items-center gap-4 pl-3">
                      <div className="text-left">
                        <div className="font-black text-slate-800 dark:text-white text-xl mb-1">
                          {formatPrice(order.total_cents || 0)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <Clock size={12} />
                          {order.items?.length} article(s) •{" "}
                          {new Date(
                            order.created_at?.toMillis
                              ? order.created_at.toMillis()
                              : Date.now()
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isPaid
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReorder(order.items);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-400 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                    title="Commander à nouveau"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
