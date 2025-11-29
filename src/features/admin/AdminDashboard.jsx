import React, { useEffect, useState } from "react";
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
} from "firebase/firestore";
import { Camera } from "lucide-react";
import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

export default function AdminDashboard({ db, products }) {
  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "orders"), orderBy("created_at", "desc")),
        (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const handleScan = async () => {
    const token = scanInput.trim().toUpperCase();
    const order = orders.find(
      (o) => o.qr_token === token && o.status === "created"
    );
    if (!order) return alert("Code invalide ou déjà scanné !");
    await updateDoc(doc(db, "orders", order.id), { status: "scanned" });
    setScanInput("");
    alert("Code validé ! Le client peut payer.");
  };

  const handleServe = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), { status: "served" });
  };

  const seed = async () => {
    if (
      !confirm(
        "⚠️ ATTENTION: SUPPRIMER TOUT LE STOCK ET RÉINITIALISER AVEC LES IMAGES LOCALES ?"
      )
    )
      return;

    const snap = await getDocs(collection(db, "products"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref))); // Vide tout

    for (const item of SEED_PRODUCTS) {
      await addDoc(collection(db, "products"), {
        ...item,
        is_available: true,
        sort_order: 1,
      });
    }

    alert(
      "✅ Stock réinitialisé ! N'oublie pas de mettre les images dans public/produits/"
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-black text-2xl text-gray-800">ADMIN R&amp;T</h1>
        <button
          onClick={seed}
          className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold shadow-md hover:bg-red-700"
        >
          🗑️ SUPPRIMER &amp; RÉINITIALISER STOCK
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border-2 border-teal-600">
        <h2 className="font-bold text-teal-800 mb-4 flex items-center gap-2 text-lg">
          <Camera className="text-teal-600" /> 1. SCANNER CODE CLIENT
        </h2>
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

      <div className="grid gap-6">
        <div>
          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Flux Commandes
          </h3>
          <div className="space-y-3">
            {orders
              .filter((o) => o.status !== "served")
              .map((o) => (
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
                          💰 PAYÉ !
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      {o.items.length} articles • {formatPrice(o.total_cents)}
                    </p>
                  </div>

                  {o.status === "paid" && (
                    <button
                      onClick={() => handleServe(o.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md animate-bounce"
                    >
                      DONNER PRODUITS
                    </button>
                  )}

                  {o.status === "scanned" && (
                    <span className="text-xs text-blue-500 italic animate-pulse">
                      Attente paiement...
                    </span>
                  )}
                </div>
              ))}

            {orders.filter((o) => o.status !== "served").length === 0 && (
              <p className="text-center text-gray-400 italic py-4">
                Aucune commande active
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
