import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Suspense,
  lazy,
} from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  increment,
} from "firebase/firestore";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  linkWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { auth, db } from "./config/firebase.js";
import { useAuth } from "./context/AuthContext.tsx";
import { ADMIN_EMAIL } from "./config/constants.js";

// Eager Loading
import LoginScreen from "./features/auth/LoginScreen.jsx";
import AuthAction from "./features/auth/AuthAction.jsx";
import MainLayout from "./features/layout/MainLayout.jsx";

// Lazy Loading
const Catalog = lazy(() => import("./features/catalog/Catalog.jsx"));
const Cart = lazy(() => import("./features/cart/Cart.jsx"));
const PassScreen = lazy(() => import("./features/order/PassScreen.jsx"));
const LoyaltyScreen = lazy(() =>
  import("./features/loyalty/LoyaltyScreen.jsx")
);
const Profile = lazy(() => import("./features/profile/Profile.jsx"));
const AdminDashboard = lazy(() =>
  import("./features/admin/AdminDashboard.jsx")
);
const KitchenDisplay = lazy(() =>
  import("./features/admin/KitchenDisplay.jsx")
);

import Button from "./ui/Button.jsx";
import Toast from "./ui/Toast.jsx";
import Modal from "./ui/Modal.jsx";

const Loading = () => (
  <div className="h-full flex items-center justify-center p-10">
    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
  </div>
);

// --- CORRECTION : ProtectedRoute est défini ICI, en dehors de App ---
// Cela empêche le démontage complet de l'application à chaque mise à jour des points
const ProtectedRoute = ({ children }) => {
  const { user, userData, isAdmin } = useAuth(); // On récupère le contexte ici

  if (!user) return <Navigate to="/login" />;

  // Attente du chargement du profil Firestore
  if (userData === null && !isAdmin)
    return (
      <div className="h-screen flex items-center justify-center">
        Chargement...
      </div>
    );

  if (userData && userData.setup_complete === false)
    return <Navigate to="/setup" />;

  if (userData && userData.role === "admin") return <Navigate to="/admin" />;

  return children;
};

export default function App() {
  const { user, userData, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const [isFinishingLogin, setIsFinishingLogin] = useState(false);
  const [emailForLink, setEmailForLink] = useState("");
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const loginAttempted = useRef(false);
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

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      if (loginAttempted.current) return;
      loginAttempted.current = true;
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        setNeedsEmailConfirm(true);
      } else {
        completeSignIn(email);
      }
    }
  }, []);

  const completeSignIn = async (email) => {
    try {
      setIsFinishingLogin(true);
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      notify("Connexion réussie !", "success");
      navigate("/");
    } catch (error) {
      console.error(error);
      notify("Lien invalide ou expiré.", "error");
      navigate("/login");
    } finally {
      setIsFinishingLogin(false);
      setNeedsEmailConfirm(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [user]);

  const handleCreatePassword = async () => {
    if (newPassword.length < 6) return notify("6 caractères min !", "error");
    setPwdLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Session perdue.");
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        newPassword
      );
      try {
        await linkWithCredential(currentUser, credential);
      } catch (err) {
        if (err.code === "auth/provider-already-linked") {
          await updatePassword(currentUser, newPassword);
        } else if (err.code === "auth/requires-recent-login") {
          await auth.signOut();
          throw new Error("Session expirée. Recommence la connexion.");
        } else {
          throw err;
        }
      }
      await updateDoc(doc(db, "users", currentUser.uid), {
        setup_complete: true,
      });
      notify("Compte configuré ! Bienvenue.", "success");
    } catch (e) {
      console.error(e);
      notify("Erreur: " + e.message, "error");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const payOrder = async (method, order) => {
    const totalCents = Number(order.total_cents || 0);
    const pointsEarned = totalCents / 100;
    const currentMonthKey = new Date().toISOString().slice(0, 7);

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
      points_earned: pointsEarned,
    });

    await updateDoc(doc(db, "users", user.uid), {
      points: increment(pointsEarned),
      [`points_history.${currentMonthKey}`]: increment(pointsEarned),
    });

    await addDoc(collection(db, "users", user.uid, "transactions"), {
      type: "earn",
      amount: pointsEarned,
      reason: `Commande #${order.qr_token}`,
      date: serverTimestamp(),
    });

    notify("Paiement validé ! Points gagnés.", "success");
  };

  const requestCashPayment = async (order) => {
    await updateDoc(doc(db, "orders", order.id), {
      status: "cash",
      cash_requested_at: serverTimestamp(),
      payment_method: "cash",
    });
    notify("Vendeur notifié.", "info");
  };

  if (authLoading || isFinishingLogin) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (needsEmailConfirm) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 max-w-md mx-auto">
        <h2 className="text-xl font-black mb-4 text-center dark:text-white">
          Sécurité
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
          Confirme ton email pour finaliser la connexion.
        </p>
        <input
          className="border p-4 rounded-xl w-full font-bold mb-4 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:ring-2 ring-teal-500 outline-none dark:text-white"
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

      <Suspense
        fallback={<div className="h-screen bg-slate-50 dark:bg-slate-950" />}
      >
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
          <Route
            path="/kitchen"
            element={isAdmin ? <KitchenDisplay /> : <Navigate to="/" />}
          />

          <Route
            path="/setup"
            element={
              user && userData?.setup_complete === false ? (
                <div className="h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 text-center font-sans max-w-md mx-auto">
                  <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
                    Dernière étape !
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
                    Choisis un mot de passe.
                  </p>
                  <div className="w-full space-y-4">
                    <input
                      type="password"
                      className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 font-bold outline-none focus:border-teal-500 transition-all dark:text-white"
                      placeholder="Ton mot de passe"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      onClick={handleCreatePassword}
                      disabled={pwdLoading}
                      className="w-full py-4 text-base"
                    >
                      {pwdLoading ? "Enregistrement..." : "TERMINER"}
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
            <Route
              index
              element={
                <Suspense fallback={<Loading />}>
                  <Catalog products={products} />
                </Suspense>
              }
            />
            <Route
              path="cart"
              element={
                <Suspense fallback={<Loading />}>
                  <Cart notify={notify} />
                </Suspense>
              }
            />
            <Route
              path="pass"
              element={
                <Suspense fallback={<Loading />}>
                  <PassScreen
                    db={db}
                    onPay={payOrder}
                    onRequestCash={requestCashPayment}
                  />
                </Suspense>
              }
            />
            <Route
              path="loyalty"
              element={
                <Suspense fallback={<Loading />}>
                  <LoyaltyScreen
                    user={userData}
                    products={products}
                    db={db}
                    onGoToPass={() => navigate("/pass")}
                    notify={notify}
                    onConfirm={confirmAction}
                  />
                </Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={<Loading />}>
                  <Profile
                    user={userData}
                    logout={handleLogout}
                    db={db}
                    uid={user?.uid}
                    auth={auth}
                  />
                </Suspense>
              }
            />
          </Route>

          <Route path="/auth/action" element={<AuthAction />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  );
}
