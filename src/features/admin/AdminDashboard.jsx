import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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
} from "firebase/firestore";
import {
  Camera,
  LogOut,
  Package,
  History,
  Banknote,
  Gift,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import ScannerModal from "./components/ScannerModal.jsx";
import TicketBon from "./components/TicketBon.jsx";
import { isExpired, getCreatedMs } from "./utils/orders.js";

import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

export default function AdminDashboard({ db, products, onLogout }) {
  const ORDER_TTL_MS = 10 * 60 * 1000;

  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [adminTab, setAdminTab] = useState("orders");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Feedback visuel
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', msg: '' }

  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [stockQuery, setStockQuery] = useState("");

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Stream orders
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"));

    const unsub = onSnapshot(
      q,
      (s) => {
        setOrders(
          s.docs.map((d) => ({
            id: d.id,
            ...d.data({ serverTimestamps: "estimate" }),
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Erreur chargement commandes:", error);
        setFeedback({
          type: "error",
          msg: "Erreur de connexion à la base de données.",
        });
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db]);

  // Expiration automatique silencieuse
  // Utilisation de useCallback pour stabiliser la fonction
  const expireOrdersNow = useCallback(async () => {
    try {
      const list = ordersRef.current || [];
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
    } catch (e) {
      console.error("Auto-expire error:", e);
    }
  }, [db, ORDER_TTL_MS]);

  useEffect(() => {
    expireOrdersNow();
    const i = setInterval(expireOrdersNow, 30_000);
    return () => clearInterval(i);
  }, [expireOrdersNow]); // Ajout de la dépendance

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
      // 1. On cherche la commande PEU IMPORTE son statut pour diagnostiquer
      const order = (ordersRef.current || []).find(
        (o) => String(o.qr_token || "").toUpperCase() === token
      );

      if (!order) {
        setFeedback({ type: "error", msg: `Code introuvable : ${token}` });
        return;
      }

      // 2. Gestion des cas spécifiques (Déjà scanné, Expiré, etc.)
      if (order.status === "scanned") {
        setFeedback({
          type: "success",
          msg: "Commande DÉJÀ scannée ! En attente de paiement.",
        });
        setScanInput("");
        return;
      }

      if (order.status === "paid" || order.status === "served") {
        setFeedback({ type: "success", msg: "Commande déjà payée/servie." });
        setScanInput("");
        return;
      }

      if (order.status === "expired") {
        setFeedback({
          type: "error",
          msg: "Commande EXPIRÉE (temps dépassé).",
        });
        return;
      }

      // 3. Validation standard (Created ou Reward)
      const isReward = order.status === "reward_pending";

      // Si c'est une commande normale, on vérifie le temps
      if (!isReward && isExpired(order, ORDER_TTL_MS)) {
        await updateDoc(doc(db, "orders", order.id), { status: "expired" });
        setFeedback({
          type: "error",
          msg: "Trop tard ! Commande expirée à l'instant.",
        });
        return;
      }

      // 4. ACTION : On valide le scan
      await updateDoc(doc(db, "orders", order.id), { status: "scanned" });

      setFeedback({
        type: "success",
        msg: isReward
          ? "CADEAU VALIDÉ ! À donner."
          : "SCAN OK ! En attente du paiement client.",
      });
      setScanInput("");
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", msg: "Erreur technique : " + err.message });
    }
  };

  const confirmCash = async (o) => {
    if (!confirm("Confirmer le paiement en espèces ?")) return;
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
      setFeedback({ type: "success", msg: "Paiement espèces validé !" });
    } catch (e) {
      alert("Erreur encaissement: " + e.message);
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
      alert("Erreur service: " + e.message);
    }
  };

  const seed = async () => {
    if (!confirm("⚠️ Reset stock ?")) return;
    try {
      const snap = await getDocs(collection(db, "products"));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      for (const item of SEED_PRODUCTS) {
        await addDoc(collection(db, "products"), {
          ...item,
          is_available: true,
        });
      }
      alert("✅ Stock réinitialisé !");
    } catch (e) {
      alert("Erreur seed: " + e.message);
    }
  };

  const toggleAvailability = async (p) => {
    try {
      await updateDoc(doc(db, "products", p.id), {
        is_available: !p.is_available,
      });
    } catch (e) {
      alert("Erreur modif stock: " + e.message);
    }
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
    <div className="min-h-screen bg-gray-100 p-4 font-sans pb-20">
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

      {/* FEEDBACK MSG */}
      {feedback && (
        <div
          className={`mb-4 p-4 rounded-xl flex items-center gap-3 font-bold text-sm shadow-sm animate-in fade-in slide-in-from-top-2 ${
            feedback.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {feedback.msg}
        </div>
      )}

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
              Aucune commande en attente.
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
      )}

      {/* Le reste des onglets (stock, history) est inchangé */}
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
