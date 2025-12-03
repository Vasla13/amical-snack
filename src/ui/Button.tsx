import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; // Rendu optionnel
  variant?: "primary" | "secondary" | "success" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
}: ButtonProps) {
  const styles = {
    primary:
      "bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400",
    secondary:
      "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm",
    success:
      "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600",
    danger:
      "bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`px-5 py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
