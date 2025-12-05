import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { Product } from "../types";
import { useAuth } from "../context/AuthContext";

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The listener is only active when there's a user, matching original logic.
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(collection(db, "products"), (snapshot) => {
      const productsData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Product)
      );
      setProducts(productsData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { products, loading };
}
