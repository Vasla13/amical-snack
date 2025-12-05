import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { CheckCircle2, Clock, ChefHat } from "lucide-react";
import { formatPrice } from "../../lib/format";
import { Order } from "../../types";

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Écoute uniquement les commandes payées non servies
    const q = query(
      collection(db, "orders"),
      where("status", "==", "paid"),
      orderBy("paid_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      // Détection de nouvelles commandes pour le son
      if (newOrders.length > orders.length && orders.length > 0) {
        const audio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        );
        audio.play().catch(() => {});
      }

      setOrders(newOrders);
    });

    return () => unsubscribe();
  }, []); // Retrait de 'orders' des deps pour éviter boucle infinie sur le son

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <h1 className="text-4xl font-black flex items-center gap-4">
          <ChefHat size={48} className="text-yellow-400" />
          ÉCRAN CUISINE
        </h1>
        <div className="text-xl font-bold bg-slate-800 px-6 py-2 rounded-xl">
          {orders.length} en attente
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-600">
          <CheckCircle2 size={96} className="mb-4 opacity-20" />
          <p className="text-2xl font-bold">Tout est calme...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800 border-l-8 border-yellow-400 rounded-r-3xl p-6 shadow-2xl relative animate-in zoom-in duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl font-mono font-black text-white">
                  #{order.qr_token}
                </span>
                <span className="bg-slate-700 px-3 py-1 rounded-lg text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Clock size={14} />
                  {order.paid_at?.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-baseline border-b border-slate-700/50 pb-2 last:border-0"
                  >
                    <span className="text-2xl font-black text-yellow-400 mr-3">
                      {item.qty}x
                    </span>
                    <span className="text-xl font-bold text-slate-100 truncate flex-1">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-slate-400 text-sm font-medium">
                <span>Total: {formatPrice(order.total_cents)}</span>
                <span className="uppercase tracking-wider">Payé</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
