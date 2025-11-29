import React, { createContext, useContext, useState, useMemo } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { generateToken } from "../lib/token";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const { userData: user } = useAuth(); // On récupère userData pour l'ID

  // Ajouter un produit
  const addToCart = (product) => {
    if (product.is_available === false) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  // Retirer/Diminuer un produit
  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  // Créer la commande (Valider le panier)
  const createOrder = async (onSuccess, onError) => {
    if (!cart.length || !user?.uid) return;

    // Vérif stock (sécurité simple côté client)
    const outOfStock = cart.find((i) => i.is_available === false);
    if (outOfStock) {
      if (onError) onError(`Rupture : ${outOfStock.name}`);
      return;
    }

    try {
      const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);

      // On capture la référence du document créé
      const docRef = await addDoc(collection(db, "orders"), {
        user_id: user.uid,
        items: cart,
        total_cents: total,
        status: "created",
        qr_token: generateToken(),
        created_at: serverTimestamp(),
        payment_method: null,
      });

      setCart([]); // Vider le panier

      // On passe l'ID du document au callback de succès
      if (onSuccess) onSuccess(docRef.id);
    } catch (e) {
      console.error(e);
      if (onError) onError(e.message);
    }
  };

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + item.qty, 0),
    [cart]
  );

  const value = {
    cart,
    addToCart,
    removeFromCart,
    createOrder,
    totalItems,
    setCart, // Au cas où on veut reset manuellement
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
