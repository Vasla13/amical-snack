import { useState, useMemo } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  Firestore, // Import du type
} from "firebase/firestore";
import { Product } from "../../../types";

export function useAdminStock(db: Firestore, products: Product[]) {
  const [stockQuery, setStockQuery] = useState("");

  // État local pour le formulaire d'ajout
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "Snacks",
    image: "",
  });

  const stockList = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    const list = [...(products || [])];
    // Tri alphabétique
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return list.filter((p) =>
      !q ? true : (p.name || "").toLowerCase().includes(q)
    );
  }, [products, stockQuery]);

  const toggleAvailability = async (p: Product) => {
    try {
      await updateDoc(doc(db, "products", p.id), {
        is_available: !p.is_available,
      });
    } catch (e: any) {
      alert("Erreur lors de la mise à jour : " + e.message);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    try {
      await addDoc(collection(db, "products"), {
        ...newProduct,
        price_cents: Number(newProduct.price) * 100, // Conversion en centimes
        is_available: true,
      });
      setNewProduct({ name: "", price: "", category: "Snacks", image: "" });
      alert("Produit ajouté avec succès !");
    } catch (err: any) {
      alert("Erreur ajout : " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err: any) {
      alert("Erreur suppression : " + err.message);
    }
  };

  return {
    stockQuery,
    setStockQuery,
    newProduct,
    setNewProduct,
    stockList,
    toggleAvailability,
    handleAddProduct,
    handleDeleteProduct,
  };
}
