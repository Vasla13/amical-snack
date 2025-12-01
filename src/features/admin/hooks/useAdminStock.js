import { useState, useMemo } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

export function useAdminStock(db, products) {
  const [stockQuery, setStockQuery] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "Snacks",
    image: "",
  });

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
      alert("Erreur lors de la mise à jour : " + e.message);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    try {
      await addDoc(collection(db, "products"), {
        ...newProduct,
        price_cents: Number(newProduct.price) * 100,
        is_available: true,
      });
      setNewProduct({ name: "", price: "", category: "Snacks", image: "" });
      alert("Produit ajouté avec succès !");
    } catch (err) {
      alert("Erreur ajout : " + err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) {
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
