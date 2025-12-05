import React from "react";
import { Banknote, Gift, Package } from "lucide-react";
import TicketBon from "./TicketBon";
import { formatPrice } from "../../../lib/format";
import { getCreatedMs } from "../utils/orders";
import { Order } from "../../../types";

interface AdminOrderCardProps {
  order: Order;
  onServe: (orderId: string) => void;
  onConfirmCash: (order: Order) => void;
}

export default function AdminOrderCard({
  order,
  onServe,
  onConfirmCash,
}: AdminOrderCardProps) {
  const isReward =
    order.status === "reward_pending" ||
    (order.items[0]?.price_cents === 0 && order.status !== "created");

  const fmtTime = (o: Order) => {
    const ms = getCreatedMs(o);
    if (!ms) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  };

  return (
    <div
      className={`bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 relative overflow-hidden transition-all ${
        isReward
          ? "ring-2 ring-purple-100"
          : order.status === "paid"
          ? "ring-2 ring-emerald-100"
          : ""
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isReward
            ? "bg-purple-500"
            : order.status === "paid"
            ? "bg-emerald-500"
            : "bg-slate-300"
        }`}
      />

      <div className="pl-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-black text-2xl text-slate-800 tracking-tighter">
                #{order.qr_token}
              </span>
              {isReward && (
                <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  Cadeau
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <span>{fmtTime(order)}</span> •{" "}
              <span className="uppercase">{order.status}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black text-xl text-slate-900">
              {formatPrice(order.total_cents)}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl mb-4">
          {order.items.map((i, idx) => (
            <div
              key={idx}
              className="flex justify-between text-sm py-0.5 first:pt-0 last:pb-0"
            >
              <span className="font-bold text-slate-700">
                <span className="text-slate-400 mr-2">{i.qty}x</span>
                {i.name}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {order.status === "cash" && (
            <button
              onClick={() => onConfirmCash(order)}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-95 transition-transform"
            >
              <Banknote size={18} /> ENCAISSER
            </button>
          )}
          {(order.status === "paid" ||
            (order.status === "scanned" && isReward)) && (
            <button
              onClick={() => onServe(order.id)}
              className={`flex-1 font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 text-white shadow-lg active:scale-95 transition-transform ${
                isReward
                  ? "bg-purple-600 shadow-purple-500/30"
                  : "bg-emerald-600 shadow-emerald-500/30"
              }`}
            >
              {isReward ? (
                <>
                  <Gift size={18} /> DONNER LOT
                </>
              ) : (
                <>
                  <Package size={18} /> SERVIR
                </>
              )}
            </button>
          )}
        </div>

        {order.status === "paid" && <TicketBon order={order} />}
      </div>
    </div>
  );
}
