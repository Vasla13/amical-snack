import React, { useMemo } from "react";
import { Printer } from "lucide-react";
import { groupItems, methodLabel } from "../utils/orders.js";
import { formatPrice } from "../../../lib/format.js";

function openPrintTicket(order) {
  const items = groupItems(order.items);
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const lines = items
    .map((it) => {
      const name = String(it.name || "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const qty = Number(it.qty || 0);
      const unit = formatPrice(Number(it.price_cents || 0));
      const total = formatPrice(Number(it.price_cents || 0) * qty);
      return `
        <div class="row">
          <div class="qty">${qty}x</div>
          <div class="name">${name}</div>
          <div class="unit">${unit}</div>
          <div class="sum">${total}</div>
        </div>
      `;
    })
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ticket #${order.qr_token}</title>
<style>
  body { font-family: ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace; padding: 16px; }
  .ticket { max-width: 380px; margin: 0 auto; border: 2px dashed #111; padding: 12px; }
  .h1 { font-weight: 900; font-size: 18px; text-align:center; }
  .meta { margin-top: 10px; font-size: 12px; }
  .meta div { display:flex; justify-content: space-between; gap: 10px; }
  .sep { border-top: 1px dashed #111; margin: 10px 0; }
  .row { display:grid; grid-template-columns: 42px 1fr 78px 78px; gap: 8px; align-items: baseline; font-size: 12px; }
  .qty { font-weight: 900; font-size: 14px; }
  .unit, .sum { text-align:right; }
  .total { display:flex; justify-content: space-between; font-size: 14px; font-weight: 900; }
  @media print { body { padding: 0; } .ticket { border: none; } }
</style></head><body>
  <div class="ticket">
    <div class="h1">AMICALE R&T — TICKET</div>
    <div class="meta">
      <div><span>Commande</span><span>#${order.qr_token}</span></div>
      <div><span>Date</span><span>${dateStr}</span></div>
      <div><span>Paiement</span><span>${
        methodLabel(order.payment_method) || "-"
      }</span></div>
    </div>
    <div class="sep"></div>
    ${lines}
    <div class="sep"></div>
    <div class="total"><span>TOTAL</span><span>${formatPrice(
      Number(order.total_cents || 0)
    )}</span></div>
  </div>
<script>window.focus(); window.print();</script>
</body></html>`;

  const w = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=480,height=720"
  );
  if (!w) return alert("Popup bloquée. Autorise les popups pour imprimer.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function TicketBon({ order }) {
  const items = useMemo(() => groupItems(order.items), [order.items]);
  const totalQty = useMemo(
    () => items.reduce((s, it) => s + (it.qty || 0), 0),
    [items]
  );

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase text-gray-500">
            Bon de commande
          </div>
          <div className="text-sm font-black text-gray-900">
            #{order.qr_token} • {methodLabel(order.payment_method) || "—"}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Total articles : <span className="font-black">{totalQty}</span>
          </div>
        </div>

        <button
          onClick={() => openPrintTicket(order)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-black text-xs flex items-center gap-2"
        >
          <Printer size={16} /> Imprimer
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((it, idx) => {
          const qty = Number(it.qty || 0);
          const unit = Number(it.price_cents || 0);
          const sub = unit * qty;

          return (
            <div
              key={(it.id || it.name || "it") + "-" + idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-2xl">
                  {qty}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-gray-900 truncate">
                    {it.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPrice(unit)} / unité
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-900">
                  {formatPrice(sub)}
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500">
                  sous-total
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl bg-gray-900 text-white p-3 flex items-center justify-between">
        <div className="font-black">TOTAL</div>
        <div className="font-black text-lg">
          {formatPrice(Number(order.total_cents || 0))}
        </div>
      </div>
    </div>
  );
}
