import React from "react";

export default function NavBtn({
  icon: I,
  active,
  onClick,
  label,
  badge,
  highlight,
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center w-16 relative ${
        active ? "text-teal-700" : "text-gray-400"
      }`}
    >
      <div
        className={`relative p-1 rounded-xl transition-all ${
          highlight ? "bg-red-100 text-red-600 animate-pulse" : ""
        }`}
      >
        <I size={24} strokeWidth={active ? 3 : 2} />
        {badge > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
            {badge}
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
  );
}
