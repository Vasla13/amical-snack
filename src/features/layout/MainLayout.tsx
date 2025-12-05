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
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { AnimatePresence, motion } from "framer-motion";
import NavBtn from "../../ui/NavBtn"; // Import du composant typé

export default function MainLayout() {
  const { userData } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) {
        return saved === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

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
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 w-full sm:max-w-md sm:mx-auto relative font-sans text-slate-800 dark:text-slate-100 overflow-hidden sm:border-x border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* HEADER FIXE */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-5 py-3 flex justify-between items-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500 rounded-full blur opacity-20"></div>
            <img
              src="/logo.png"
              alt="RT"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain relative z-10"
              // CORRECTION TS : currentTarget
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-none tracking-tight">
              AMICALE{" "}
              <span className="text-teal-600 dark:text-teal-400">R&T</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
              Colmar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-yellow-400 transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

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

      <main className="flex-1 overflow-y-auto pt-20 pb-32 px-1 scroll-smooth no-scrollbar bg-slate-50 dark:bg-slate-950">
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

      <nav className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 rounded-t-2xl p-2 pb-4 z-40 flex justify-around items-center transition-colors">
        <NavBtn
          icon={ShoppingBag}
          active={activeTab === "catalog"}
          onClick={() => navigate("/")}
        />
        <NavBtn
          icon={CreditCard}
          active={activeTab === "cart"}
          onClick={() => navigate("/cart")}
          badge={totalItems}
        />
        <div className="relative -top-5">
          <button
            onClick={() => navigate("/pass")}
            aria-label="Ouvrir le Pass"
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/20 transition-transform active:scale-90 ${
              activeTab === "pass"
                ? "bg-slate-800 dark:bg-white text-teal-400 dark:text-slate-900"
                : "bg-teal-600 text-white"
            }`}
          >
            <QrCode size={30} strokeWidth={2.5} />
          </button>
        </div>
        <NavBtn
          icon={Gift}
          active={activeTab === "loyalty"}
          onClick={() => navigate("/loyalty")}
        />
        <NavBtn
          icon={User}
          active={activeTab === "profile"}
          onClick={() => navigate("/profile")}
        />
      </nav>
    </div>
  );
}
