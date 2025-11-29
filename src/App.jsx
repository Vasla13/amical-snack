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
import OrderFlow from "./features/order/OrderFlow.jsx";
import Profile from "./features/profile/Profile.jsx";
import AdminDashboard from "./features/admin/AdminDashboard.jsx";
import LoginScreen from "./features/auth/LoginScreen.jsx";
import LoyaltyScreen from "./features/loyalty/LoyaltyScreen.jsx";
import NavBtn from "./ui/NavBtn.jsx";
import Button from "./ui/Button.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState("loading");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState("catalog");
  const [currentOrder, setCurrentOrder] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const userDataRef = useRef(null);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  // 1. RETOUR MAIL
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt(
          "Confirme ton email pour finaliser la connexion :"
        );
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem("emailForSignIn");
            window.history.replaceState({}, document.title, "/");
          })
          .catch(() => {
            alert("Lien invalide ou expiré.");
            setView("login");
          });
      }
    }
  }, []);

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

  // 3. DONNÉES UTILISATEUR (LOGIQUE CORRIGÉE ICI)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (s) => {
      if (s.exists()) {
        const data = s.data();
        setUserData(data);

        // ORDRE INVERSÉ : D'abord on vérifie le setup (mot de passe), ENSUITE le rôle
        if (data.setup_complete === false) {
          setView("create_password");
        } else if (data.role === "admin") {
          setView("admin");
        } else {
          setView("app");
        }
      }
    });
    return () => unsub();
  }, [user]);

  // CATALOGUE
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "products"), (s) => {
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // COMMANDE
  useEffect(() => {
    if (!currentOrder?.id) return;
    const unsub = onSnapshot(doc(db, "orders", currentOrder.id), (d) => {
      if (d.exists()) setCurrentOrder({ id: d.id, ...d.data() });
    });
    return () => unsub();
  }, [currentOrder?.id]);

  const handleCreatePassword = async () => {
    if (newPassword.length < 6) return alert("6 caractères min !");
    setPwdLoading(true);
    try {
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), { setup_complete: true });
      alert(
        "Mot de passe créé ! Tu pourras utiliser 'Connexion Classique' la prochaine fois."
      );
    } catch (e) {
      alert("Erreur: " + e.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setCart([]);
    setCurrentOrder(null);
    setTab("catalog");
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
      payment_method: null,
    };
    const ref = await addDoc(collection(db, "orders"), orderData);
    setCurrentOrder({ id: ref.id, ...orderData });
    setCart([]);
    setTab("order");
  };

  const payOrder = async (method) => {
    if (!currentOrder) return;
    const totalCents = Number(currentOrder.total_cents || 0);
    if (method === "paypal_balance") {
      const balance = Number(userDataRef.current?.balance_cents || 0);
      if (balance < totalCents) return alert("Solde insuffisant.");
      await updateDoc(doc(db, "users", user.uid), {
        balance_cents: balance - totalCents,
      });
    }
    await updateDoc(doc(db, "orders", currentOrder.id), {
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
  };

  const requestCashPayment = async () => {
    if (!currentOrder) return;
    await updateDoc(doc(db, "orders", currentOrder.id), {
      status: "cash",
      cash_requested_at: serverTimestamp(),
      payment_method: "cash",
    });
  };

  if (view === "loading")
    return (
      <div className="h-screen flex items-center justify-center text-teal-700 font-bold">
        <RefreshCw className="animate-spin mr-2" /> Chargement...
      </div>
    );
  if (view === "login") return <LoginScreen />;

  if (view === "create_password") {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white font-sans text-center">
        <div className="bg-green-100 p-4 rounded-full mb-4 text-green-700">
          <Check size={48} />
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">
          Bienvenue Admin !
        </h1>
        <p className="text-gray-500 mb-8">
          Dernière étape : choisis ton mot de passe administrateur pour te
          connecter simplement la prochaine fois.
        </p>
        <div className="w-full max-w-sm space-y-4">
          <div className="text-left">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Mot de passe secret
            </label>
            <input
              type="password"
              className="w-full p-4 bg-gray-50 rounded-xl border focus:border-teal-500 outline-none font-bold"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleCreatePassword}
            disabled={pwdLoading}
            className="w-full shadow-lg shadow-green-100 bg-green-600 hover:bg-green-700"
          >
            {pwdLoading ? "Enregistrement..." : "FINALISER LE COMPTE"}
          </Button>
        </div>
      </div>
    );
  }

  if (view === "admin")
    return (
      <AdminDashboard db={db} products={products} onLogout={handleLogout} />
    );

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
        {tab === "catalog" && (
          <Catalog products={products} cart={cart} setCart={setCart} />
        )}
        {tab === "cart" && (
          <Cart cart={cart} setCart={setCart} onValidate={createOrder} />
        )}
        {tab === "order" && (
          <OrderFlow
            order={currentOrder}
            user={userData}
            onPay={payOrder}
            onRequestCash={requestCashPayment}
            onClose={() => {
              setTab("catalog");
              setCurrentOrder(null);
            }}
          />
        )}
        {tab === "loyalty" && (
          <LoyaltyScreen user={userData} products={products} db={db} />
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
