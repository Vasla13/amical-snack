import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  onAuthStateChanged,
} from "firebase/auth";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { auth, db } from "./config/firebase.js";
import { useAuth } from "./context/AuthContext.jsx";
import { ADMIN_EMAIL } from "./config/constants.js";

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
  const { user, userData, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // États globaux
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  // Gestion de la finalisation du lien magique
  const [isFinishingLogin, setIsFinishingLogin] = useState(false);
  const [emailForLink, setEmailForLink] = useState("");
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  // Gestion création mot de passe
  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const userDataRef = useRef(null);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const notify = useCallback(
    (msg, type = "info") => setToast({ msg, type }),
    []
  );
  const confirmAction = (opts) => setModal(opts);

  // --- 1. GESTION DU LIEN MAGIQUE (Au chargement) ---
  useEffect(() => {
    // Si c'est un lien de connexion email
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // On récupère l'email stocké (si même navigateur)
      let email = window.localStorage.getItem("emailForSignIn");

      if (!email) {
        // Si on a changé de navigateur (ex: App Mail -> Safari), on doit redemander l'email
        setNeedsEmailConfirm(true);
      } else {
        // Sinon on finalise direct
        completeSignIn(email);
      }
    }
  }, []);

  const completeSignIn = async (email) => {
    try {
      setIsFinishingLogin(true);
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      // Une fois connecté, le AuthContext prendra le relais
      // et redirigera vers /setup si le mot de passe manque
    } catch (error) {
      console.error(error);
      notify("Lien expiré ou invalide. Recommence.", "error");
      navigate("/login");
    } finally {
      setIsFinishingLogin(false);
      setNeedsEmailConfirm(false);
    }
  };

  // --- 2. DONNÉES TEMPS RÉEL ---
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [user]);

  // --- 3. CRÉATION DU MOT DE PASSE (Setup) ---
  const handleCreatePassword = async () => {
    if (newPassword.length < 6) return notify("6 caractères min !", "error");
    setPwdLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Session perdue.");

      // 1. On met à jour le mot de passe sur le compte AUTH
      await updatePassword(currentUser, newPassword);

      // 2. On marque le compte comme configuré dans FIRESTORE
      await updateDoc(doc(db, "users", currentUser.uid), {
        setup_complete: true,
      });

      notify("Compte configuré ! Bienvenue.", "success");
      // La redirection se fera automatiquement via le ProtectedRoute car setup_complete sera true
    } catch (e) {
      console.error(e);
      notify("Erreur: " + e.message, "error");
    } finally {
      setPwdLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
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

  // --- VUES DE CHARGEMENT / CONFIRMATION ---

  if (authLoading || isFinishingLogin) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Cas où on a changé de navigateur : on demande juste l'email pour valider le lien
  if (needsEmailConfirm) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white max-w-md mx-auto">
        <h2 className="text-xl font-black mb-4 text-center">Sécurité</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Confirme ton email pour finaliser la connexion.
        </p>
        <input
          className="border p-4 rounded-xl w-full font-bold mb-4 bg-slate-50 focus:ring-2 ring-teal-500 outline-none"
          placeholder="Ton email (@uha.fr)"
          value={emailForLink}
          onChange={(e) => setEmailForLink(e.target.value)}
        />
        <Button onClick={() => completeSignIn(emailForLink)} className="w-full">
          VALIDER
        </Button>
      </div>
    );
  }

  // Routeur
  const ProtectedRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    // Si l'utilisateur est connecté mais n'a pas fini le setup (pas de mot de passe)
    if (userData && userData.setup_complete === false)
      return <Navigate to="/setup" />;
    if (userData && userData.role === "admin") return <Navigate to="/admin" />;
    return children;
  };

  return (
    <>
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
        <Route
          path="/login"
          element={!user ? <LoginScreen /> : <Navigate to="/" />}
        />

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

        {/* PAGE DE CRÉATION DE MOT DE PASSE (APRES CLIC EMAIL) */}
        <Route
          path="/setup"
          element={
            user && userData?.setup_complete === false ? (
              <div className="h-screen flex flex-col items-center justify-center p-6 bg-white text-center font-sans max-w-md mx-auto">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h1 className="text-2xl font-black text-gray-800 mb-2">
                  Dernière étape !
                </h1>
                <p className="text-gray-500 mb-8 text-sm">
                  Choisis un mot de passe pour te connecter plus facilement la
                  prochaine fois.
                </p>
                <div className="w-full space-y-4">
                  <input
                    type="password"
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    placeholder="Ton mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    onClick={handleCreatePassword}
                    disabled={pwdLoading}
                    className="w-full py-4 text-base shadow-xl shadow-teal-500/20"
                  >
                    {pwdLoading ? "Enregistrement..." : "TERMINER ET ENTRER"}
                  </Button>
                </div>
              </div>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Catalog products={products} />} />
          <Route path="cart" element={<Cart notify={notify} />} />
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
