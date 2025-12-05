import React, { createContext, useContext, useState, useMemo } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { generateToken } from "../lib/token";
import { useAuth } from "./AuthContext";
import { useFeedback } from "../hooks/useFeedback";
import { CartContextType, CartItem, Product } from "../types";

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans CartProvider");
  return context;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { userData: user } = useAuth();
  const { trigger } = useFeedback();

  const addToCart = (product: Product | CartItem) => {
    if (product.is_available === false) return;
    trigger("click");
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      // On convertit le Product en CartItem (qty: 1)
      const newItem: CartItem = { ...product, qty: 1 };
      return [...prev, newItem];
    });
  };

  const removeFromCart = (productId: string) => {
    trigger("click");
    setCart((prev) =>
      prev
        .map((i) => (i.id === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const createOrder = async (
    onSuccess: (id: string) => void,
    onError?: (msg: string) => void
  ) => {
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
    } catch (e: any) {
      console.error(e);
      if (onError) onError(e.message);
    }
  };

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + item.qty, 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        createOrder,
        totalItems,
        setCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
