import React from "react";
import { Search, Star, Plus, Check } from "lucide-react";
import { formatPrice } from "../../lib/format";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Skeleton from "../../ui/Skeleton";
import ProductModal from "./ProductModal";
import { useCatalog } from "./hooks/useCatalog";
import { Product } from "../../types"; // Import du type

// Composant interne typé
function AddButton({
  onClick,
  available,
}: {
  onClick: () => void;
  available: boolean;
}) {
  const [clicked, setClicked] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
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

interface CatalogProps {
  products: Product[]; // Sécurisation ici : on attend une liste de produits
}

export default function Catalog({ products }: CatalogProps) {
  const { cart, addToCart } = useCart();
  const { user, userData, db } = useAuth();

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
    <div className="px-4 pb-4 min-h-full flex flex-col pt-2">
      {/* HEADER RECHERCHE & FILTRES */}
      <div className="mb-6 space-y-3">
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all">
          <div className="flex items-center px-4 py-3.5">
            <Search className="text-slate-400 w-5 h-5 mr-3" />
            <input
              className="w-full bg-transparent outline-none font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-sm"
              placeholder="Rechercher un snack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                selectedCategory === cat
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 shadow-sm"
              }`}
            >
              {cat === "Favoris" && (
                <Star
                  size={12}
                  className="inline mr-1.5 mb-0.5 text-yellow-400"
                  fill="currentColor"
                />
              )}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE PRODUITS */}
      <div className="grid grid-cols-2 gap-4 pb-24">
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
          : filteredProducts.map((p: Product) => {
              const qty = cart.find((i) => i.id === p.id)?.qty || 0;
              const available = p.is_available !== false;
              // @ts-ignore (favorites peut être undefined au début)
              const isFav = favorites?.includes(p.id);

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
                    className="absolute top-3 left-3 z-30 p-2 bg-white/60 dark:bg-black/30 backdrop-blur-md rounded-full text-slate-300 hover:text-yellow-400 transition-colors active:scale-90"
                  >
                    <Star
                      size={16}
                      fill={isFav ? "#facc15" : "none"}
                      className={isFav ? "text-yellow-400" : ""}
                    />
                  </button>

                  <div className="aspect-square w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-3 flex items-center justify-center p-3 relative overflow-hidden">
                    <div className="absolute w-full h-full bg-radial-gradient from-white dark:from-slate-700 to-transparent opacity-60" />
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 relative z-10"
                      onError={(e) => (e.currentTarget.style.display = "none")}
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
        onAdd={(p: Product) => {
          addToCart(p);
          setSelectedProduct(null);
        }}
        onToggleFav={toggleFavorite}
        // @ts-ignore
        isFav={selectedProduct && favorites?.includes(selectedProduct.id)}
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
