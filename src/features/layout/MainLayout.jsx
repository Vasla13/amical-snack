import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, CreditCard, QrCode, User, Gift } from "lucide-react";
import NavBtn from "../../ui/NavBtn.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx"; // <--- Import

export default function MainLayout() {
  const { userData } = useAuth();
  const { totalItems } = useCart(); // <--- Hook
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
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto relative font-sans text-gray-800">
      <header className="bg-white p-3 shadow-sm flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="RT"
            className="w-10 h-10 object-contain"
            onError={(e) => (e.target.style.display = "none")}
          />
          <div>
            <h1 className="font-black text-lg text-teal-800 leading-none">
              AMICALE R&T
            </h1>
            <p className="text-xs text-gray-400 font-bold">COLMAR</p>
          </div>
        </div>
        <div className="bg-teal-50 px-3 py-1 rounded-full border border-teal-100 flex items-center gap-1">
          <span className="font-bold text-teal-800">
            {Number(userData?.points ?? 0).toFixed(2)}
          </span>
          <span className="text-[10px] uppercase text-teal-600 font-bold">
            pts
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
        <Outlet />
      </main>

      <nav className="absolute bottom-0 w-full bg-white border-t flex justify-around p-2 pb-5 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
        <NavBtn
          icon={ShoppingBag}
          active={activeTab === "catalog"}
          onClick={() => navigate("/")}
          label="Carte"
        />
        <NavBtn
          icon={CreditCard}
          active={activeTab === "cart"}
          onClick={() => navigate("/cart")}
          label="Panier"
          badge={totalItems}
        />
        <NavBtn
          icon={Gift}
          active={activeTab === "loyalty"}
          onClick={() => navigate("/loyalty")}
          label="Cadeaux"
        />
        <NavBtn
          icon={QrCode}
          active={activeTab === "pass"}
          onClick={() => navigate("/pass")}
          label="Pass"
        />
        <NavBtn
          icon={User}
          active={activeTab === "profile"}
          onClick={() => navigate("/profile")}
          label="Moi"
        />
      </nav>
    </div>
  );
}
