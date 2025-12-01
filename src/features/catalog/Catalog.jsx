import React from "react";
import { Search, Heart, Plus, Check } from "lucide-react";
import { formatPrice } from "../../lib/format.js";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import Skeleton from "../../ui/Skeleton.jsx";
import ProductModal from "./ProductModal.jsx";
import { useCatalog } from "./hooks/useCatalog.js"; // Import du hook

// Composant Bouton Animé (inchangé, gardé ici pour la simplicité)
function AddButton({ onClick, available }) {
  const [clicked, setClicked] = React.useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!available) return;
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 500);
  };

  return (
    <div
      onClick={handleClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
        available
          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer shadow-md"
          : "bg-slate-200 dark:bg-slate-800 text-slate-400"
      } ${
        clicked
          ? "scale-110 bg-teal-500 rotate-180 ring-4 ring-teal-200"
          : "group-hover:scale-105"
      }`}
    >
      {clicked ? (
        <Check size={16} strokeWidth={4} className="text-white" />
      ) : (
        <Plus size={16} strokeWidth={3} />
      )}
    </div>
  );
}

export default function Catalog({ products }) {
  const { cart, addToCart } = useCart();
  const { user, userData, db } = useAuth();

  // Utilisation du hook personnalisé
  const {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    loading,
    selectedProduct,
    setSelectedProduct,
    categories,
    favorites,
    filteredProducts,
    toggleFavorite,
  } = useCatalog(products, user, userData, db);

  return (
    <div className="px-4 pb-4 min-h-full flex flex-col">
      {/* HEADER RECHERCHE */}
      <div className="sticky top-0 z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur pt-2 pb-1 transition-colors">
        <div className="relative mb-4 shadow-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-teal-500" />
          <input
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-transparent focus:border-teal-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                selectedCategory === cat
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800"
              }`}
            >
              {cat === "Favoris" && (
                <Heart
                  size={12}
                  className="inline mr-1 mb-0.5"
                  fill="currentColor"
                />
              )}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE PRODUITS */}
      <div className="grid grid-cols-2 gap-4 mt-2 pb-24">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 p-3 rounded-3xl h-64 border border-slate-100 dark:border-slate-800 flex flex-col"
              >
                <Skeleton className="w-full aspect-square rounded-2xl mb-3" />
                <Skeleton className="w-3/4 h-4 mb-2" />
                <div className="mt-auto flex justify-between items-center">
                  <Skeleton className="w-12 h-6" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              </div>
            ))
          : filteredProducts.map((p) => {
              const qty = cart.find((i) => i.id === p.id)?.qty || 0;
              const available = p.is_available !== false;
              const isFav = favorites.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => available && setSelectedProduct(p)}
                  className={`group relative bg-white dark:bg-slate-900 p-3 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer ${
                    qty
                      ? "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950"
                      : ""
                  } ${available ? "" : "opacity-60 grayscale"}`}
                >
                  {!available && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[2px]">
                      <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                        Épuisé
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(p);
                    }}
                    className="absolute top-3 left-3 z-30 p-1.5 bg-white/80 dark:bg-black/30 backdrop-blur rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Heart
                      size={14}
                      fill={isFav ? "#f43f5e" : "none"}
                      className={isFav ? "text-rose-500" : ""}
                    />
                  </button>

                  <div className="aspect-square w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-3 flex items-center justify-center p-3 relative overflow-hidden">
                    <div className="absolute w-full h-full bg-radial-gradient from-white dark:from-slate-700 to-transparent opacity-60" />
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 relative z-10"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg z-20 animate-in zoom-in ring-2 ring-white dark:ring-slate-900">
                        {qty}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 mb-2 min-h-[2.5em]">
                      {p.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-lg text-slate-700 dark:text-slate-300">
                        {formatPrice(p.price_cents)}
                      </span>
                      <AddButton
                        available={available}
                        onClick={() => addToCart(p)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={(p) => {
          addToCart(p);
          setSelectedProduct(null);
        }}
        onToggleFav={toggleFavorite}
        isFav={selectedProduct && favorites.includes(selectedProduct.id)}
        allProducts={products}
      />

      {!loading && filteredProducts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
          <Search size={32} className="mb-2 opacity-20" />
          <p className="font-medium text-sm">Rien trouvé ici...</p>
        </div>
      )}
    </div>
  );
}
