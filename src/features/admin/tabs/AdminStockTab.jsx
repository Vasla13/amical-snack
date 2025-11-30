import React, { useState, useMemo } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { Search, PackageX, PackageCheck } from "lucide-react";

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
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />
        <input
          value={stockQuery}
          onChange={(e) => setStockQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-teal-500 outline-none font-bold text-slate-800 transition-colors shadow-sm"
        />
      </div>

      <div className="space-y-2">
        {stockList.map((p) => (
          <div
            key={p.id}
            onClick={() => toggleAvailability(p)}
            className={`p-4 rounded-2xl flex justify-between items-center border transition-all active:scale-[0.98] cursor-pointer ${
              p.is_available
                ? "bg-white border-slate-100 shadow-sm"
                : "bg-slate-50 border-slate-100 opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  p.is_available
                    ? "bg-teal-50 text-teal-600"
                    : "bg-red-50 text-red-500"
                }`}
              >
                {p.is_available ? (
                  <PackageCheck size={20} />
                ) : (
                  <PackageX size={20} />
                )}
              </div>
              <div
                className={`font-bold text-sm ${
                  p.is_available
                    ? "text-slate-800"
                    : "text-slate-500 line-through"
                }`}
              >
                {p.name}
              </div>
            </div>

            <div
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                p.is_available ? "bg-teal-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  p.is_available ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
