// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  Camera,
  Clock,
  LogOut,
  Package,
  History,
  Banknote,
} from "lucide-react";

import ScannerModal from "./components/ScannerModal.jsx";
import TicketBon from "./components/TicketBon.jsx";
import {
  isExpired,
  isExpirableStatus,
  getCreatedMs,
  methodLabel,
} from "./utils/orders.js";

import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

export default function AdminDashboard({ db, products, onLogout }) {
  // ⏳ commandes en cours (created/scanned/cash) expirent au bout de 10 min si pas terminées
  const ORDER_TTL_MS = 10 * 60 * 1000;

  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [adminTab, setAdminTab] = useState("orders");
  const [scannerOpen, setScannerOpen] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all"); // all | paid | served
  const [historyQuery, setHistoryQuery] = useState("");
  const [stockQuery, setStockQuery] = useState("");

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // 📡 stream orders
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

  // ⛔ expire
  const expireOrdersNow = async () => {
    const list = ordersRef.current || [];
    const toExpire = list.filter((o) => isExpired(o, ORDER_TTL_MS));
    if (!toExpire.length) return;

    await Promise.all(
      toExpire.map((o) =>
        updateDoc(doc(db, "orders", o.id), {
          status: "expired",
          expired_at: serverTimestamp(),
        })
      )
    );
  };

  useEffect(() => {
    expireOrdersNow();
    const i = setInterval(expireOrdersNow, 30_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const fmtTime = (o) => {
    const ms = getCreatedMs(o);
    if (!ms) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  };

  // ✅ validate (scan)
  const handleValidate = async () => {
    await expireOrdersNow();

    const token = scanInput.trim().toUpperCase();
    if (!token) return;

    const order = (ordersRef.current || []).find((o) => {
      const same = String(o.qr_token || "").toUpperCase() === token;
      const okStatus = o.status === "created";
      const notExpired = !isExpired(o, ORDER_TTL_MS);
      return same && okStatus && notExpired;
    });

    if (!order) return alert("Code invalide, expiré, ou déjà scanné.");

    await updateDoc(doc(db, "orders", order.id), { status: "scanned" });
    setScanInput("");
    alert("Code validé ! Le client peut payer.");
  };

  // 🎯 points = 1€ => 1 point
  const creditPointsForUser = async (userId, totalCents) => {
    if (!userId) return;
    const uref = doc(db, "users", userId);
    const snap = await getDoc(uref);

    const prev = snap.exists() ? Number(snap.data()?.points || 0) : 0;
    const prevCents = Math.round(prev * 100);
    const nextPoints = (prevCents + Number(totalCents || 0)) / 100;

    // setDoc merge pour éviter crash si user doc n'existe pas
    await setDoc(
      uref,
      {
        points: nextPoints,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const confirmCash = async (o) => {
    await updateDoc(doc(db, "orders", o.id), {
      status: "paid",
      paid_at: serverTimestamp(),
      payment_method: "cash",
      cash_received_at: serverTimestamp(),
      points_earned: Number(o.total_cents || 0) / 100,
    });

    if (o.user_id) {
      await creditPointsForUser(o.user_id, Number(o.total_cents || 0));
    }
  };

  const handleServe = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), {
      status: "served",
      served_at: serverTimestamp(),
    });
  };

  // 🧨 reset products
  const seed = async () => {
    if (!confirm("⚠️ Reset stock ? (supprime et recrée les produits)")) return;

    const snap = await getDocs(collection(db, "products"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    for (const item of SEED_PRODUCTS) {
      await addDoc(collection(db, "products"), {
        ...item,
        is_available: true,
        stock_qty: null,
        sort_order: 1,
        created_at: serverTimestamp(),
      });
    }

    alert("✅ Stock réinitialisé !");
  };

  const toggleAvailability = async (p) => {
    const available = p.is_available !== false;
    await updateDoc(doc(db, "products", p.id), {
      is_available: !available,
      updated_at: serverTimestamp(),
    });
  };

  const setStockQty = async (p, qty) => {
    const n = qty === "" ? null : Number(qty);
    if (n !== null && (!Number.isFinite(n) || n < 0)) return;

    await updateDoc(doc(db, "products", p.id), {
      stock_qty: n,
      updated_at: serverTimestamp(),
    });
  };

  // 🧾 derived lists
  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => o.status !== "expired")
      .filter((o) => o.status !== "served")
      .filter(
        (o) => !(isExpirableStatus(o.status) && isExpired(o, ORDER_TTL_MS))
      )
      .filter((o) => ["created", "scanned", "cash", "paid"].includes(o.status));
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
    list.sort(
      (a, b) =>
        (a.category || "").localeCompare(b.category || "") ||
        (a.name || "").localeCompare(b.name || "")
    );
    return list.filter((p) => {
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
      );
    });
  }, [products, stockQuery]);

  const TabBtn = ({ id, Icon, label }) => (
    <button
      onClick={() => setAdminTab(id)}
      className={`flex-1 px-3 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition ${
        adminTab === id
          ? "bg-teal-700 text-white border-teal-700"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(token) => token && setScanInput(String(token).toUpperCase())}
      />

      <div className="flex justify-between items-center mb-4 gap-3">
        <h1 className="font-black text-2xl text-gray-800">ADMIN R&amp;T</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={seed}
            className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-red-700"
          >
            🗑️ Reset stock
          </button>

          <button
            onClick={onLogout}
            className="bg-white border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <TabBtn id="orders" Icon={Camera} label="Commandes" />
        <TabBtn id="history" Icon={History} label="Historique" />
        <TabBtn id="stock" Icon={Package} label="Stock" />
      </div>

      {/* ===================== COMMANDES ===================== */}
      {adminTab === "orders" && (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border-2 border-teal-600">
            <h2 className="font-bold text-teal-800 mb-1 flex items-center gap-2 text-lg">
              <Camera className="text-teal-600" /> Scanner code client
            </h2>

            <p className="text-xs text-gray-500 mb-4 flex items-center gap-2">
              <Clock size={14} /> Expire après{" "}
              {Math.round(ORDER_TTL_MS / 60000)} min si non terminé.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <button
                  onClick={() => setScannerOpen(true)}
                  className="shrink-0 bg-teal-700 hover:bg-teal-800 text-white w-14 h-14 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Scanner QR"
                >
                  <Camera />
                </button>

                <input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                  placeholder="CODE (ex: X9Y2)"
                  className="flex-1 p-4 h-14 border-2 border-gray-200 rounded-xl font-mono text-center text-xl tracking-widest outline-none focus:border-teal-500 uppercase"
                />
              </div>

              <button
                onClick={handleValidate}
                className="bg-teal-700 hover:bg-teal-800 text-white h-14 w-full sm:w-auto px-6 rounded-xl font-black shadow-lg active:scale-95 transition-all"
              >
                VALIDER
              </button>
            </div>
          </div>

          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Flux Commandes
          </h3>

          <div className="space-y-3">
            {activeOrders.map((o) => {
              const badge =
                o.status === "paid"
                  ? "bg-green-600 text-white"
                  : o.status === "cash"
                  ? "bg-yellow-400 text-black"
                  : o.status === "scanned"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600";

              const badgeText =
                o.status === "paid"
                  ? "PAYÉ"
                  : o.status === "cash"
                  ? "ESPÈCES"
                  : o.status === "scanned"
                  ? "EN PAIEMENT"
                  : "À SCANNER";

              return (
                <div
                  key={o.id}
                  className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                    o.status === "paid"
                      ? "border-green-500 ring-2 ring-green-500"
                      : o.status === "cash"
                      ? "border-yellow-500 ring-2 ring-yellow-300"
                      : "border-gray-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-xl text-gray-800">
                          #{o.qr_token}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-600">
                          {fmtTime(o)}
                        </span>

                        {!!methodLabel(o.payment_method) && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase bg-gray-100 text-gray-700">
                            {methodLabel(o.payment_method)}
                          </span>
                        )}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${badge}`}
                        >
                          {o.status === "cash" ? (
                            <span className="inline-flex items-center gap-1">
                              <Banknote size={12} /> {badgeText}
                            </span>
                          ) : (
                            badgeText
                          )}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        {o.items?.length || 0} produits •{" "}
                        <span className="font-black text-teal-700">
                          {formatPrice(o.total_cents || 0)}
                        </span>
                      </div>
                    </div>

                    {o.status === "cash" ? (
                      <button
                        onClick={() => confirmCash(o)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-3 rounded-xl font-black text-sm shadow-md w-full sm:w-auto"
                      >
                        CONFIRMER ESPÈCES
                      </button>
                    ) : o.status === "paid" ? (
                      <button
                        onClick={() => handleServe(o.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-black text-sm shadow-md w-full sm:w-auto"
                      >
                        DONNER PRODUITS
                      </button>
                    ) : (
                      <div className="text-xs text-gray-400 italic w-full sm:w-auto text-right">
                        —
                      </div>
                    )}
                  </div>

                  {/* ✅ Ticket / bon de commande (pas d’images) */}
                  {o.status === "paid" && <TicketBon order={o} />}
                </div>
              );
            })}

            {activeOrders.length === 0 && (
              <p className="text-center text-gray-400 italic py-6">
                Aucune commande active
              </p>
            )}
          </div>
        </>
      )}

      {/* ===================== HISTORIQUE ===================== */}
      {adminTab === "history" && (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-200 flex flex-col gap-3">
            <div className="flex gap-2 flex-col sm:flex-row">
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="flex-1 p-3 rounded-xl border border-gray-200 bg-white font-bold text-sm outline-none"
              >
                <option value="all">Tous (paid + served)</option>
                <option value="paid">Paid</option>
                <option value="served">Served</option>
              </select>

              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Rechercher un code (#AB12)"
                className="flex-1 p-3 rounded-xl border border-gray-200 bg-white font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            {historyOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-lg text-gray-800">
                      #{o.qr_token}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-600">
                      {fmtTime(o)}
                    </span>
                    {!!methodLabel(o.payment_method) && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase bg-gray-100 text-gray-700">
                        {methodLabel(o.payment_method)}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] px-2 py-1 rounded font-black uppercase ${
                      o.status === "served"
                        ? "bg-gray-900 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-700 flex justify-between">
                  <span>{o.items?.length || 0} articles</span>
                  <span className="font-black text-teal-700">
                    {formatPrice(o.total_cents || 0)}
                  </span>
                </div>
              </div>
            ))}

            {historyOrders.length === 0 && (
              <p className="text-center text-gray-400 italic py-6">
                Aucune commande
              </p>
            )}
          </div>
        </>
      )}

      {/* ===================== STOCK ===================== */}
      {adminTab === "stock" && (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-200">
            <input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Rechercher un produit"
              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm outline-none"
            />
          </div>

          <div className="space-y-3">
            {stockList.map((p) => {
              const available = p.is_available !== false;

              return (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-gray-800 truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {p.category || "—"} • {formatPrice(p.price_cents || 0)}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleAvailability(p)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition ${
                        available
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {available ? "EN STOCK" : "RUPTURE"}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-bold">
                      Quantité
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="∞"
                      defaultValue={p.stock_qty ?? ""}
                      onBlur={(e) => setStockQty(p, e.target.value)}
                      className="w-28 p-2 rounded-lg border border-gray-200 text-sm outline-none"
                    />
                    <span className="text-xs text-gray-400">
                      (vide = illimité)
                    </span>
                  </div>
                </div>
              );
            })}

            {stockList.length === 0 && (
              <p className="text-center text-gray-400 italic py-6">
                Aucun produit
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
