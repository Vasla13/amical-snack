import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc, // ✅ AJOUTÉ
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import {
  Camera,
  Clock,
  LogOut,
  Package,
  History,
  Banknote,
  Gift, // Ajout
} from "lucide-react";

import ScannerModal from "./components/ScannerModal.jsx";
import TicketBon from "./components/TicketBon.jsx";
import { isExpired, getCreatedMs, methodLabel } from "./utils/orders.js";

import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

export default function AdminDashboard({ db, products, onLogout }) {
  const ORDER_TTL_MS = 10 * 60 * 1000;

  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [adminTab, setAdminTab] = useState("orders");
  const [scannerOpen, setScannerOpen] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [stockQuery, setStockQuery] = useState("");

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Stream orders
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "orders"), orderBy("created_at", "desc")),
      (s) =>
        setOrders(
          s.docs.map((d) => ({
            id: d.id,
            ...d.data({ serverTimestamps: "estimate" }),
          }))
        )
    );
  }, [db]);

  // Expire function
  const expireOrdersNow = async () => {
    const list = ordersRef.current || [];
    // On n'expire pas les rewards
    const toExpire = list.filter(
      (o) =>
        o.status !== "reward_pending" &&
        isExpired(o, ORDER_TTL_MS) &&
        ["created", "scanned", "cash"].includes(o.status)
    );
    if (!toExpire.length) return;

    await Promise.all(
      toExpire.map((o) =>
        updateDoc(doc(db, "orders", o.id), { status: "expired" })
      )
    );
  };

  useEffect(() => {
    expireOrdersNow();
    const i = setInterval(expireOrdersNow, 30_000);
    return () => clearInterval(i);
    // eslint-disable-next-line
  }, [db]);

  const fmtTime = (o) => {
    const ms = getCreatedMs(o);
    if (!ms) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  };

  const handleValidate = async () => {
    await expireOrdersNow();
    const token = scanInput.trim().toUpperCase();
    if (!token) return;

    const order = (ordersRef.current || []).find((o) => {
      const same = String(o.qr_token || "").toUpperCase() === token;
      // Accepter "created" OU "reward_pending"
      const okStatus = ["created", "reward_pending"].includes(o.status);
      // Les rewards n'expirent pas, les autres si
      const notExpired =
        o.status === "reward_pending" ? true : !isExpired(o, ORDER_TTL_MS);
      return same && okStatus && notExpired;
    });

    if (!order) return alert("Code invalide, expiré, ou déjà scanné.");

    await updateDoc(doc(db, "orders", order.id), { status: "scanned" });
    setScanInput("");
  };

  const confirmCash = async (o) => {
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
  };

  const handleServe = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), {
      status: "served",
      served_at: serverTimestamp(),
    });
  };

  const seed = async () => {
    if (!confirm("⚠️ Reset stock ?")) return;
    const snap = await getDocs(collection(db, "products"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    for (const item of SEED_PRODUCTS) {
      await addDoc(collection(db, "products"), { ...item, is_available: true });
    }
    alert("✅ Stock réinitialisé !");
  };

  const toggleAvailability = async (p) => {
    await updateDoc(doc(db, "products", p.id), {
      is_available: !p.is_available,
    });
  };

  const setStockQty = async (p, qty) => {
    const n = qty === "" ? null : Number(qty);
    if (n !== null && (!Number.isFinite(n) || n < 0)) return;
    await updateDoc(doc(db, "products", p.id), { stock_qty: n });
  };

  const activeOrders = useMemo(() => {
    return orders.filter((o) =>
      ["created", "scanned", "cash", "paid", "reward_pending"].includes(
        o.status
      )
    );
  }, [orders]);

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

  const stockList = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    const list = [...(products || [])];
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list.filter((p) =>
      !q ? true : (p.name || "").toLowerCase().includes(q)
    );
  }, [products, stockQuery]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(token) => token && setScanInput(String(token).toUpperCase())}
      />

      <div className="flex justify-between items-center mb-4 gap-3">
        <h1 className="font-black text-2xl text-gray-800">ADMIN R&T</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={seed}
            className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md"
          >
            Reset stock
          </button>
          <button
            onClick={onLogout}
            className="bg-white border text-gray-800 px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <LogOut size={16} /> Déco
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAdminTab("orders")}
          className={`flex-1 px-3 py-2 rounded-xl font-bold text-sm flex justify-center gap-2 border ${
            adminTab === "orders"
              ? "bg-teal-700 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          <Camera size={16} /> Commandes
        </button>
        <button
          onClick={() => setAdminTab("history")}
          className={`flex-1 px-3 py-2 rounded-xl font-bold text-sm flex justify-center gap-2 border ${
            adminTab === "history"
              ? "bg-teal-700 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          <History size={16} /> Historique
        </button>
        <button
          onClick={() => setAdminTab("stock")}
          className={`flex-1 px-3 py-2 rounded-xl font-bold text-sm flex justify-center gap-2 border ${
            adminTab === "stock"
              ? "bg-teal-700 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          <Package size={16} /> Stock
        </button>
      </div>

      {adminTab === "orders" && (
        <div className="space-y-4">
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
              className="bg-gray-900 text-white px-4 rounded-xl font-bold"
            >
              OK
            </button>
          </div>

          {activeOrders.map((o) => {
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
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded uppercase">
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
          })}
          {activeOrders.length === 0 && (
            <div className="text-center text-gray-400 italic py-6">
              Rien en cours
            </div>
          )}
        </div>
      )}

      {adminTab === "stock" && (
        <div className="space-y-2">
          <input
            value={stockQuery}
            onChange={(e) => setStockQuery(e.target.value)}
            placeholder="Chercher..."
            className="w-full p-3 rounded-xl border mb-4"
          />
          {stockList.map((p) => (
            <div
              key={p.id}
              className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm"
            >
              <div className="font-bold text-sm truncate pr-2">{p.name}</div>
              <button
                onClick={() => toggleAvailability(p)}
                className={`px-3 py-1 rounded-lg text-xs font-black border ${
                  p.is_available
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {p.is_available ? "STOCK" : "RUPTURE"}
              </button>
            </div>
          ))}
        </div>
      )}

      {adminTab === "history" && (
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
      )}
    </div>
  );
}
