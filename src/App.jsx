import React, { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  ShoppingBag,
  CreditCard,
  QrCode,
  User,
  Plus,
  Minus,
  RefreshCw,
  Camera,
  CheckCircle,
  Trash2,
  LogOut,
  Search,
  X,
  AlertCircle,
  Smartphone,
  ArrowRight,
} from "lucide-react";

// --- 1. CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAsGOggoYSR51WNcz7_DyTVDH6n-RkSZKA",
  authDomain: "amical-rt.firebaseapp.com",
  projectId: "amical-rt",
  storageBucket: "amical-rt.firebasestorage.app",
  messagingSenderId: "556333156656",
  appId: "1:556333156656:web:ba398c100f65ba34b760f5",
  measurementId: "G-YGEYFCRHPY",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. DONNÉES & UTILITAIRES ---
const ADMIN_EMAILS = ["admin@uha.fr", "vendeur@uha.fr", "presi@uha.fr"];
const formatPrice = (c) => (c / 100).toFixed(2) + "€";
const generateToken = () =>
  Math.random().toString(36).substring(2, 6).toUpperCase();

// BASE DE DONNÉES AVEC IMAGES LOCALES
// Les images doivent être dans le dossier public/produits/
const SEED_PRODUCTS = [
  // SNACKS
  {
    name: "Lay's Barbecue",
    price_cents: 160,
    category: "Snacks",
    image: "public/produits/",
  },
  {
    name: "Lay's Nature",
    price_cents: 150,
    category: "Snacks",
    image: "/produits/lays-nature.png",
  },
  {
    name: "Monster Munch",
    price_cents: 130,
    category: "Snacks",
    image: "/produits/monster-munch.png",
  },
  {
    name: "Monster Munch Jambon",
    price_cents: 130,
    category: "Snacks",
    image: "/produits/monster-munch-jambon.png",
  },
  {
    name: "Kinder Bueno",
    price_cents: 100,
    category: "Snacks",
    image: "/produits/kinder-bueno.png",
  },
  {
    name: "KitKat",
    price_cents: 100,
    category: "Snacks",
    image: "/produits/kitkat.png",
  },
  {
    name: "Twix",
    price_cents: 100,
    category: "Snacks",
    image: "/produits/twix.png",
  },
  {
    name: "Mars",
    price_cents: 100,
    category: "Snacks",
    image: "/produits/mars.png",
  },
  {
    name: "Croissant",
    price_cents: 90,
    category: "Snacks",
    image: "/produits/croissant.png",
  },

  // BOISSONS
  {
    name: "Red Bull",
    price_cents: 150,
    category: "Boissons",
    image: "/produits/red-bull.png",
  },
  {
    name: "Red Bull White",
    price_cents: 150,
    category: "Boissons",
    image: "/produits/red-bull-white.png",
  },
  {
    name: "Coca-Cola",
    price_cents: 100,
    category: "Boissons",
    image: "/produits/coca.png",
  },
  {
    name: "Coca Zéro",
    price_cents: 100,
    category: "Boissons",
    image: "/produits/coca-zero.png",
  },
  {
    name: "Oasis Tropical",
    price_cents: 100,
    category: "Boissons",
    image: "/produits/oasis.png",
  },
  {
    name: "Ice Tea Pêche",
    price_cents: 100,
    category: "Boissons",
    image: "/produits/ice-tea.png",
  },
  {
    name: "Capri-Sun",
    price_cents: 100,
    category: "Boissons",
    image: "/produits/capri-sun.png",
  },
  {
    name: "Café Long",
    price_cents: 50,
    category: "Café",
    image: "/produits/cafe.png",
  },
];

