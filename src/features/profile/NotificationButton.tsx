import React from "react";
import { Bell } from "lucide-react";
import { requestNotificationPermission } from "../../config/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

export default function NotificationButton() {
  const { user, db } = useAuth();

  const handleSubscribe = async () => {
    const token = await requestNotificationPermission();
    if (token && user) {
      await updateDoc(doc(db, "users", user.uid), { fcmToken: token });
      alert(
        "Notifications activées ! Vous serez averti quand votre commande sera prête."
      );
    } else {
      alert("Impossible d'activer les notifications (permissions refusées ?)");
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      className="flex items-center justify-center w-full gap-2 p-3 mt-4 text-sm font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
    >
      <Bell size={18} /> Activer les notifications de commande
    </button>
  );
}
