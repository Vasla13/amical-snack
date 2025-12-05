import { useState, useMemo, useEffect } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Firestore,
} from "firebase/firestore";
import { Product, UserProfile } from "../../../types";
import { User } from "firebase/auth";

export function useCatalog(
  products: Product[],
  user: User | null,
  userData: UserProfile | null,
  db: Firestore
) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (products.length > 0) {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [products]);

  const categories = useMemo(() => {
    const cats = new Set(
      (products || []).map((p) => p.category).filter(Boolean)
    );
    return ["Tout", "Favoris", ...Array.from(cats)];
  }, [products]);

  const favorites = useMemo(() => userData?.favorites || [], [userData]);

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

  const toggleFavorite = async (product: Product) => {
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
