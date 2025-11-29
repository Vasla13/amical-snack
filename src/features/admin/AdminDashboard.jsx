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
} from "firebase/firestore";
import { Camera, Clock, LogOut, Package, History } from "lucide-react";
import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

export default function AdminDashboard({ db, products, onLogout }) {
  const ORDER_TTL_MS = 10 * 60 * 1000;

  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [adminTab, setAdminTab] = useState("orders"); // orders | history | stock

  // Historique filters
  const [historyFilter, setHistoryFilter] = useState("all"); // all | paid | served
  const [historyQuery, setHistoryQuery] = useState("");

  // Stock filters
  const [stockQuery, setStockQuery] = useState("");

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

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

  const getCreatedMs = (o) => {
    const ts = o?.created_at;
    return ts && typeof ts.toMillis === "function" ? ts.toMillis() : null;
  };

  const isExpirableStatus = (status) =>
    status === "created" || status === "scanned";

  const isExpired = (o) => {
    if (!isExpirableStatus(o.status)) return false;
    const createdMs = getCreatedMs(o);
    if (!createdMs) return false;
    return Date.now() - createdMs > ORDER_TTL_MS;
  };

  const expireOrdersNow = async () => {
    const list = ordersRef.current || [];
    const toExpire = list.filter((o) => isExpired(o));
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

  const handleScan = async () => {
    await expireOrdersNow();

    const token = scanInput.trim().toUpperCase();
    if (!token) return;

    const order = (ordersRef.current || []).find(
      (o) => o.qr_token === token && o.status === "created" && !isExpired(o)
    );

    if (!order) return alert("Code invalide, expiré, ou déjà scanné !");

    await updateDoc(doc(db, "orders", order.id), { status: "scanned" });
    setScanInput("");
    alert("Code validé ! Le client peut payer.");
  };

  const handleServe = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), {
      status: "served",
      served_at: serverTimestamp(),
    });
  };

  const seed = async () => {
    if (!confirm("⚠️ ATTENTION: SUPPRIMER TOUT LE STOCK ET RÉINITIALISER ?"))
      return;

    const snap = await getDocs(collection(db, "products"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    for (const item of SEED_PRODUCTS) {
      await addDoc(collection(db, "products"), {
        ...item,
        is_available: true,
        stock_qty: null, // optionnel
        sort_order: 1,
      });
    }

    alert("✅ Stock réinitialisé !");
  };

  // ---- Orders: Active (created/scanned/paid) ----
  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => o.status !== "expired")
      .filter((o) => o.status !== "served")
      .filter((o) => !(isExpirableStatus(o.status) && isExpired(o)))
      .filter((o) => ["created", "scanned", "paid"].includes(o.status));
  }, [orders]);

  // ---- History: paid + served ----
  const historyOrders = useMemo(() => {
    const q = historyQuery.trim().toUpperCase();

    return orders
      .filter((o) => o.status !== "expired")
      .filter((o) =>
        historyFilter === "all"
          ? ["paid", "served"].includes(o.status)
          : o.status === historyFilter
      )
      .filter((o) => {
        if (!q) return true;
        return String(o.qr_token || "")
          .toUpperCase()
          .includes(q);
      });
  }, [orders, historyFilter, historyQuery]);

  // ---- Stock list ----
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

  const toggleAvailability = async (p) => {
    await updateDoc(doc(db, "products", p.id), {
      is_available: !(p.is_available !== false),
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

  const TabBtn = ({ id, icon: Icon, label }) => (
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
      <div className="flex justify-between items-center mb-4 gap-3">
        <h1 className="font-black text-2xl text-gray-800">ADMIN R&amp;T</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={seed}
            className="bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-red-700"
            title="Réinitialiser le stock"
          >
            🗑️ Reset stock
          </button>

          <button
            onClick={onLogout}
            className="bg-white border border-gray-200 text-gray-800 px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2"
            title="Se déconnecter"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <TabBtn id="orders" icon={Camera} label="Commandes" />
        <TabBtn id="history" icon={History} label="Historique" />
        <TabBtn id="stock" icon={Package} label="Stock" />
      </div>

      {/* -------- TAB: ORDERS -------- */}
      {adminTab === "orders" && (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border-2 border-teal-600">
            <h2 className="font-bold text-teal-800 mb-1 flex items-center gap-2 text-lg">
              <Camera className="text-teal-600" /> Scanner code client
            </h2>
            <p className="text-xs text-gray-500 mb-4 flex items-center gap-2">
              <Clock size={14} /> Les commandes non terminées expirent au bout
              de {Math.round(ORDER_TTL_MS / 60000)} min.
            </p>

            <div className="flex gap-3">
              <input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                placeholder="CODE (ex: X9Y2)"
                className="flex-1 p-4 border-2 border-gray-200 rounded-xl font-mono text-center text-xl tracking-widest outline-none focus:border-teal-500 uppercase"
              />
              <button
                onClick={handleScan}
                className="bg-teal-700 hover:bg-teal-800 text-white px-6 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                VALIDER
              </button>
            </div>
          </div>

          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Flux Commandes (en cours)
          </h3>

          <div className="space-y-3">
            {activeOrders.map((o) => (
              <div
                key={o.id}
                className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex justify-between items-center ${
                  o.status === "paid"
                    ? "border-green-500 ring-2 ring-green-500"
                    : "border-gray-300"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xl text-gray-800">
                      #{o.qr_token}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-600">
                      {fmtTime(o)}
                    </span>

                    {o.status === "created" && (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        À Scanner
                      </span>
                    )}

                    {o.status === "scanned" && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
                        En paiement...
                      </span>
                    )}

                    {o.status === "paid" && (
                      <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
                        💰 PAYÉ
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    {o.items?.length || 0} articles •{" "}
                    {formatPrice(o.total_cents || 0)}
                  </p>
                </div>

                {o.status === "paid" ? (
                  <button
                    onClick={() => handleServe(o.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md"
                  >
                    DONNER PRODUITS
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 italic">—</span>
                )}
              </div>
            ))}

            {activeOrders.length === 0 && (
              <p className="text-center text-gray-400 italic py-6">
                Aucune commande active
              </p>
            )}
          </div>
        </>
      )}

      {/* -------- TAB: HISTORY -------- */}
      {adminTab === "history" && (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-200 flex flex-col gap-3">
            <div className="flex gap-2">
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

            <p className="text-xs text-gray-500">
              Historique = commandes validées (paid) et/ou finalisées (served).
            </p>
          </div>

          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Historique
          </h3>

          <div className="space-y-3">
            {historyOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-gray-800">
                      #{o.qr_token}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-600">
                      {fmtTime(o)}
                    </span>
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
                Aucune commande dans l’historique
              </p>
            )}
          </div>
        </>
      )}

      {/* -------- TAB: STOCK -------- */}
      {adminTab === "stock" && (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-200">
            <input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Rechercher un produit (nom / catégorie)"
              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm outline-none"
            />
            <p className="text-xs text-gray-500 mt-3">
              Toggle “En stock / Rupture” = live sur le site client.
            </p>
          </div>

          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Produits
          </h3>

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

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold">
                      Quantité (optionnel)
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
