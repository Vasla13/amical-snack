import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
} from "firebase/auth";
import { ShoppingBag, CreditCard, QrCode, User, Gift } from "lucide-react";

import { auth, db } from "./config/firebase.js";
import { generateToken } from "./lib/token.js";
import { useAuth } from "./context/AuthContext.jsx";

import Catalog from "./features/catalog/Catalog.jsx";
import Cart from "./features/cart/Cart.jsx";
import PassScreen from "./features/order/PassScreen.jsx";
import Profile from "./features/profile/Profile.jsx";
import AdminDashboard from "./features/admin/AdminDashboard.jsx";
import LoginScreen from "./features/auth/LoginScreen.jsx";
import LoyaltyScreen from "./features/loyalty/LoyaltyScreen.jsx";
import NavBtn from "./ui/NavBtn.jsx";
import Button from "./ui/Button.jsx";
import Toast from "./ui/Toast.jsx";
import Modal from "./ui/Modal.jsx";

export default function App() {
  const { user, userData } = useAuth();

  const [view, setView] = useState("login");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState("catalog");

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [emailPrompt, setEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const userDataRef = useRef(null);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const notify = (msg, type = "info") => setToast({ msg, type });
  const confirmAction = (opts) => setModal(opts);

  // 1. ROUTING
  useEffect(() => {
    if (!user) {
      setView("login");
    } else if (userData) {
      if (userData.setup_complete === false) {
        setView("create_password");
      } else if (userData.role === "admin") {
        setView("admin");
      } else {
        setView("app");
      }
    }
  }, [user, userData]);

  // 2. LIEN MAGIQUE
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        setEmailPrompt(true);
      } else {
        finishSignIn(email);
      }
    }
  }, []);

  const finishSignIn = (email) => {
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem("emailForSignIn");
        window.history.replaceState({}, document.title, "/");
        setEmailPrompt(false);
      })
      .catch(() => {
        notify("Lien invalide ou expiré.", "error");
        setView("login");
      });
  };

  // 3. DATA
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [user]);

  // ACTIONS
  const handleCreatePassword = async () => {
    if (newPassword.length < 6) return notify("6 caractères min !", "error");
    setPwdLoading(true);
    try {
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), { setup_complete: true });
      notify("Compte finalisé !", "success");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setCart([]);
    setTab("catalog");
  };

  const createOrder = async () => {
    if (!cart.length) return;
    const outOfStock = cart.find((i) => i.is_available === false);
    if (outOfStock) return notify(`Rupture : ${outOfStock.name}`, "error");

    const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);
    const orderData = {
      user_id: user.uid,
      items: cart,
      total_cents: total,
      status: "created",
      qr_token: generateToken(),
      created_at: serverTimestamp(),
      payment_method: null,
    };
    await addDoc(collection(db, "orders"), orderData);
    setCart([]);
    setTab("pass");
    notify("Commande créée !", "success");
  };

  const payOrder = async (method, order) => {
    const totalCents = Number(order.total_cents || 0);
    if (method === "paypal_balance") {
      const balance = Number(userDataRef.current?.balance_cents || 0);
      if (balance < totalCents) return notify("Solde insuffisant.", "error");
      await updateDoc(doc(db, "users", user.uid), {
        balance_cents: balance - totalCents,
      });
    }
    await updateDoc(doc(db, "orders", order.id), {
      status: "paid",
      paid_at: serverTimestamp(),
      payment_method: method,
      payment_simulated: true,
      points_earned: totalCents / 100,
    });
    // Ajout des points
    const prevPts = Number(userDataRef.current?.points || 0);
    await updateDoc(doc(db, "users", user.uid), {
      points: prevPts + totalCents / 100,
    });
    notify("Paiement validé !", "success");
  };

  const requestCashPayment = async (order) => {
    await updateDoc(doc(db, "orders", order.id), {
      status: "cash",
      cash_requested_at: serverTimestamp(),
      payment_method: "cash",
    });
    notify("Vendeur notifié.", "info");
  };

  // RENDU
  if (view === "login") return <LoginScreen />;

  if (emailPrompt) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white">
        <h2 className="text-xl font-black mb-4">Confirme ton email</h2>
        <input
          className="border p-3 rounded-xl w-full max-w-sm mb-4"
          placeholder="Email UHA"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
        />
        <Button onClick={() => finishSignIn(emailInput)}>VALIDER</Button>
      </div>
    );
  }

  if (view === "create_password") {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white text-center">
        <h1 className="text-2xl font-black text-gray-800 mb-2">
          Compte validé !
        </h1>
        <p className="text-gray-500 mb-8">Choisis un mot de passe.</p>
        <div className="w-full max-w-sm space-y-4">
          <input
            type="password"
            className="w-full p-4 bg-gray-50 rounded-xl border font-bold"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            onClick={handleCreatePassword}
            disabled={pwdLoading}
            className="w-full"
          >
            {pwdLoading ? "..." : "TERMINER"}
          </Button>
        </div>
        {toast && (
          <Toast
            msg={toast.msg}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  if (view === "admin")
    return (
      <AdminDashboard db={db} products={products} onLogout={handleLogout} />
    );

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto relative font-sans text-gray-800">
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Modal
        isOpen={!!modal}
        title={modal?.title}
        onConfirm={() => {
          modal.onOk && modal.onOk();
          setModal(null);
        }}
        onCancel={() => setModal(null)}
        confirmText={modal?.confirmText}
        cancelText={modal?.cancelText}
      >
        {modal?.text}
      </Modal>

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
        {tab === "catalog" && (
          <Catalog products={products} cart={cart} setCart={setCart} />
        )}
        {tab === "cart" && (
          <Cart cart={cart} setCart={setCart} onValidate={createOrder} />
        )}
        {tab === "pass" && (
          <PassScreen
            db={db}
            onPay={payOrder} // ✅ CORRIGÉ : On passe la fonction directement
            onRequestCash={requestCashPayment} // ✅ CORRIGÉ
          />
        )}
        {tab === "loyalty" && (
          <LoyaltyScreen
            user={userData}
            products={products}
            db={db}
            onGoToPass={() => setTab("pass")}
            notify={notify}
            onConfirm={confirmAction}
          />
        )}
        {tab === "profile" && (
          <Profile
            user={userData}
            logout={handleLogout}
            db={db}
            uid={user?.uid}
            auth={auth}
          />
        )}
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
          icon={Gift}
          active={tab === "loyalty"}
          onClick={() => setTab("loyalty")}
          label="Cadeaux"
        />
        <NavBtn
          icon={QrCode}
          active={tab === "pass"}
          onClick={() => setTab("pass")}
          label="Pass"
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
