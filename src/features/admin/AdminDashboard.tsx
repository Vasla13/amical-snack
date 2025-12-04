import React, { useState } from "react";
import {
  LogOut,
  Camera,
  History,
  Package,
  AlertCircle,
  CheckCircle2,
  BarChart2,
  RefreshCw,
  Users,
} from "lucide-react";
import { collection, getDocs, deleteDoc, addDoc } from "firebase/firestore";
import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { useAdminOrders } from "./hooks/useAdminOrders.js";
import AdminOrdersTab from "./tabs/AdminOrdersTab.jsx";
import AdminHistoryTab from "./tabs/AdminHistoryTab.jsx";
import AdminStockTab from "./tabs/AdminStockTab.jsx";
import AdminStatsTab from "./tabs/AdminStatsTab.jsx";
import AdminUsersTab from "./tabs/AdminUsersTab.jsx";
import Modal from "../../ui/Modal.jsx";

export default function AdminDashboard({ db, products, onLogout }) {
  const [adminTab, setAdminTab] = useState("orders");
  const [feedback, setFeedback] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const { orders, loading, error, ORDER_TTL_MS } = useAdminOrders(db);

  if (error && !feedback) setFeedback({ type: "error", msg: error });

  const requestSeed = () => setIsResetModalOpen(true);

  const confirmSeed = async () => {
    setIsResetModalOpen(false);
    try {
      const snap = await getDocs(collection(db, "products"));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      for (const item of SEED_PRODUCTS) {
        await addDoc(collection(db, "products"), {
          ...item,
          is_available: true,
        });
      }
      setFeedback({ type: "success", msg: "Stock réinitialisé avec succès !" });
    } catch (e) {
      setFeedback({ type: "error", msg: "Erreur seed: " + e.message });
    }
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setAdminTab(id)}
      className={`flex-shrink-0 px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all border ${
        adminTab === id
          ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105"
          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
      }`}
    >
      <Icon size={16} strokeWidth={2.5} /> {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Modal
        isOpen={isResetModalOpen}
        title="Réinitialiser le stock ?"
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={confirmSeed}
        confirmText="Oui, réinitialiser"
        cancelText="Annuler"
      >
        <p className="text-center text-slate-600">
          Attention : Cela va <b>supprimer tous les produits actuels</b> et
          remettre ceux par défaut.
        </p>
      </Modal>

      <header className="px-4 py-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="font-black text-lg text-slate-900 tracking-tight leading-none">
            ADMIN PANEL
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            Gestion Snack
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={requestSeed}
            aria-label="Réinitialiser le stock"
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={onLogout}
            aria-label="Se déconnecter"
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {feedback && (
        <div
          onClick={() => setFeedback(null)}
          className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 font-bold text-xs shadow-sm cursor-pointer ${
            feedback.type === "success"
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : "bg-rose-100 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span className="flex-1">{feedback.msg}</span>
        </div>
      )}

      <div className="px-4 py-3 overflow-x-auto no-scrollbar flex gap-2 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm sticky top-[69px] z-10">
        <TabButton id="orders" icon={Camera} label="Commandes" />
        <TabButton id="users" icon={Users} label="Membres" />
        <TabButton id="stock" icon={Package} label="Stock" />
        <TabButton id="history" icon={History} label="Historique" />
        <TabButton id="stats" icon={BarChart2} label="Stats" />
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {adminTab === "orders" && (
          <AdminOrdersTab
            db={db}
            orders={orders}
            loading={loading}
            ttlMs={ORDER_TTL_MS}
            setFeedback={setFeedback}
          />
        )}
        {adminTab === "users" && <AdminUsersTab db={db} />}
        {adminTab === "history" && <AdminHistoryTab orders={orders} />}
        {adminTab === "stock" && <AdminStockTab db={db} products={products} />}
        {adminTab === "stats" && <AdminStatsTab orders={orders} />}
      </main>
    </div>
  );
}
