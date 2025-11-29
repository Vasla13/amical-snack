import React, { useState } from "react";
import { formatPrice } from "../../lib/format.js";

export default function Catalog({ products, cart, setCart }) {
  const [search, setSearch] = useState("");

  const add = (p) =>
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      return ex
        ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...p, qty: 1 }];
    });

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
          return (
            <div
              key={p.id}
              className={`bg-white p-2 rounded-2xl shadow-sm border ${
                qty ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-100"
              } flex flex-col h-full`}
            >
              <div className="h-32 w-full bg-white rounded-xl mb-2 flex items-center justify-center p-2 relative overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-contain hover:scale-110 transition-transform duration-300 mix-blend-multiply"
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
                    className="bg-gray-900 text-white w-7 h-7 rounded-full flex items-center justify-center active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              {qty > 0 && (
                <div className="absolute top-2 left-2 bg-teal-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                  {qty}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
