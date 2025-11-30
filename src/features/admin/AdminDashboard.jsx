import React, { useState } from "react";
import {
  LogOut,
  Camera,
  History,
  Package,
  AlertCircle,
  CheckCircle2,
  BarChart2,
} from "lucide-react"; // AJOUT BarChart2
import { collection, getDocs, deleteDoc, addDoc } from "firebase/firestore";
import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { useAdminOrders } from "./hooks/useAdminOrders.js";
import AdminOrdersTab from "./tabs/AdminOrdersTab.jsx";
import AdminHistoryTab from "./tabs/AdminHistoryTab.jsx";
import AdminStockTab from "./tabs/AdminStockTab.jsx";
import AdminStatsTab from "./tabs/AdminStatsTab.jsx"; // AJOUT import

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
      alert("Stock réinitialisé !");
    } catch (e) {
      alert("Erreur seed: " + e.message);
    }
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setAdminTab(id)}
      className={`flex-1 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 border transition-all ${
        adminTab === id
          ? "bg-teal-700 text-white border-teal-700 shadow-md transform scale-105"
          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-black text-2xl text-gray-800 tracking-tight">
          ADMIN DASHBOARD
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={seed}
            className="bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-200 transition"
          >
            Reset
          </button>
          <button
            onClick={onLogout}
            className="bg-white border text-gray-800 px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <LogOut size={16} /> Déco
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

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        <TabButton id="orders" icon={Camera} label="Scan" />
        <TabButton id="history" icon={History} label="Historique" />
        <TabButton id="stock" icon={Package} label="Stock" />
        <TabButton id="stats" icon={BarChart2} label="Stats" /> {/* AJOUT */}
      </div>

      <div className="transition-all duration-300">
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
        {adminTab === "stats" && <AdminStatsTab orders={orders} />}{" "}
        {/* AJOUT */}
      </div>
    </div>
  );
}
