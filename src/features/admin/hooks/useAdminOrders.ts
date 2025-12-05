import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  updateDoc,
  doc,
  Firestore, // Type Firestore
} from "firebase/firestore";
import { isExpired } from "../utils/orders"; // Assurez-vous que l'extension .js est retirée
import { Order } from "../../../types";

const ORDER_TTL_MS = 10 * 60 * 1000;

// Typage explicite du paramètre db
export function useAdminOrders(db: Firestore) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ordersRef = useRef<Order[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Chargement optimisé
  useEffect(() => {
    // On ne récupère que les 100 plus récentes
    const q = query(
      collection(db, "orders"),
      orderBy("created_at", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (s) => {
        const loadedData = s.docs.map((d) => ({
          id: d.id,
          ...d.data({ serverTimestamps: "estimate" }),
        })) as Order[]; // Casting sécurisé ici grâce à l'interface Order

        setOrders(loadedData);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur commandes:", err);
        setError("Erreur connexion DB");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db]);

  const expireOrdersNow = useCallback(async () => {
    try {
      const list = ordersRef.current || [];
      const toExpire = list.filter(
        (o) =>
          o.status !== "reward_pending" &&
          isExpired(o, ORDER_TTL_MS) &&
          ["created", "scanned", "cash"].includes(o.status)
      );
      if (!toExpire.length) return;

      await Promise.all(
        toExpire.map((o) =>
          updateDoc(doc(db, "orders", o.id), { status: "expired" })
        )
      );
    } catch (e) {
      console.error("Auto-expire error:", e);
    }
  }, [db]);

  useEffect(() => {
    expireOrdersNow();
    const i = setInterval(expireOrdersNow, 30_000);
    return () => clearInterval(i);
  }, [expireOrdersNow]);

  return { orders, loading, error, ORDER_TTL_MS };
}
