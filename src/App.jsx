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
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { auth, db } from "./config/firebase.js";
import { generateToken } from "./lib/token.js";
import { useAuth } from "./context/AuthContext.jsx";

// Pages
import LoginScreen from "./features/auth/LoginScreen.jsx";
import MainLayout from "./features/layout/MainLayout.jsx";
import Catalog from "./features/catalog/Catalog.jsx";
import Cart from "./features/cart/Cart.jsx";
import PassScreen from "./features/order/PassScreen.jsx";
import LoyaltyScreen from "./features/loyalty/LoyaltyScreen.jsx";
import Profile from "./features/profile/Profile.jsx";
import AdminDashboard from "./features/admin/AdminDashboard.jsx";

// UI Components
import Button from "./ui/Button.jsx";
import Toast from "./ui/Toast.jsx";
import Modal from "./ui/Modal.jsx";

export default function App() {
  const { user, userData, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // États globaux
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  // États UI
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

  // 1. GESTION DU RETOUR LIEN MAGIQUE
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
        setEmailPrompt(false);
        // La redirection sera gérée par le state 'user' qui changera
      })
      .catch(() => {
        notify("Lien invalide ou expiré.", "error");
      });
  };

  // 2. CHARGEMENT PRODUITS
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [user]);

  // --- ACTIONS GLOBALES ---

  const handleCreatePassword = async () => {
    if (newPassword.length < 6) return notify("6 caractères min !", "error");
    setPwdLoading(true);
    try {
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), { setup_complete: true });
      notify("Compte finalisé !", "success");
      // Le router va automatiquement rediriger vers / car userData changera
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setCart([]);
    navigate("/login");
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
    navigate("/pass"); // Navigation auto vers le pass
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

  // --- RENDU SPÉCIAL (Hors routing) ---

  if (loading) return null; // ou Spinner déjà géré par AuthProvider

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

  // --- ROUTING ---

  // Protection : Redirige vers login si pas connecté
  const ProtectedRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    if (userData && userData.setup_complete === false)
      return <Navigate to="/setup" />;
    if (userData && userData.role === "admin") return <Navigate to="/admin" />;
    return children;
  };

  return (
    <>
      {/* Éléments UI Globaux */}
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

      <Routes>
        {/* Route Login */}
        <Route
          path="/login"
          element={!user ? <LoginScreen /> : <Navigate to="/" />}
        />

        {/* Route Admin */}
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <AdminDashboard
                db={db}
                products={products}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Route Setup (Création password) */}
        <Route
          path="/setup"
          element={
            user && userData?.setup_complete === false ? (
              <div className="h-screen flex flex-col items-center justify-center p-6 bg-white text-center font-sans">
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
              </div>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Routes Application (Protégées + Layout) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout cartCount={cart.reduce((a, c) => a + c.qty, 0)} />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Catalog products={products} cart={cart} setCart={setCart} />
            }
          />
          <Route
            path="cart"
            element={
              <Cart cart={cart} setCart={setCart} onValidate={createOrder} />
            }
          />
          <Route
            path="pass"
            element={
              <PassScreen
                db={db}
                onPay={payOrder}
                onRequestCash={requestCashPayment}
              />
            }
          />
          <Route
            path="loyalty"
            element={
              <LoyaltyScreen
                user={userData}
                products={products}
                db={db}
                onGoToPass={() => navigate("/pass")}
                notify={notify}
                onConfirm={confirmAction}
              />
            }
          />
          <Route
            path="profile"
            element={
              <Profile
                user={userData}
                logout={handleLogout}
                db={db}
                uid={user?.uid}
                auth={auth}
              />
            }
          />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
