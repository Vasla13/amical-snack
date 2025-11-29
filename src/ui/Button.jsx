import React from "react";

export default function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) {
  const styles = {
    primary:
      "bg-teal-700 text-white shadow-md active:scale-95 hover:bg-teal-800",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50",
    success: "bg-green-600 text-white shadow-md hover:bg-green-700",
    danger: "bg-red-600 text-white shadow-md hover:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
