import React, { useState } from "react";
import { updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { Camera, QrCode, Package } from "lucide-react";
import ScannerModal from "../components/ScannerModal.jsx";
import AdminOrderCard from "../components/AdminOrderCard.jsx"; // IMPORT
import { isExpired } from "../utils/orders.js";

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
          {activeOrders.map((o) => (
            <AdminOrderCard
              key={o.id}
              order={o}
              onConfirmCash={confirmCash}
              onServe={handleServe}
            />
          ))}
        </div>
      )}
    </div>
  );
}
