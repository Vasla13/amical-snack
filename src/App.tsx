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

import { auth, db } from "./config/firebase";
import { useAuth } from "./context/AuthContext";
// CORRECTION : Suppression de ADMIN_EMAIL
// import { ADMIN_EMAIL } from "./config/constants";

import LoginScreen from "./features/auth/LoginScreen";
import AuthAction from "./features/auth/AuthAction";
import MainLayout from "./features/layout/MainLayout";

const Catalog = lazy(() => import("./features/catalog/Catalog"));
const Cart = lazy(() => import("./features/cart/Cart"));
const PassScreen = lazy(() => import("./features/order/PassScreen"));
const LoyaltyScreen = lazy(() => import("./features/loyalty/LoyaltyScreen"));
const Profile = lazy(() => import("./features/profile/Profile"));
const AdminDashboard = lazy(() => import("./features/admin/AdminDashboard"));
const KitchenDisplay = lazy(() => import("./features/admin/KitchenDisplay"));

import Toast from "./ui/Toast";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

const Loading = () => (
  <div className="h-full flex items-center justify-center p-10">
    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, userData, isAdmin } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (userData === null && !isAdmin)
    return (
      <div className="h-screen flex items-center justify-center">
        Chargement...
      </div>
    );

  if (userData && userData.setup_complete === false)
    return <Navigate to="/setup" />;

  if (userData && userData.role === "admin") return <Navigate to="/admin" />;

  return <>{children}</>;
};

import { useProducts } from "./hooks/useProducts";
import SetupScreen from "./features/auth/SetupScreen";

// ... (existing imports)

// ... (existing component code)

export default function App() {
  const { user, userData, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { products } = useProducts();

  const [isFinishingLogin, setIsFinishingLogin] = useState(false);
  const [emailForLink, setEmailForLink] = useState("");
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const loginAttempted = useRef(false);

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      if (loginAttempted.current) return;
      loginAttempted.current = true;
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        setNeedsEmailConfirm(true);
      }
      else {
        completeSignIn(email);
      }
    }
  }, []);

  const completeSignIn = async (email: string) => {
    try {
      setIsFinishingLogin(true);
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      alert("Connexion réussie !"); // Using alert as fallback
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Lien invalide ou expiré."); // Using alert as fallback
      navigate("/login");
    } finally {
      setIsFinishingLogin(false);
      setNeedsEmailConfirm(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
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
              <SetupScreen />
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
                <Cart />
              </Suspense>
            }
          />
          <Route
            path="pass"
            element={
              <Suspense fallback={<Loading />}>
                <PassScreen />
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
                  uid={user?.uid || ""}
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
  );
}
