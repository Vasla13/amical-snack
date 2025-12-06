import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  Firestore,
} from "firebase/firestore";
import { Search, User, Plus, Minus } from "lucide-react";
import Modal from "../../../ui/Modal";
import { UserProfile } from "../../../types";
import { useFeedback } from "../../../context/FeedbackContext"; // Import du contexte de feedback

export default function AdminUsersTab({ db }: { db: Firestore }) {
  const { notify } = useFeedback(); // Utilisation du hook
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState("");
  const [actionType, setActionType] = useState<"credit" | "debit">("credit");

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (s) => {
      setUsers(
        // Casting propre grâce à l'ajout de id? dans l'interface UserProfile
        s.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile))
      );
    });
  }, [db]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const openAction = (user: UserProfile, type: "credit" | "debit") => {
    setSelectedUser(user);
    setActionType(type);
    setAmount("");
  };

  const handleUpdatePoints = async () => {
    if (!selectedUser || !amount) return;
    const val = parseFloat(amount);

    // Remplacement de alert() par notify()
    if (isNaN(val) || val <= 0) {
      notify("Montant invalide", "error");
      return;
    }

    const finalAmount = actionType === "credit" ? val : -val;

    try {
      // Utilisation sécurisée de l'ID (id du doc ou uid auth)
      const userId = selectedUser.id || selectedUser.uid;

      if (!userId) throw new Error("ID utilisateur introuvable");

      await updateDoc(doc(db, "users", userId), {
        points: increment(finalAmount),
      });

      notify(
        `Points ${actionType === "credit" ? "ajoutés" : "retirés"} avec succès`,
        "success"
      );
      setSelectedUser(null);
    } catch (e: any) {
      console.error(e);
      notify("Erreur : " + e.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un membre..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-teal-500 outline-none font-bold text-slate-800 transition-colors shadow-sm"
        />
      </div>

      <div className="space-y-2 pb-20">
        {filteredUsers.map((u) => (
          <div
            key={u.id || u.uid}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                <User size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {u.displayName || u.email}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {Number(u.points || 0).toFixed(2)} pts
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openAction(u, "debit")}
                aria-label="Retirer des points"
                className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 active:scale-90 transition-transform"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => openAction(u, "credit")}
                aria-label="Ajouter des points"
                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 active:scale-90 transition-transform"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!selectedUser}
        title={
          actionType === "credit" ? "Ajouter des points" : "Retirer des points"
        }
        onCancel={() => setSelectedUser(null)}
        onConfirm={handleUpdatePoints}
        confirmText="Valider"
      >
        <div className="text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {actionType === "credit" ? "Créditer" : "Débiter"} le compte de{" "}
            <b>{selectedUser?.displayName}</b>.
          </p>
          <div className="relative">
            <input
              type="number"
              autoFocus
              placeholder="Montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-4 text-center text-2xl font-black rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-teal-500"
            />
            <span className="absolute right-8 top-1/2 -translate-y-1/2 font-bold text-slate-400">
              PTS
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
