import React from "react";
import { Search, PackageX, PackageCheck, Trash2, Plus } from "lucide-react";
import { useAdminStock } from "../hooks/useAdminStock.js"; // Import du hook

export default function AdminStockTab({ db, products }) {
  const {
    stockQuery,
    setStockQuery,
    newProduct,
    setNewProduct,
    stockList,
    toggleAvailability,
    handleAddProduct,
    handleDeleteProduct,
  } = useAdminStock(db, products);

  return (
    <div className="space-y-4">
      {/* FORMULAIRE AJOUT */}
      <form
        onSubmit={handleAddProduct}
        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3"
      >
        <h3 className="font-bold text-sm text-slate-800">Ajouter un produit</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Nom (ex: Coca)"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
            className="p-2 border rounded-xl text-sm outline-none focus:border-teal-500 transition-colors"
            required
          />
          <input
            placeholder="Prix (€)"
            type="number"
            step="0.01"
            value={newProduct.price}
            onChange={(e) =>
              setNewProduct({ ...newProduct, price: e.target.value })
            }
            className="p-2 border rounded-xl text-sm outline-none focus:border-teal-500 transition-colors"
            required
          />
          <select
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct({ ...newProduct, category: e.target.value })
            }
            className="p-2 border rounded-xl text-sm outline-none focus:border-teal-500 transition-colors bg-white"
          >
            <option value="Snacks">Snacks</option>
            <option value="Boissons">Boissons</option>
            <option value="Boissons Chaudes">Boissons Chaudes</option>
            <option value="Formules">Formules</option>
          </select>
          <input
            placeholder="URL Image (optionnel)"
            value={newProduct.image}
            onChange={(e) =>
              setNewProduct({ ...newProduct, image: e.target.value })
            }
            className="p-2 border rounded-xl text-sm outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 transform"
        >
          <Plus size={16} /> Ajouter
        </button>
      </form>

      {/* RECHERCHE */}
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

      {/* LISTE */}
      <div className="space-y-2 pb-20">
        {stockList.map((p) => (
          <div
            key={p.id}
            className={`p-4 rounded-2xl flex justify-between items-center border transition-all ${
              p.is_available
                ? "bg-white border-slate-100 shadow-sm"
                : "bg-slate-50 border-slate-100 opacity-60"
            }`}
          >
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => toggleAvailability(p)}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
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
              <div>
                <div
                  className={`font-bold text-sm ${
                    p.is_available
                      ? "text-slate-800"
                      : "text-slate-500 line-through"
                  }`}
                >
                  {p.name}
                </div>
                <div className="text-xs text-slate-400">
                  {p.category} • {(p.price_cents / 100).toFixed(2)}€
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                onClick={() => toggleAvailability(p)}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                  p.is_available ? "bg-teal-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    p.is_available ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <button
                onClick={() => handleDeleteProduct(p.id)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors active:scale-90"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {stockList.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm font-medium">
            Aucun produit trouvé.
          </div>
        )}
      </div>
    </div>
  );
}
