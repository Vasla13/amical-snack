import React, { useState } from "react";
import { updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { Camera, Banknote, Gift, Package, QrCode } from "lucide-react";
import ScannerModal from "../components/ScannerModal.jsx";
import TicketBon from "../components/TicketBon.jsx";
import { isExpired, getCreatedMs } from "../utils/orders.js";
import { formatPrice } from "../../../lib/format.js";

export default function AdminOrdersTab({
  db,
  orders,
  loading,
  ttlMs,
  setFeedback,
}) {
  const [scanInput, setScanInput] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const activeOrders = orders.filter((o) =>
    ["created", "scanned", "cash", "paid", "reward_pending"].includes(o.status)
  );

  const fmtTime = (o) => {
    const ms = getCreatedMs(o);
    if (!ms) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  };

  // CORRECTION: Nettoyage de l'URL pour ne garder que le token
  const cleanToken = (input) => {
    if (!input) return "";
    const val = String(input).trim();
    if (val.includes("/")) {
      return val.split("/").pop().toUpperCase();
    }
    return val.toUpperCase();
  };

  const handleValidate = async () => {
    setFeedback(null);
    const token = cleanToken(scanInput);
    if (!token) return;

    try {
      const order = orders.find(
        (o) => String(o.qr_token || "").toUpperCase() === token
      );

      if (!order) {
        setFeedback({ type: "error", msg: `Code introuvable : ${token}` });
        return;
      }
      if (order.status === "scanned") {
        setFeedback({
          type: "success",
          msg: "Déjà scanné ! En attente paiement.",
        });
        setScanInput("");
        return;
      }
      if (order.status === "paid" || order.status === "served") {
        setFeedback({ type: "success", msg: "Déjà payé/servi." });
        setScanInput("");
        return;
      }
      if (order.status === "expired") {
        setFeedback({ type: "error", msg: "EXPIRÉ." });
        return;
      }

      const isReward = order.status === "reward_pending";
      if (!isReward && isExpired(order, ttlMs)) {
        await updateDoc(doc(db, "orders", order.id), { status: "expired" });
        setFeedback({ type: "error", msg: "Trop tard ! Expiré." });
        return;
      }

      await updateDoc(doc(db, "orders", order.id), { status: "scanned" });
      setFeedback({
        type: "success",
        msg: isReward ? "CADEAU VALIDÉ !" : "SCAN OK ! En attente paiement.",
      });
      setScanInput("");
    } catch (err) {
      setFeedback({ type: "error", msg: "Erreur : " + err.message });
    }
  };

  const confirmCash = async (o) => {
    if (!confirm("Confirmer la réception des espèces ?")) return;
    try {
      await updateDoc(doc(db, "orders", o.id), {
        status: "paid",
        paid_at: serverTimestamp(),
        payment_method: "cash",
        points_earned: Number(o.total_cents || 0) / 100,
      });
      if (o.user_id) {
        const uRef = doc(db, "users", o.user_id);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const cur = Number(uSnap.data().points || 0);
          await updateDoc(uRef, { points: cur + Number(o.total_cents) / 100 });
        }
      }
      setFeedback({ type: "success", msg: "Paiement validé !" });
    } catch (e) {
      alert(e.message);
    }
  };

  const handleServe = async (orderId) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "served",
        served_at: serverTimestamp(),
      });
      setFeedback({ type: "success", msg: "Commande servie et archivée." });
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(t) => t && setScanInput(cleanToken(t))}
      />

      <div className="bg-white p-2 rounded-2xl shadow-lg shadow-slate-200 border border-slate-100 flex gap-2 sticky top-0 z-10">
        <button
          onClick={() => setScannerOpen(true)}
          className="bg-slate-900 text-white w-14 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <Camera size={24} />
        </button>
        <div className="flex-1 relative">
          <QrCode
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value.toUpperCase())}
            placeholder="CODE..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-teal-500 rounded-xl font-mono text-lg font-black uppercase outline-none transition-all placeholder:text-slate-300"
          />
        </div>
        <button
          onClick={handleValidate}
          disabled={!scanInput}
          className="bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 rounded-xl font-black shadow-md active:scale-95 transition-all"
        >
          OK
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase">
            Chargement...
          </p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="text-center text-slate-400 py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <Package className="mx-auto mb-2 opacity-20" size={40} />
          <p className="font-bold text-sm">Aucune commande en cours</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map((o) => {
            const isReward =
              o.status === "reward_pending" ||
              (o.items[0]?.price_cents === 0 && o.status !== "created");

            return (
              <div
                key={o.id}
                className={`bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 relative overflow-hidden transition-all ${
                  isReward
                    ? "ring-2 ring-purple-100"
                    : o.status === "paid"
                    ? "ring-2 ring-emerald-100"
                    : ""
                }`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isReward
                      ? "bg-purple-500"
                      : o.status === "paid"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />

                <div className="pl-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-2xl text-slate-800 tracking-tighter">
                          #{o.qr_token}
                        </span>
                        {isReward && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                            Cadeau
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <span>{fmtTime(o)}</span> •{" "}
                        <span className="uppercase">{o.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-xl text-slate-900">
                        {formatPrice(o.total_cents)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl mb-4">
                    {o.items.map((i, idx) => (
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
                    {o.status === "cash" && (
                      <button
                        onClick={() => confirmCash(o)}
                        className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-95 transition-transform"
                      >
                        <Banknote size={18} /> ENCAISSER
                      </button>
                    )}
                    {(o.status === "paid" ||
                      (o.status === "scanned" && isReward)) && (
                      <button
                        onClick={() => handleServe(o.id)}
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

                  {o.status === "paid" && <TicketBon order={o} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
