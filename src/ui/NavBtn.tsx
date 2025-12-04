import React from "react";
import { LucideIcon } from "lucide-react";

// CORRECTION : Définition des props avec badge optionnel
interface NavBtnProps {
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  label?: string;
  badge?: number; // <--- Ici le point d'interrogation
  highlight?: boolean;
}

export default function NavBtn({
  icon: I,
  active,
  onClick,
  label,
  badge,
  highlight,
}: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center w-16 relative ${
        active
          ? "text-teal-700 dark:text-teal-400"
          : "text-gray-400 dark:text-slate-500"
      }`}
    >
      <div
        className={`relative p-1 rounded-xl transition-all ${
          highlight ? "bg-red-100 text-red-600 animate-pulse" : ""
        }`}
      >
        <I size={24} strokeWidth={active ? 3 : 2} />
        {/* On vérifie si badge existe et est > 0 */}
        {badge && badge > 0 ? (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-slate-900">
            {badge}
          </div>
        ) : null}
      </div>
      {label && <span className="text-[10px] font-bold mt-1">{label}</span>}
    </button>
  );
}
