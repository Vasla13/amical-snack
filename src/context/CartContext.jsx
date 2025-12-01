import React, { createContext, useContext, useState, useMemo } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { generateToken } from "../lib/token";
import { useAuth } from "./AuthContext";
import { useFeedback } from "../hooks/useFeedback"; // IMPORT

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const { userData: user } = useAuth();
  const { trigger } = useFeedback();

  const addToCart = (product) => {
    if (product.is_available === false) return;
    trigger("click"); // FEEDBACK
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

  const removeFromCart = (productId) => {
    trigger("click"); // FEEDBACK
    setCart((prev) =>
      prev
        .map((i) => (i.id === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const createOrder = async (onSuccess, onError) => {
    if (!cart.length || !user?.uid) return;
    const outOfStock = cart.find((i) => i.is_available === false);
    if (outOfStock) {
      if (onError) onError(`Rupture : ${outOfStock.name}`);
      return;
    }
    try {
      const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);
      const docRef = await addDoc(collection(db, "orders"), {
        user_id: user.uid,
        items: cart,
        total_cents: total,
        status: "created",
        qr_token: generateToken(),
        created_at: serverTimestamp(),
        payment_method: null,
      });
      clearCart();
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
    clearCart,
    createOrder,
    totalItems,
    setCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
