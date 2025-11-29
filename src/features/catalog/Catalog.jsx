import React, { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { formatPrice } from "../../lib/format.js";
import { useCart } from "../../context/CartContext.jsx";

export default function Catalog({ products }) {
  const { cart, addToCart } = useCart();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tout");

  // 1. Extraire les catégories uniques depuis les produits
  const categories = useMemo(() => {
    const cats = new Set(
      (products || []).map((p) => p.category).filter(Boolean)
    );
    return ["Tout", ...Array.from(cats)];
  }, [products]);

  // 2. Filtrer par Recherche ET par Catégorie
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => {
      const matchSearch = !q || (p.name || "").toLowerCase().includes(q);
      const matchCat =
        selectedCategory === "Tout" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  return (
    <div className="px-4 pb-4 min-h-full flex flex-col">
      {/* BARRE DE RECHERCHE */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur pt-2 pb-1">
        <div className="relative mb-4 shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-transparent focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
            placeholder="Rechercher un snack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ONGLETS CATÉGORIES (Scroll Horizontal) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE PRODUITS */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        {filtered.map((p) => {
          const qty = cart.find((i) => i.id === p.id)?.qty || 0;
          const available = p.is_available !== false;

          return (
            <div
              key={p.id}
              onClick={() => available && addToCart(p)}
              className={`group relative bg-white p-3 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col h-full overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer ${
                qty
                  ? "ring-2 ring-teal-500 ring-offset-2"
                  : "hover:shadow-lg hover:shadow-teal-500/5"
              } ${available ? "" : "opacity-60 grayscale"}`}
            >
              {/* Badge Rupture */}
              {!available && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                  <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    Épuisé
                  </span>
                </div>
              )}

              {/* Image Produit */}
              <div className="aspect-square w-full bg-slate-50 rounded-2xl mb-3 flex items-center justify-center p-3 relative overflow-hidden">
                {/* Lueur de fond */}
                <div className="absolute w-full h-full bg-radial-gradient from-white to-transparent opacity-60" />

                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 relative z-10"
                  onError={(e) => (e.target.style.display = "none")}
                />

                {/* Badge Quantité */}
                {qty > 0 && (
                  <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg z-20 animate-in zoom-in ring-2 ring-white">
                    {qty}
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="mt-auto">
                <h3 className="font-bold text-sm text-slate-800 leading-tight line-clamp-2 mb-2 min-h-[2.5em]">
                  {p.name}
                </h3>

                <div className="flex items-center justify-between">
                  <span className="font-black text-lg text-slate-700">
                    {formatPrice(p.price_cents)}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      available
                        ? "bg-slate-900 text-white group-hover:bg-teal-600"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    <Plus size={16} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* État vide */}
      {filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Search size={24} className="opacity-30" />
          </div>
          <p className="font-medium text-sm">
            Aucun snack trouvé pour "{selectedCategory}"
          </p>
        </div>
      )}
    </div>
  );
}
