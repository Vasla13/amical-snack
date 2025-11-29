import React, { useState } from "react";
import {
  LogOut,
  Camera,
  History,
  Package,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { collection, getDocs, deleteDoc, addDoc } from "firebase/firestore";
import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { useAdminOrders } from "./hooks/useAdminOrders.js";
import AdminOrdersTab from "./tabs/AdminOrdersTab.jsx";
import AdminHistoryTab from "./tabs/AdminHistoryTab.jsx";
import AdminStockTab from "./tabs/AdminStockTab.jsx";

export default function AdminDashboard({ db, products, onLogout }) {
  const [adminTab, setAdminTab] = useState("orders");
  const [feedback, setFeedback] = useState(null);
  const { orders, loading, error, ORDER_TTL_MS } = useAdminOrders(db);

  if (error && !feedback) setFeedback({ type: "error", msg: error });

  const seed = async () => {
    if (!confirm("Reset stock ?")) return;
    try {
      const snap = await getDocs(collection(db, "products"));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      for (const item of SEED_PRODUCTS) {
        await addDoc(collection(db, "products"), {
          ...item,
          is_available: true,
        });
      }
      alert("Stock r\u00e9initialis\u00e9 !");
    } catch (e) {
      alert("Erreur seed: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans pb-20">
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
            <LogOut size={16} /> D\u00e9co
          </button>
        </div>
      </div>

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
        <AdminOrdersTab
          db={db}
          orders={orders}
          loading={loading}
          ttlMs={ORDER_TTL_MS}
          setFeedback={setFeedback}
        />
      )}
      {adminTab === "history" && <AdminHistoryTab orders={orders} />}
      {adminTab === "stock" && <AdminStockTab db={db} products={products} />}
    </div>
  );
}
