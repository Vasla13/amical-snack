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
import {
  Camera,
  Clock,
  LogOut,
  Package,
  History,
  X,
  Flashlight,
} from "lucide-react";
import QrScanner from "qr-scanner";
import qrWorkerUrl from "qr-scanner/qr-scanner-worker.min.js?url";

import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

// ✅ Worker path pour Vite
QrScanner.WORKER_PATH = qrWorkerUrl;

function PaidPickList({ items }) {
  // Regroupe les items identiques (par id si dispo)
  const grouped = useMemo(() => {
    const map = new Map();
    (items || []).forEach((it) => {
      const key =
        it.id || it.product_id || it.name || Math.random().toString(36);
      const prev = map.get(key);
      if (prev) {
        map.set(key, { ...prev, qty: (prev.qty || 0) + (it.qty || 0) });
      } else {
        map.set(key, { ...it, qty: it.qty || 0 });
      }
    });

    const arr = Array.from(map.values());
    arr.sort(
      (a, b) =>
        (b.qty || 0) - (a.qty || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""))
    );
    return arr;
  }, [items]);

  const totalQty = useMemo(
    () => grouped.reduce((s, it) => s + (it.qty || 0), 0),
    [grouped]
  );

  if (!grouped.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-black uppercase text-green-700">
          Produits à donner
        </div>
        <div className="text-xs font-black text-green-800">
          Total: <span className="text-base">{totalQty}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {grouped.map((it, idx) => (
          <div
            key={(it.id || it.name || "it") + "-" + idx}
            className="relative overflow-hidden rounded-xl bg-white border border-green-200 shadow-sm"
          >
            {/* qty huge */}
            <div className="absolute top-2 left-2 w-11 h-11 rounded-xl bg-green-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              {it.qty}
            </div>

            {/* image / placeholder */}
            <div className="h-24 w-full bg-white flex items-center justify-center p-2">
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.name}
                  className="h-full w-full object-contain mix-blend-multiply"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="text-[10px] text-gray-400 font-bold">
                  NO IMAGE
                </div>
              )}
            </div>

            <div className="px-2 pb-2">
              <div className="text-xs font-black text-gray-900 line-clamp-2 leading-tight">
                {it.name}
              </div>
              <div className="text-[11px] text-gray-500 font-bold mt-1">
                {formatPrice((it.price_cents || 0) * (it.qty || 0))}
              </div>
            </div>

            {/* subtle stripe */}
            <div className="absolute -right-10 top-6 rotate-45 bg-green-600/15 w-40 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const [error, setError] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const normalizeToken = (raw) => {
    if (!raw) return "";
    const s = String(raw).trim();
    if (s.includes("http://") || s.includes("https://")) {
      const last = s.split("/").filter(Boolean).pop() || s;
      return last.trim().toUpperCase();
    }
    return s.toUpperCase();
  };

  const stop = async () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy?.();
        scannerRef.current = null;
      }
    } catch {}
    setTorchSupported(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    try {
      const sc = scannerRef.current;
      if (!sc) return;
      const has = await sc.hasFlash?.();
      if (!has) return;
      await sc.toggleFlash?.();
      const isOn = await sc.isFlashOn?.();
      if (typeof isOn === "boolean") setTorchOn(isOn);
      else setTorchOn((v) => !v);
    } catch {}
  };

  useEffect(() => {
    if (!open) {
      stop();
      setError("");
      return;
    }

    (async () => {
      setError("");

      // ⚠️ Caméra sur mobile = HTTPS obligatoire (sauf localhost)
      if (!window.isSecureContext) {
        setError(
          "Caméra bloquée : il faut ouvrir le site en HTTPS sur mobile (sauf localhost). " +
            "En démo, héberge-le (Firebase Hosting / Vercel / Netlify) et ça marchera."
        );
        return;
      }

      try {
        const video = videoRef.current;
        if (!video) return;

        const scanner = new QrScanner(
          video,
          (result) => {
            const raw = typeof result === "string" ? result : result?.data;
            const token = normalizeToken(raw);
            if (token) {
              onScan(token); // ✅ remplit le champ
              onClose(); // ✅ ferme
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 8,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();

        // Flash si dispo
        try {
          const has = await scanner.hasFlash?.();
          setTorchSupported(!!has);
          if (has) {
            const isOn = await scanner.isFlashOn?.();
            if (typeof isOn === "boolean") setTorchOn(isOn);
          }
        } catch {
          setTorchSupported(false);
        }
      } catch {
        setError(
          "Impossible de lancer la caméra. Autorise la caméra et vérifie que tu es bien en HTTPS."
        );
      }
    })();

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-3">
      <div className="w-full sm:max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-black text-gray-800 flex items-center gap-2">
            <Camera size={18} className="text-teal-700" />
            Scanner QR
          </div>
          <button
            onClick={async () => {
              await stop();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X />
          </button>
        </div>

        <div className="p-3">
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-[340px] object-cover"
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>

            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`absolute top-3 right-3 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg ${
                  torchOn
                    ? "bg-yellow-400 text-black"
                    : "bg-white text-gray-900"
                }`}
              >
                <Flashlight size={16} />
                {torchOn ? "FLASH ON" : "FLASH"}
              </button>
            )}
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600 font-bold bg-red-50 border border-red-100 p-3 rounded-xl">
              {error}
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-500">
              Pointe le QR du client. Le code sera rempli automatiquement.
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                await stop();
                onClose();
              }}
              className="flex-1 bg-white border border-gray-200 py-3 rounded-xl font-black text-gray-800"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const handleValidate = async () => {
    await expireOrdersNow();

    const token = scanInput.trim().toUpperCase();
    if (!token) return;

    const order = (ordersRef.current || []).find(
      (o) =>
        String(o.qr_token || "").toUpperCase() === token &&
        o.status === "created" &&
        !isExpired(o)
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
        stock_qty: null,
        sort_order: 1,
      });
    }

    alert("✅ Stock réinitialisé !");
  };

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => o.status !== "expired")
      .filter((o) => o.status !== "served")
      .filter((o) => !(isExpirableStatus(o.status) && isExpired(o)))
      .filter((o) => ["created", "scanned", "paid"].includes(o.status));
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
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(t) => t && setScanInput(t)}
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
        <TabBtn id="orders" icon={Camera} label="Commandes" />
        <TabBtn id="history" icon={History} label="Historique" />
        <TabBtn id="stock" icon={Package} label="Stock" />
      </div>

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
            {activeOrders.map((o) => (
              <div
                key={o.id}
                className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                  o.status === "paid"
                    ? "border-green-500 ring-2 ring-green-500"
                    : "border-gray-300"
                }`}
              >
                {/* TOP ROW */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      {o.items?.length || 0} produits •{" "}
                      {formatPrice(o.total_cents || 0)}
                    </p>
                  </div>

                  {o.status === "paid" ? (
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

                {/* ✅ PICK LIST VISIBLE ONLY WHEN PAID */}
                {o.status === "paid" && <PaidPickList items={o.items} />}
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
          </div>

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
                Aucune commande
              </p>
            )}
          </div>
        </>
      )}

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

                  <div className="mt-3 flex items-center gap-2">
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
          </div>
        </>
      )}
    </div>
  );
}
