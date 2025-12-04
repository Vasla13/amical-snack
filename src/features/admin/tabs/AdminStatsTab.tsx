import React from "react";
import { formatPrice } from "../../../lib/format";
import {
  TrendingUp,
  Award,
  DollarSign,
  ShoppingCart,
  LucideIcon,
} from "lucide-react";
import { useAdminStats } from "../hooks/useAdminStats";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  colorClass: string;
  sub?: string | number;
}

export default function AdminStatsTab({ orders }: { orders: any[] }) {
  const stats = useAdminStats(orders);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    colorClass,
    sub,
  }: StatCardProps) => (
    <div className="bg-white p-5 rounded-[1.2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden">
      <div
        className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 ${colorClass.replace(
          "text",
          "bg"
        )}`}
      />
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace(
            "text",
            "bg"
          )} ${colorClass}`}
        >
          <Icon size={18} />
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 tracking-tight">
          {value}
        </div>
        {sub && (
          <div className="text-[10px] font-bold text-slate-400 mt-1">{sub}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* GLOBAL REVENUE */}
      <div className="bg-slate-900 p-6 rounded-[1.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3 opacity-80">
            <DollarSign size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">
              Revenus Totaux
            </span>
          </div>
          <div className="text-4xl font-black tracking-tight mb-1">
            {formatPrice(stats.totalRevenue)}
          </div>
          <div className="text-sm font-medium text-slate-400">
            Sur {stats.count} commandes
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Commandes"
          value={stats.count}
          colorClass="text-blue-600"
        />
        <StatCard
          icon={ShoppingCart}
          label="Panier Moyen"
          value={formatPrice(stats.averageCart)}
          colorClass="text-orange-500"
        />
      </div>

      {/* BEST SELLER */}
      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-yellow-500" size={18} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Top Produit
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 leading-tight">
            {(stats.bestSeller ? stats.bestSeller[0] : "—") as React.ReactNode}
          </div>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-xl text-center min-w-[70px]">
          <div className="text-xl font-black text-slate-900 leading-none">
            {stats.bestSeller ? stats.bestSeller[1] : 0}
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
            Ventes
          </div>
        </div>
      </div>
    </div>
  );
}
