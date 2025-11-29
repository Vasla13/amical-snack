import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, CreditCard, QrCode, User, Gift } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";

export default function MainLayout() {
  const { userData } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const activeTab =
    currentPath === "/"
      ? "catalog"
      : currentPath.startsWith("/cart")
      ? "cart"
      : currentPath.startsWith("/pass")
      ? "pass"
      : currentPath.startsWith("/loyalty")
      ? "loyalty"
      : currentPath.startsWith("/profile")
      ? "profile"
      : "";

  return (
    <div className="h-screen flex flex-col bg-slate-50 max-w-md mx-auto relative font-sans text-slate-800 overflow-hidden sm:border-x border-slate-200">
      {/* HEADER GLASSMORPHIC */}
      <header className="absolute top-0 left-0 right-0 z-30 px-5 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-white/50">
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
          <div className="flex flex-col">
            <h1 className="font-black text-lg text-slate-800 tracking-tight leading-none">
              AMICALE <span className="text-teal-600">R&T</span>
            </h1>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Colmar
            </span>
          </div>
        </div>

        {/* Badge Points */}
        <div className="bg-white/60 backdrop-blur pl-3 pr-2 py-1.5 rounded-full border border-teal-100 flex items-center gap-1.5 shadow-sm">
          <span className="font-black text-teal-700 text-sm">
            {Number(userData?.points ?? 0)
              .toFixed(2)
              .replace(".", ",")}
          </span>
          <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[8px] font-black shadow-sm">
            P
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto pt-20 pb-28 px-1 scroll-smooth no-scrollbar">
        <Outlet />
      </main>

      {/* NAVIGATION FLOTTANTE */}
      <nav className="absolute bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-2 z-40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex justify-between items-center">
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

        {/* Bouton Central (Pass/QR) */}
        <div className="relative -top-6">
          <button
            onClick={() => navigate("/pass")}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-teal-500/30 transition-transform active:scale-90 ${
              activeTab === "pass"
                ? "bg-slate-800 text-teal-400 ring-4 ring-white"
                : "bg-teal-600 text-white ring-4 ring-white"
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
        active ? "text-teal-600 bg-teal-50" : "text-slate-400 hover:bg-slate-50"
      }`}
    >
      <Icon size={24} strokeWidth={active ? 3 : 2} />
      {active && (
        <span className="absolute bottom-1.5 w-1 h-1 bg-teal-600 rounded-full" />
      )}
      {badge > 0 && (
        <div className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white">
          {badge}
        </div>
      )}
    </button>
  );
}