// --- 3. COMPOSANTS UI ---
const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) => {
  const styles = {
    primary:
      "bg-teal-700 text-white shadow-md active:scale-95 hover:bg-teal-800",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50",
    success: "bg-green-600 text-white shadow-md hover:bg-green-700",
    danger: "bg-red-600 text-white shadow-md hover:bg-red-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- 4. LOGIQUE PRINCIPALE ---
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

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (s) => {
      if (s.exists()) {
        setUserData(s.data());
        setView(s.data().role === "admin" ? "admin" : "app");
      } else setView("login");
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "products"), (s) => {
      const p = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(p);
    });
  }, [user]);

  // Écouteur commande active (Temps réel)
  useEffect(() => {
    if (!currentOrder?.id) return;
    const unsub = onSnapshot(doc(db, "orders", currentOrder.id), (doc) => {
      if (doc.exists()) setCurrentOrder({ id: doc.id, ...doc.data() });
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

  const createOrder = async () => {
    if (!cart.length) return;
    const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);
    const orderData = {
      user_id: user.uid,
      items: cart,
      total_cents: total,
      status: "created", // 1. CRÉÉ -> QR affiché, PAS de paiement possible
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

  if (view === "loading")
    return (
      <div className="h-screen flex items-center justify-center text-teal-700 font-bold">
        <RefreshCw className="animate-spin mr-2" /> Chargement...
      </div>
    );
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
              AMICALE R&T
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
        {tab === "profile" && (
          <Profile user={userData} logout={() => window.location.reload()} />
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

// --- 5. COMPOSANTS CLIENT ---

const OrderFlow = ({ order, onPay, onClose }) => {
  if (!order) return <div className="p-10 text-center">Aucune commande.</div>;

  // ETAPE 1 : ATTENTE SCAN (Client bloqué ici tant que l'admin ne scanne pas)
  if (order.status === "created") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-teal-800 text-white p-6 text-center animate-in fade-in">
        <h2 className="text-2xl font-black mb-2">SCANNEZ CE CODE</h2>
        <p className="text-teal-200 mb-8 text-sm">
          Présentez votre écran au vendeur pour payer.
        </p>
        <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8 transform scale-110">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${order.qr_token}&color=0f766e`}
            alt="QR"
            className="w-56 h-56"
          />
        </div>
        <p className="font-mono text-4xl font-black tracking-widest">
          {order.qr_token}
        </p>
        <div className="mt-8 flex items-center gap-2 text-teal-300 animate-pulse">
          <RefreshCw size={16} className="animate-spin" /> En attente du
          vendeur...
        </div>
      </div>
    );
  }

  // ETAPE 2 : PAIEMENT (L'admin a scanné -> le bouton de paiement apparaît)
  if (order.status === "scanned") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center animate-in slide-in-from-bottom">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-bounce">
          <CheckCircle size={50} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">
          Code Validé !
        </h2>
        <p className="text-gray-500 mb-8">
          Le vendeur a confirmé. Vous pouvez régler.
        </p>
        <div className="w-full bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
          <p className="text-gray-400 text-sm uppercase font-bold mb-1">
            Total à régler
          </p>
          <p className="text-6xl font-black text-teal-700">
            {formatPrice(order.total_cents)}
          </p>
        </div>
        <Button
          onClick={onPay}
          variant="primary"
          className="w-full bg-black text-white h-16 text-lg shadow-xl gap-3"
        >
          <Smartphone size={24} /> Payer avec Apple Pay
        </Button>
      </div>
    );
  }

  // ETAPE 3 : FINI (Paiement effectué)
  if (order.status === "paid" || order.status === "served") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-green-500 text-white p-6 text-center animate-in zoom-in">
        <CheckCircle size={80} className="mb-6 text-white" />
        <h2 className="text-3xl font-black mb-2">PAIEMENT REÇU !</h2>
        <p className="text-green-100 text-lg mb-8">
          Vous pouvez récupérer vos produits.
        </p>
        <Button
          onClick={onClose}
          className="bg-white text-green-600 w-full font-bold"
        >
          TERMINER
        </Button>
      </div>
    );
  }
};

const Catalog = ({ products, cart, setCart }) => {
  const [search, setSearch] = useState("");
  const add = (p) =>
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      return ex
        ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...p, qty: 1 }];
    });
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <input
        className="w-full p-3 bg-white rounded-xl shadow-sm border border-gray-100 mb-6 outline-none"
        placeholder="Chercher un snack..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((p) => {
          const qty = cart.find((i) => i.id === p.id)?.qty || 0;
          return (
            <div
              key={p.id}
              className={`bg-white p-2 rounded-2xl shadow-sm border ${
                qty ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-100"
              } flex flex-col h-full`}
            >
              <div className="h-32 w-full bg-white rounded-xl mb-2 flex items-center justify-center p-2 relative overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-contain hover:scale-110 transition-transform duration-300 mix-blend-multiply"
                  onError={(e) => {
                    // Si l'image locale n'existe pas, on met une image vide propre
                    e.target.src =
                      "https://placehold.co/200x200/f3f4f6/a3a3a3?text=NO+IMAGE";
                  }}
                />
              </div>
              <div className="mt-auto">
                <h3 className="font-bold text-xs leading-tight line-clamp-2 mb-1">
                  {p.name}
                </h3>
                <div className="flex justify-between items-center">
                  <p className="text-teal-700 font-black">
                    {formatPrice(p.price_cents)}
                  </p>
                  <button
                    onClick={() => add(p)}
                    className="bg-gray-900 text-white w-7 h-7 rounded-full flex items-center justify-center active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
              {qty > 0 && (
                <div className="absolute top-2 left-2 bg-teal-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                  {qty}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Cart = ({ cart, setCart, onValidate }) => {
  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0);
  if (!cart.length)
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <ShoppingBag size={48} />
        <p className="mt-4 font-medium">Panier vide</p>
      </div>
    );
  return (
    <div className="p-4 flex flex-col h-full bg-gray-50">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ShoppingBag size={20} /> Ma Commande
      </h2>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {cart.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100"
          >
            <div>
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-teal-600 text-xs font-bold">
                {formatPrice(p.price_cents)}
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() =>
                  setCart((prev) =>
                    prev
                      .map((i) =>
                        i.id === p.id ? { ...i, qty: i.qty - 1 } : i
                      )
                      .filter((i) => i.qty > 0)
                  )
                }
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-600"
              >
                -
              </button>
              <span className="font-bold text-sm w-4 text-center">{p.qty}</span>
              <button
                onClick={() =>
                  setCart((prev) =>
                    prev.map((i) =>
                      i.id === p.id ? { ...i, qty: i.qty + 1 } : i
                    )
                  )
                }
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-600"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-t-3xl shadow-xl -mx-4">
        <div className="flex justify-between text-2xl font-black mb-6">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <Button onClick={onValidate} className="w-full text-lg shadow-teal-200">
          VALIDER LE PANIER
        </Button>
      </div>
    </div>
  );
};

