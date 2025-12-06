import { useState, useMemo } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  Firestore,
} from "firebase/firestore";
import { Product } from "../../../types";
import { useFeedback } from "../../../context/FeedbackContext"; // AJOUT

export function useAdminStock(db: Firestore, products: Product[]) {
  const { notify } = useFeedback(); // Utilisation du context
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

  const toggleAvailability = async (p: Product) => {
    try {
      await updateDoc(doc(db, "products", p.id), {
        is_available: !p.is_available,
      });
      // Optionnel : notify("Disponibilité mise à jour", "success");
    } catch (e: any) {
      notify("Erreur MAJ : " + e.message, "error"); // Alert remplacé
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    try {
      await addDoc(collection(db, "products"), {
        ...newProduct,
        price_cents: Number(newProduct.price) * 100,
        is_available: true,
      });
      setNewProduct({ name: "", price: "", category: "Snacks", image: "" });
      notify("Produit ajouté avec succès !", "success"); // Alert remplacé
    } catch (err: any) {
      notify("Erreur ajout : " + err.message, "error"); // Alert remplacé
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      notify("Produit supprimé.", "info"); // Ajout feedback
    } catch (err: any) {
      notify("Erreur suppression : " + err.message, "error"); // Alert remplacé
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
