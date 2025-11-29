import React, { useState, useMemo } from "react";
import { updateDoc, doc } from "firebase/firestore";

export default function AdminStockTab({ db, products }) {
  const [stockQuery, setStockQuery] = useState("");

  const stockList = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    const list = [...(products || [])];
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list.filter((p) =>
      !q ? true : (p.name || "").toLowerCase().includes(q)
    );
  }, [products, stockQuery]);

  const toggleAvailability = async (p) => {
    try {
      await updateDoc(doc(db, "products", p.id), {
        is_available: !p.is_available,
      });
    } catch (e) {
      alert(e.message);
    }
  };

  return (
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
  );
}
