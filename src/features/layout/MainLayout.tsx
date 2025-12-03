import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  CreditCard,
  QrCode,
  User,
  Gift,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { AnimatePresence, motion } from "framer-motion";

export default function MainLayout() {
  const { userData } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // CORRECTION : On initialise avec la valeur du localStorage ou la préférence système
  const [darkMode, setDarkMode] = useState(() => {
    // Vérification côté client uniquement
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) {
        return saved === "dark";
      }
      // Sinon on regarde la préférence système
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Gestion Dark Mode et Persistance
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const currentPath = location.pathname;
  const activeTab = currentPath === "/" ? "catalog" : currentPath.split("/")[1];

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 max-w-md mx-auto relative font-sans text-slate-800 dark:text-slate-100 overflow-hidden sm:border-x border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* HEADER FIXE (Z-INDEX 50 pour passer au dessus de tout) */}
      {/* Ajout de backdrop-blur-xl et suppression de la bordure blanche trop marquée */}
      <header className="absolute top-0 left-0 right-0 z-50 px-5 py-4 flex justify-between items-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-colors shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500 rounded-full blur opacity-20"></div>
            <img
              src="/logo.png"
              alt="RT"
              className="w-9 h-9 object-contain relative z-10"
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 dark:text-white leading-none tracking-tight">
              AMICALE{" "}
              <span className="text-teal-600 dark:text-teal-400">R&T</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
              Colmar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Dark Mode */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-yellow-400 transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Points */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur pl-3 pr-2 py-1.5 rounded-full border border-teal-100 dark:border-slate-700 flex items-center gap-1.5 shadow-sm">
            <span className="font-black text-teal-700 dark:text-teal-400 text-sm">
              {Number(userData?.points ?? 0)
                .toFixed(2)
                .replace(".", ",")}
            </span>
            <div className="bg-teal-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">
              P
            </div>
          </div>
        </div>
      </header>

      {/* MAIN avec TRANSITIONS DE PAGE */}
      <main className="flex-1 overflow-y-auto pt-20 pb-28 px-1 scroll-smooth no-scrollbar bg-slate-50 dark:bg-slate-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* NAVBAR */}
      <nav className="absolute bottom-6 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-700 rounded-3xl p-2 z-40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-black/50 flex justify-between items-center transition-colors">
        <NavButton
          icon={ShoppingBag}
          active={activeTab === "catalog"}
          onClick={() => navigate("/")}
        />
        <NavButton
          icon={CreditCard}
          active={activeTab === "cart"}
          onClick={() => navigate("/cart")}
          badge={totalItems}
        />
        <div className="relative -top-6">
          <button
            onClick={() => navigate("/pass")}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-teal-500/30 transition-transform active:scale-90 ${
              activeTab === "pass"
                ? "bg-slate-800 dark:bg-white text-teal-400 dark:text-slate-900 ring-4 ring-white dark:ring-slate-900"
                : "bg-teal-600 text-white ring-4 ring-white dark:ring-slate-900"
            }`}
          >
            <QrCode size={26} strokeWidth={2.5} />
          </button>
        </div>
        <NavButton
          icon={Gift}
          active={activeTab === "loyalty"}
          onClick={() => navigate("/loyalty")}
        />
        <NavButton
          icon={User}
          active={activeTab === "profile"}
          onClick={() => navigate("/profile")}
        />
      </nav>
    </div>
  );
}

function NavButton({ icon: Icon, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative ${
        active
          ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
          : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={24} strokeWidth={active ? 3 : 2} />
      {active && (
        <span className="absolute bottom-1.5 w-1 h-1 bg-teal-600 dark:bg-teal-400 rounded-full" />
      )}
      {badge > 0 && (
        <div className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-slate-900">
          {badge}
        </div>
      )}
    </button>
  );
}
