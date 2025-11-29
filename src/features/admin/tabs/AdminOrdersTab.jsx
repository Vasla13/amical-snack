import React, { useState } from "react";
import { updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { Camera, Banknote, Gift, Package } from "lucide-react";
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

  const handleValidate = async () => {
    setFeedback(null);
    const token = scanInput.trim().toUpperCase();
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
    if (!confirm("Paiement espèces reçu ?")) return;
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
      setFeedback({ type: "success", msg: "Encaissement validé !" });
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
      setFeedback({ type: "success", msg: "Servi et archivé." });
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(t) => t && setScanInput(String(t).toUpperCase())}
      />

      <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-teal-600 flex gap-2">
        <button
          onClick={() => setScannerOpen(true)}
          className="bg-teal-700 text-white w-14 rounded-xl flex items-center justify-center"
        >
          <Camera />
        </button>
        <input
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value.toUpperCase())}
          placeholder="SCAN..."
          className="flex-1 p-3 border-2 rounded-xl font-mono text-center text-xl font-black uppercase"
        />
        <button
          onClick={handleValidate}
          className="bg-gray-900 text-white px-4 rounded-xl font-bold active:scale-95 transition-transform"
        >
          OK
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-4 font-bold">
          Chargement...
        </p>
      ) : activeOrders.length === 0 ? (
        <div className="text-center text-gray-400 italic py-6">
          Aucune commande.
        </div>
      ) : (
        activeOrders.map((o) => {
          const isReward =
            o.status === "reward_pending" ||
            (o.items[0]?.price_cents === 0 && o.status !== "created");
          return (
            <div
              key={o.id}
              className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                isReward
                  ? "border-purple-500"
                  : o.status === "paid"
                  ? "border-green-500"
                  : "border-gray-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-xl">
                      #{o.qr_token}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-600">
                      {fmtTime(o)}
                    </span>
                    {isReward && (
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-1 rounded">
                        CADEAU
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                        o.status === "scanned"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-gray-600 mt-1">
                    {o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                  </div>
                </div>
                <div className="text-right font-black text-lg">
                  {formatPrice(o.total_cents)}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {o.status === "cash" && (
                  <button
                    onClick={() => confirmCash(o)}
                    className="flex-1 bg-yellow-400 text-black font-black py-3 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <Banknote size={16} /> REÇU ESPÈCES
                  </button>
                )}
                {(o.status === "paid" ||
                  (o.status === "scanned" && isReward)) && (
                  <button
                    onClick={() => handleServe(o.id)}
                    className={`flex-1 font-black py-3 rounded-lg text-sm flex items-center justify-center gap-2 text-white ${
                      isReward ? "bg-purple-600" : "bg-green-600"
                    }`}
                  >
                    {isReward ? (
                      <>
                        <Gift size={16} /> DONNER CADEAU
                      </>
                    ) : (
                      <>
                        <Package size={16} /> SERVIR
                      </>
                    )}
                  </button>
                )}
              </div>
              {o.status === "paid" && <TicketBon order={o} />}
            </div>
          );
        })
      )}
    </div>
  );
}
