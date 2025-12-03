import React, { useState, useMemo } from "react";
import { getCreatedMs } from "../utils/orders.js";

export default function AdminHistoryTab({ orders }) {
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");

  const historyOrders = useMemo(() => {
    const q = historyQuery.trim().toUpperCase();
    return orders
      .filter((o) => o.status !== "expired")
      .filter((o) =>
        historyFilter === "all"
          ? ["paid", "served"].includes(o.status)
          : o.status === historyFilter
      )
      .filter((o) =>
        !q
          ? true
          : String(o.qr_token || "")
              .toUpperCase()
              .includes(q)
      );
  }, [orders, historyFilter, historyQuery]);

  const fmtTime = (o) => {
    const ms = getCreatedMs(o);
    if (!ms) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
          className="flex-1 p-2 rounded-lg border bg-white text-sm font-bold"
        >
          <option value="all">Tous</option>
          <option value="served">Servis</option>
        </select>
        <input
          value={historyQuery}
          onChange={(e) => setHistoryQuery(e.target.value)}
          placeholder="#CODE"
          className="flex-1 p-2 rounded-lg border text-sm"
        />
      </div>
      {historyOrders.map((o) => (
        <div
          key={o.id}
          className="bg-white p-3 rounded-xl shadow-sm border text-sm flex justify-between opacity-70"
        >
          <div>
            <span className="font-mono font-bold">#{o.qr_token}</span> -{" "}
            {fmtTime(o)}
          </div>
          <div className="font-bold uppercase">{o.status}</div>
        </div>
      ))}
    </div>
  );
}
