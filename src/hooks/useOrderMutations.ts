import {
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
  increment,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export function useOrderMutations() {
  const { user, userData, db } = useAuth();

  const payOrder = async (method: string, order: any) => {
    if (!user || !userData) {
      throw new Error("Utilisateur non authentifié.");
    }

    const totalCents = Number(order.total_cents || 0);
    const pointsEarned = totalCents / 100;
    const currentMonthKey = new Date().toISOString().slice(0, 7);

    if (method === "paypal_balance") {
      const balance = Number(userData.balance_cents || 0);
      if (balance < totalCents) {
        throw new Error("Solde insuffisant.");
      }
      await updateDoc(doc(db, "users", user.uid), {
        balance_cents: increment(-totalCents),
      });
    }

    await updateDoc(doc(db, "orders", order.id), {
      status: "paid",
      paid_at: serverTimestamp(),
      payment_method: method,
      payment_simulated: true,
      points_earned: pointsEarned,
    });

    await updateDoc(doc(db, "users", user.uid), {
      points: increment(pointsEarned),
      [`points_history.${currentMonthKey}`]: increment(pointsEarned),
    });

    await addDoc(collection(db, "users", user.uid, "transactions"), {
      type: "earn",
      amount: pointsEarned,
      reason: `Commande #${order.qr_token}`,
      date: serverTimestamp(),
    });
  };

  const requestCashPayment = async (order: any) => {
    await updateDoc(doc(db, "orders", order.id), {
      status: "cash",
      cash_requested_at: serverTimestamp(),
      payment_method: "cash",
    });
  };

  return { payOrder, requestCashPayment };
}
