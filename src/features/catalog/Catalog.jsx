import React, { useMemo, useState } from "react";
import { formatPrice } from "../../lib/format.js";

export default function Catalog({ products, cart, setCart }) {
  const [search, setSearch] = useState("");

  const add = (p) => {
    if (p.is_available === false) return;

    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      return ex
        ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...p, qty: 1 }];
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q);
    });
  }, [products, search]);

  return (
    <div className="p-4">
      <input
        className="w-full p-3 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 outline-none"
        placeholder="Chercher un snack..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((p) => {
          const qty = cart.find((i) => i.id === p.id)?.qty || 0;
          const available = p.is_available !== false;

          return (
            <div
              key={p.id}
              className={`relative bg-white p-2 rounded-2xl shadow-sm border flex flex-col h-full overflow-hidden ${
                qty ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-100"
              } ${available ? "" : "opacity-80"}`}
              aria-disabled={!available}
            >
              {/* Overlay HORS STOCK */}
              {!available && (
                <div className="absolute inset-0 z-10">
                  {/* voile */}
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px]" />
                  {/* badge */}
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <div className="px-4 py-2 rounded-2xl bg-gray-900/90 text-white font-black text-xs tracking-widest shadow-lg border border-white/10">
                      HORS STOCK
                    </div>
                  </div>
                  {/* petit ruban */}
                  <div className="absolute top-2 right-[-28px] rotate-45 bg-red-600 text-white text-[10px] font-black px-8 py-1 shadow-md">
                    OFF
                  </div>
                </div>
              )}

              <div
                className={`h-32 w-full rounded-xl mb-2 flex items-center justify-center p-2 relative overflow-hidden ${
                  available ? "bg-white" : "bg-gray-50"
                }`}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className={`h-full w-full object-contain transition-transform duration-300 mix-blend-multiply ${
                    available ? "hover:scale-110" : "grayscale"
                  }`}
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/200x200/f3f4f6/a3a3a3?text=NO+IMAGE";
                  }}
                />
              </div>

              <div className="mt-auto">
                <h3 className="font-bold text-xs leading-tight line-clamp-2 mb-1">
                  {p.name}
                </h3>

                <div className="flex justify-between items-center">
                  <p className="text-teal-700 font-black">
                    {formatPrice(p.price_cents)}
                  </p>

                  <button
                    onClick={() => add(p)}
                    disabled={!available}
                    className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition ${
                      available
                        ? "bg-gray-900 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    aria-label={
                      available ? "Ajouter au panier" : "Produit hors stock"
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {qty > 0 && (
                <div className="absolute top-2 left-2 bg-teal-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md z-20">
                  {qty}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 italic py-10">
          Aucun produit trouvé
        </p>
      )}
    </div>
  );
}
