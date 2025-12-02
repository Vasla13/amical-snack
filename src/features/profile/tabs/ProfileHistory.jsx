import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Clock, PlusCircle, MinusCircle } from "lucide-react";
import { formatPrice } from "../../../lib/format";

export default function ProfileHistory({ db, user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) return;
      try {
        // On cherche dans la sous-collection 'transactions' qu'on va créer lors des paiements/jeux
        const q = query(
          collection(db, "users", user.uid, "transactions"),
          orderBy("date", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Erreur historique", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user, db]);

  if (loading)
    return <div className="text-center p-4 text-slate-400">Chargement...</div>;

  if (history.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
        <Clock className="mx-auto mb-2 opacity-30" size={32} />
        <p className="text-sm font-bold">Aucune transaction récente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="font-black text-slate-800 dark:text-white px-2">
        Dernières activités
      </h3>
      {history.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                item.amount > 0
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
              }`}
            >
              {item.amount > 0 ? (
                <PlusCircle size={20} />
              ) : (
                <MinusCircle size={20} />
              )}
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {item.reason}
              </div>
              <div className="text-xs text-slate-400">
                {item.date?.toDate().toLocaleDateString()} •{" "}
                {item.date
                  ?.toDate()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </div>
            </div>
          </div>
          <div
            className={`font-black text-sm ${
              item.amount > 0 ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {item.amount > 0 ? "+" : ""}
            {item.amount} pts
          </div>
        </div>
      ))}
    </div>
  );
}
