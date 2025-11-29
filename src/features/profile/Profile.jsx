import React from "react";
import { User, LogOut } from "lucide-react";

export default function Profile({ user, logout }) {
  return (
    <div className="p-4">
      <div className="bg-teal-700 text-white p-8 rounded-3xl shadow-lg mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-yellow-400">
            {user?.points || 0}
          </h2>
          <p className="font-bold text-teal-200">POINTS FIDÉLITÉ</p>
        </div>
        <User className="absolute -bottom-4 -right-4 text-teal-600 w-32 h-32" />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm mb-2">
        <p className="text-gray-500 text-xs uppercase font-bold">Compte</p>
        <p className="font-bold text-lg">{user?.displayName || "-"}</p>
        <p className="text-teal-600">{user?.email || "-"}</p>
      </div>

      <button
        onClick={logout}
        className="mt-8 w-full p-4 text-red-500 font-bold bg-red-50 rounded-xl flex items-center justify-center gap-2"
      >
        <LogOut size={20} /> DÉCONNEXION
      </button>
    </div>
  );
}
