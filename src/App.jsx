import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  serverTimestamp,
  setDoc,
  query,
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { ShoppingBag, CreditCard, QrCode, User, RefreshCw } from "lucide-react";

import { auth, db } from "./config/firebase.js";
import { ADMIN_EMAILS } from "./config/constants.js";
import { generateToken } from "./lib/token.js";

import Catalog from "./features/catalog/Catalog.jsx";
import Cart from "./features/cart/Cart.jsx";
import OrderFlow from "./features/order/OrderFlow.jsx";
import Profile from "./features/profile/Profile.jsx";
import AdminDashboard from "./features/admin/AdminDashboard.jsx";
import LoginScreen from "./features/auth/LoginScreen.jsx";
import NavBtn from "./ui/NavBtn.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState("loading");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState("catalog");
  const [currentOrder, setCurrentOrder] = useState(null);

  // Auth & Init
  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setView("login");
    });
  }, []);

  // User doc listener (✅ avec gestion "déconnecté" si pas d'email)
  useEffect(() => {
    if (!user) return;

    return onSnapshot(doc(db, "users", user.uid), (s) => {
      if (!s.exists()) {
        setUserData(null);
        setView("login");
        return;
      }

      const data = s.data();
      setUserData(data);

      // ✅ Si pas d'email => on considère l'utilisateur "déconnecté" côté app
      if (!data.email) {
        setView("login");
        return;
      }

      setView(data.role === "admin" ? "admin" : "app");
    });
  }, [user]);

  // Products listener
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "products"), (s) => {
      const p = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(p);
    });
  }, [user]);

  // Order realtime listener
  useEffect(() => {
    if (!currentOrder?.id) return;
    const unsub = onSnapshot(doc(db, "orders", currentOrder.id), (d) => {
      if (d.exists()) setCurrentOrder({ id: d.id, ...d.data() });
    });
    return () => unsub();
  }, [currentOrder?.id]);

  const handleLogin = async (email) => {
    if (!email.includes("@uha.fr")) return alert("Email @uha.fr requis");
    const isAdmin = ADMIN_EMAILS.includes(email);

    await setDoc(
      doc(db, "users", user.uid),
      {
        email,
        role: isAdmin ? "admin" : "user",
        points: isAdmin ? 999 : userData?.points || 0,
        displayName: email.split(".")[0],
      },
      { merge: true }
    );
  };

  // ✅ NOUVEAU : "déconnexion" applicative (sans reload, sans reconnexion auto)
  const handleLogout = async () => {
    if (!user) return;

    // reset UI
    setCart([]);
    setCurrentOrder(null);
    setTab("catalog");

    // on "efface" l'identité applicative (mais l'anonymous session reste)
    await setDoc(
      doc(db, "users", user.uid),
      { email: null, role: null, displayName: null },
      { merge: true }
    );

    // l'écoute Firestore basculera sur login, mais on le force aussi
    setView("login");
  };

  const createOrder = async () => {
    if (!cart.length) return;
    const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);
    const orderData = {
      user_id: user.uid,
      items: cart,
      total_cents: total,
      status: "created",
      qr_token: generateToken(),
      created_at: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "orders"), orderData);
    setCurrentOrder({ id: ref.id, ...orderData });
    setCart([]);
    setTab("order");
  };

  const payOrder = async () => {
    if (!currentOrder) return;
    await updateDoc(doc(db, "orders", currentOrder.id), {
      status: "paid",
      paid_at: serverTimestamp(),
    });
    const newPoints = (userData?.points || 0) + 1;
    await updateDoc(doc(db, "users", user.uid), { points: newPoints });
  };

  if (view === "loading") {
    return (
      <div className="h-screen flex items-center justify-center text-teal-700 font-bold">
        <RefreshCw className="animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  if (view === "login") return <LoginScreen onLogin={handleLogin} />;
  if (view === "admin") return <AdminDashboard db={db} products={products} />;

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
          <div
            className="w-10 h-10 bg-teal-700 rounded-full flex items-center justify-center text-white font-bold hidden"
            id="logo-fallback"
          >
            RT
          </div>
          <div>
            <h1 className="font-black text-lg text-teal-800 leading-none">
              AMICALE R&amp;T
            </h1>
            <p className="text-xs text-gray-400 font-bold">COLMAR</p>
          </div>
        </div>
        <div className="bg-teal-50 px-3 py-1 rounded-full border border-teal-100 flex items-center gap-1">
          <span className="font-bold text-teal-800">
            {userData?.points || 0}
          </span>
          <span className="text-[10px] uppercase text-teal-600 font-bold">
            pts
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
        {tab === "catalog" && (
          <Catalog products={products} cart={cart} setCart={setCart} />
        )}
        {tab === "cart" && (
          <Cart cart={cart} setCart={setCart} onValidate={createOrder} />
        )}
        {tab === "order" && (
          <OrderFlow
            order={currentOrder}
            onPay={payOrder}
            onClose={() => {
              setTab("catalog");
              setCurrentOrder(null);
            }}
          />
        )}
        {tab === "profile" && <Profile user={userData} logout={handleLogout} />}
      </main>

      <nav className="absolute bottom-0 w-full bg-white border-t flex justify-around p-2 pb-5 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
        <NavBtn
          icon={ShoppingBag}
          active={tab === "catalog"}
          onClick={() => setTab("catalog")}
          label="Carte"
        />
        <NavBtn
          icon={CreditCard}
          active={tab === "cart"}
          onClick={() => setTab("cart")}
          label="Panier"
          badge={cart.reduce((a, c) => a + c.qty, 0)}
        />
        <NavBtn
          icon={QrCode}
          active={tab === "order"}
          onClick={() =>
            currentOrder ? setTab("order") : alert("Pas de commande")
          }
          label="Pass"
          highlight={!!currentOrder}
        />
        <NavBtn
          icon={User}
          active={tab === "profile"}
          onClick={() => setTab("profile")}
          label="Moi"
        />
      </nav>
    </div>
  );
}
