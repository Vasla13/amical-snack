import React, { useMemo } from "react";
import { formatPrice } from "../../../lib/format.js";
import { TrendingUp, Award, DollarSign, ShoppingCart } from "lucide-react";

export default function AdminStatsTab({ orders }) {
  const stats = useMemo(() => {
    // On ne compte que les commandes payées ou servies
    const validOrders = orders.filter(
      (o) => o.status === "paid" || o.status === "served"
    );

    // 1. Chiffre d'affaires total
    const totalRevenue = validOrders.reduce(
      (sum, o) => sum + (o.total_cents || 0),
      0
    );

    // 2. Produit le plus vendu
    const productCounts = {};
    validOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const name = item.name;
        productCounts[name] = (productCounts[name] || 0) + (item.qty || 1);
      });
    });

    // Conversion en tableau trié
    const sortedProducts = Object.entries(productCounts).sort(
      (a, b) => b[1] - a[1]
    );
    const bestSeller = sortedProducts[0];

    // 3. Panier moyen
    const averageCart = validOrders.length
      ? totalRevenue / validOrders.length
      : 0;

    return { totalRevenue, bestSeller, averageCart, count: validOrders.length };
  }, [orders]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
          <div className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <DollarSign size={14} /> Revenus
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatPrice(stats.totalRevenue)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-28">
          <div className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <TrendingUp size={14} /> Commandes
          </div>
          <div className="text-2xl font-black text-slate-800">
            {stats.count}
          </div>
        </div>
      </div>

      {/* Best Seller Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-3xl text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-80 font-bold text-xs uppercase tracking-widest">
            <Award size={16} /> Best Seller
          </div>
          <div className="text-3xl font-black mb-1 truncate">
            {stats.bestSeller ? stats.bestSeller[0] : "—"}
          </div>
          <div className="text-sm font-medium opacity-80">
            Vendu{" "}
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md">
              {stats.bestSeller ? stats.bestSeller[1] : 0}
            </span>{" "}
            fois
          </div>
        </div>
      </div>

      {/* Average Cart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <ShoppingCart size={20} />
          </div>
          <div className="text-sm font-bold text-slate-500">Panier moyen</div>
        </div>
        <div className="text-xl font-black text-slate-800">
          {formatPrice(stats.averageCart)}
        </div>
      </div>
    </div>
  );
}
