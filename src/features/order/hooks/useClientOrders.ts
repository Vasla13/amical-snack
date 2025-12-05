import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Firestore,
} from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { Order, CartItem } from "../../../types";

// On type explicitement db avec Firestore au lieu de 'any'
export function useClientOrders() {
  const { userData: user, db } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const handleReorder = (orderItems: CartItem[]) => {
    let count = 0;
    orderItems.forEach((item) => {
      for (let i = 0; i < (item.qty || 1); i++) {
        addToCart(item);
        count++;
      }
    });
    return count;
  };

  useEffect(() => {
    if (!user?.uid) return;

    // Requête typée
    const q = query(collection(db, "orders"), where("user_id", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (s) => {
        const loadedOrders = s.docs
          .map((d) => {
            // Casting des données Firestore vers notre interface Order
            return { id: d.id, ...d.data() } as Order;
          })
          .filter((o) =>
            [
              "created",
              "scanned",
              "cash",
              "paid",
              "served",
              "reward_pending",
            ].includes(o.status)
          )
          .sort((a, b) => {
            // TypeScript reconnaît maintenant toMillis() car created_at est de type Timestamp
            const tA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
            const tB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
            return tB - tA;
          });

        setOrders(loadedOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Erreur commandes :", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, db]);

  const coupons = orders.filter((o) => o.status === "reward_pending");
  const regularOrders = orders.filter((o) => o.status !== "reward_pending");

  return {
    orders,
    coupons,
    regularOrders,
    loading,
    user,
    handleReorder,
  };
}
