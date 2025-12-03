import { useState, useMemo, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export function useCatalog(products, user, userData, db) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Simulation d'un chargement pour l'UX
  useEffect(() => {
    if (products.length > 0) {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [products]);

  // Extraction des catégories uniques
  const categories = useMemo(() => {
    const cats = new Set(
      (products || []).map((p) => p.category).filter(Boolean)
    );
    return ["Tout", "Favoris", ...Array.from(cats)];
  }, [products]);

  const favorites = useMemo(() => userData?.favorites || [], [userData]);

  // Logique de filtrage
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => {
      const matchSearch = !q || (p.name || "").toLowerCase().includes(q);
      let matchCat = true;
      if (selectedCategory === "Favoris") {
        matchCat = favorites.includes(p.id);
      } else if (selectedCategory !== "Tout") {
        matchCat = p.category === selectedCategory;
      }
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory, favorites]);

  // Gestion des favoris
  const toggleFavorite = async (product) => {
    if (!user || !db) return;
    const ref = doc(db, "users", user.uid);
    const isFav = favorites.includes(product.id);
    try {
      await updateDoc(ref, {
        favorites: isFav ? arrayRemove(product.id) : arrayUnion(product.id),
      });
    } catch (e) {
      console.error("Erreur favoris:", e);
    }
  };

  return {
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
  };
}
