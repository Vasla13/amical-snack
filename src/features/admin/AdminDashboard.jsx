import React, { useEffect, useRef, useState } from "react";
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
import { Camera, Clock } from "lucide-react";
import { SEED_PRODUCTS } from "../../data/seedProducts.js";
import { formatPrice } from "../../lib/format.js";

export default function AdminDashboard({ db, products }) {
  // ⏳ Durée avant expiration d'une commande non terminée
  // Mets 5*60*1000 si tu veux 5 minutes
  const ORDER_TTL_MS = 10 * 60 * 1000;

  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    // Astuce importante : serverTimestamps "estimate" donne une date exploitable tout de suite
    // (sinon created_at peut être null quelques instants après création)
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
    if (!createdMs) return false; // sécurité : si pas de date, on évite d'expirer à tort
    return Date.now() - createdMs > ORDER_TTL_MS;
  };

  const expireOrdersNow = async () => {
    const list = ordersRef.current || [];
    const toExpire = list.filter((o) => isExpired(o));

    if (!toExpire.length) return;

    // On marque "expired" => ça disparaît du flux
    await Promise.all(
      toExpire.map((o) =>
        updateDoc(doc(db, "orders", o.id), {
          status: "expired",
          expired_at: serverTimestamp(),
        })
      )
    );
  };

  // ♻️ Cleanup automatique toutes les 30 secondes (tant qu’un admin a la page ouverte)
  useEffect(() => {
    expireOrdersNow();
    const i = setInterval(expireOrdersNow, 30_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const handleScan = async () => {
    // Expire d'abord ce qui doit l'être, puis scan
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
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

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

  // ✅ Flux visible : on cache les anciennes commandes expirées
  // On garde les commandes validées (paid/served), et on ne montre dans le flux que celles utiles
  const activeOrders = orders
    .filter((o) => o.status !== "expired")
    .filter((o) => o.status !== "served") // comme avant : "served" sort du flux
    .filter((o) => !(isExpirableStatus(o.status) && isExpired(o))); // sécurité visuelle

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
        <h2 className="font-bold text-teal-800 mb-1 flex items-center gap-2 text-lg">
          <Camera className="text-teal-600" /> 1. SCANNER CODE CLIENT
        </h2>
        <p className="text-xs text-gray-500 mb-4 flex items-center gap-2">
          <Clock size={14} /> Les commandes non terminées expirent au bout de{" "}
          {Math.round(ORDER_TTL_MS / 60000)} min.
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

      <div className="grid gap-6">
        <div>
          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Flux Commandes
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
                    {o.items?.length || 0} articles •{" "}
                    {formatPrice(o.total_cents || 0)}
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

            {activeOrders.length === 0 && (
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