const Profile = ({ user, logout }) => (
  <div className="p-4">
    <div className="bg-teal-700 text-white p-8 rounded-3xl shadow-lg mb-6 relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-5xl font-black text-yellow-400">
          {user?.points || 0}
        </h2>
        <p className="font-bold text-teal-200">POINTS FIDÉLITÉ</p>
      </div>
      <User className="absolute -bottom-4 -right-4 text-teal-600 w-32 h-32" />
    </div>
    <div className="bg-white p-4 rounded-2xl shadow-sm mb-2">
      <p className="text-gray-500 text-xs uppercase font-bold">Compte</p>
      <p className="font-bold text-lg">{user?.displayName}</p>
      <p className="text-teal-600">{user?.email}</p>
    </div>
    <button
      onClick={logout}
      className="mt-8 w-full p-4 text-red-500 font-bold bg-red-50 rounded-xl flex items-center justify-center gap-2"
    >
      <LogOut size={20} /> DÉCONNEXION
    </button>
  </div>
);

// --- 6. ADMIN DASHBOARD ---

const AdminDashboard = ({ db, products }) => {
  const [orders, setOrders] = useState([]);
  const [scanInput, setScanInput] = useState("");

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "orders"), orderBy("created_at", "desc")),
        (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const handleScan = async () => {
    const token = scanInput.trim().toUpperCase();
    const order = orders.find(
      (o) => o.qr_token === token && o.status === "created"
    );
    if (!order) return alert("Code invalide ou déjà scanné !");
    await updateDoc(doc(db, "orders", order.id), { status: "scanned" });
    setScanInput("");
    alert("Code validé ! Le client peut payer.");
  };

  const handleServe = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), { status: "served" });
  };

  const seed = async () => {
    if (
      !confirm(
        "⚠️ ATTENTION: SUPPRIMER TOUT LE STOCK ET RÉINITIALISER AVEC LES IMAGES LOCALES ?"
      )
    )
      return;
    const snap = await getDocs(collection(db, "products"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref))); // Vide tout

    // Recrée propre
    for (const item of SEED_PRODUCTS) {
      await addDoc(collection(db, "products"), {
        ...item,
        is_available: true,
        sort_order: 1,
      });
    }
    alert(
      "✅ Stock réinitialisé ! N'oublie pas de mettre les images dans public/produits/"
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-black text-2xl text-gray-800">ADMIN R&T</h1>
        <button
          onClick={seed}
          className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold shadow-md hover:bg-red-700"
        >
          🗑️ SUPPRIMER & RÉINITIALISER STOCK
        </button>
      </div>

      {/* ZONE DE SCAN */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border-2 border-teal-600">
        <h2 className="font-bold text-teal-800 mb-4 flex items-center gap-2 text-lg">
          <Camera className="text-teal-600" /> 1. SCANNER CODE CLIENT
        </h2>
        <div className="flex gap-3">
          <input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value.toUpperCase())}
            placeholder="CODE (ex: X9Y2)"
            className="flex-1 p-4 border-2 border-gray-200 rounded-xl font-mono text-center text-xl tracking-widest outline-none focus:border-teal-500 uppercase"
          />
          <button
            onClick={handleScan}
            className="bg-teal-700 hover:bg-teal-800 text-white px-6 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
          >
            VALIDER
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <div>
          <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">
            Flux Commandes
          </h3>
          <div className="space-y-3">
            {orders
              .filter((o) => o.status !== "served")
              .map((o) => (
                <div
                  key={o.id}
                  className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex justify-between items-center ${
                    o.status === "paid"
                      ? "border-green-500 ring-2 ring-green-500"
                      : "border-gray-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xl text-gray-800">
                        #{o.qr_token}
                      </span>
                      {o.status === "created" && (
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          À Scanner
                        </span>
                      )}
                      {o.status === "scanned" && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
                          En paiement...
                        </span>
                      )}
                      {o.status === "paid" && (
                        <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
                          💰 PAYÉ !
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {o.items.length} articles • {formatPrice(o.total_cents)}
                    </p>
                  </div>
                  {o.status === "paid" && (
                    <button
                      onClick={() => handleServe(o.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md animate-bounce"
                    >
                      DONNER PRODUITS
                    </button>
                  )}
                  {o.status === "scanned" && (
                    <span className="text-xs text-blue-500 italic animate-pulse">
                      Attente paiement...
                    </span>
                  )}
                </div>
              ))}
            {orders.filter((o) => o.status !== "served").length === 0 && (
              <p className="text-center text-gray-400 italic py-4">
                Aucune commande active
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ icon: I, active, onClick, label, badge, highlight }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center w-16 relative ${
      active ? "text-teal-700" : "text-gray-400"
    }`}
  >
    <div
      className={`relative p-1 rounded-xl transition-all ${
        highlight ? "bg-red-100 text-red-600 animate-pulse" : ""
      }`}
    >
      <I size={24} strokeWidth={active ? 3 : 2} />
      {badge > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">
          {badge}
        </div>
      )}
    </div>
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);

const LoginScreen = ({ onLogin }) => {
  const [email, setE] = useState("");
  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-24 h-24 bg-teal-700 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-xl">
        RT
      </div>
      <h1 className="text-2xl font-black text-teal-800 mb-8 tracking-tight">
        AMICALE CONNECT
      </h1>
      <input
        className="w-full p-4 bg-gray-50 rounded-xl mb-4 border focus:border-teal-500 outline-none transition-all"
        placeholder="votre.nom@uha.fr"
        value={email}
        onChange={(e) => setE(e.target.value)}
      />
      <Button
        onClick={() => onLogin(email)}
        className="w-full text-lg shadow-teal-200"
      >
        CONNEXION
      </Button>
      <div className="mt-8 text-xs text-gray-400 text-center bg-gray-50 p-4 rounded-xl w-full">
        <p className="font-bold mb-1">COMPTES DÉMO :</p>
        <p>Admin : admin@uha.fr</p>
        <p>Étudiant : etudiant@uha.fr</p>
      </div>
    </div>
  );
};
