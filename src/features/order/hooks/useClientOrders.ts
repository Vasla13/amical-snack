import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useCart } from "../../../context/CartContext.jsx";

export function useClientOrders(db) {
  const { userData: user } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recommander les mêmes articles
  const handleReorder = (orderItems) => {
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

    const q = query(collection(db, "orders"), where("user_id", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (s) => {
        const loadedOrders = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
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
            // Tri décroissant par date
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
