import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
} from "firebase/auth";
import {
  ShoppingBag,
  CreditCard,
  QrCode,
  User,
  RefreshCw,
  Check,
  Gift,
} from "lucide-react";

import { auth, db } from "./config/firebase.js";
import { ADMIN_EMAIL } from "./config/constants.js";
import { generateToken } from "./lib/token.js";

import Catalog from "./features/catalog/Catalog.jsx";
import Cart from "./features/cart/Cart.jsx";
import PassScreen from "./features/order/PassScreen.jsx"; // ✅ NOUVEAU
import Profile from "./features/profile/Profile.jsx";
import AdminDashboard from "./features/admin/AdminDashboard.jsx";
import LoginScreen from "./features/auth/LoginScreen.jsx";
import LoyaltyScreen from "./features/loyalty/LoyaltyScreen.jsx";
import NavBtn from "./ui/NavBtn.jsx";
import Button from "./ui/Button.jsx";
import Toast from "./ui/Toast.jsx"; // ✅ NOUVEAU
import Modal from "./ui/Modal.jsx"; // ✅ NOUVEAU

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState("loading");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState("catalog");

  // UI States
  const [toast, setToast] = useState(null); // { msg: "...", type: "success" }
  const [modal, setModal] = useState(null); // { title: "...", text: "...", onOk: fn }
  const [emailPrompt, setEmailPrompt] = useState(false); // Pour le retour lien magique
  const [emailInput, setEmailInput] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const userDataRef = useRef(null);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  // Helpers UI
  const notify = (msg, type = "info") => setToast({ msg, type });
  const confirmAction = (opts) => setModal(opts); // { title, text, confirmText, cancelText, onOk }

  // 1. RETOUR MAIL
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        setEmailPrompt(true); // Affiche l'input au lieu du prompt natif
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

  // 2. AUTH STATE
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u && (!u.email || u.isAnonymous)) {
        await auth.signOut();
        setUser(null);
        setView("login");
        return;
      }
      setUser(u);
      if (!u) {
        setView("login");
        setUserData(null);
      } else {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const isAdmin = u.email === ADMIN_EMAIL;
          await setDoc(userRef, {
            email: u.email,
            displayName: u.email.split("@")[0],
            role: isAdmin ? "admin" : "user",
            points: isAdmin ? 9999 : 0,
            balance_cents: 0,
            created_at: serverTimestamp(),
            setup_complete: false,
          });
        }
      }
    });
  }, []);

  // 3. USER DATA
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (s) => {
      if (s.exists()) {
        const data = s.data();
        setUserData({ ...data, uid: user.uid });
        if (data.setup_complete === false) setView("create_password");
        else if (data.role === "admin") setView("admin");
        else setView("app");
      }
    });
    return () => unsub();
  }, [user]);

  // CATALOG
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  const handleCreatePassword = async () => {
    if (newPassword.length < 6) return notify("6 caractères min !", "error");
    setPwdLoading(true);
    try {
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), { setup_complete: true });
      notify("Compte finalisé ! Bienvenue.", "success");
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
    setView("login");
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
    setTab("pass"); // Redirection vers le Pass
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

  // --- RENDU ---

  if (view === "loading")
    return (
      <div className="h-screen flex items-center justify-center text-teal-700 font-bold">
        <RefreshCw className="animate-spin mr-2" /> Chargement...
      </div>
    );
  if (view === "login") return <LoginScreen />;

  // Écran spécial : Demande email si retour lien magique sur autre appareil
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
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white font-sans text-center">
        <div className="bg-green-100 p-4 rounded-full mb-4 text-green-700">
          <Check size={48} />
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">
          Compte validé !
        </h1>
        <p className="text-gray-500 mb-8">
          Choisis un mot de passe pour tes prochaines connexions.
        </p>
        <div className="w-full max-w-sm space-y-4">
          <input
            type="password"
            className="w-full p-4 bg-gray-50 rounded-xl border focus:border-teal-500 outline-none font-bold"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            onClick={handleCreatePassword}
            disabled={pwdLoading}
            className="w-full bg-green-600 hover:bg-green-700"
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
      {/* Toast & Modal globaux */}
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

        {/* NOUVEAU PASS SCREEN (qui gère OrderFlow en interne) */}
        {tab === "pass" && (
          <PassScreen
            user={userData}
            db={db}
            onPay={(m) => payOrder(m, currentOrder)} // On passera l'ordre spécifique dans PassScreen
            onRequestCash={() => requestCashPayment(currentOrder)}
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
