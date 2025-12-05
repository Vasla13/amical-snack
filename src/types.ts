import { User } from "firebase/auth";
import { Firestore, Timestamp } from "firebase/firestore";

// Interface de base pour un produit
export interface Product {
  id: string;
  name: string;
  price_cents: number;
  category: string;
  image?: string;
  is_available?: boolean;
  description?: string;
  // Ajout possible de probability pour la roulette
  probability?: number;
}

// CartItem étend Product en ajoutant la quantité
export interface CartItem extends Product {
  qty: number;
  source?: string; // Ex: "Roulette", "Boutique"
}

// Interface stricte pour une Commande (Order)
export interface Order {
  id: string;
  user_id: string;
  qr_token: string;
  total_cents: number;
  status:
    | "created"
    | "scanned"
    | "paid"
    | "served"
    | "reward_pending"
    | "expired"
    | "cash";
  items: CartItem[];
  // Typage précis des timestamps Firestore
  created_at: Timestamp;
  payment_method?: string;
  points_earned?: number;
  paid_at?: Timestamp;
  served_at?: Timestamp;
  cash_requested_at?: Timestamp;
  source?: string;
}

// Interface pour le profil utilisateur
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  points: number;
  balance_cents: number;
  favorites?: string[];
  points_history?: Record<string, number>;
  setup_complete?: boolean;
  fcmToken?: string;
  bad_luck_count?: number;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  db: Firestore; // Typage strict de l'instance Firestore
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product | CartItem) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  createOrder: (
    onSuccess: (id: string) => void,
    onError?: (msg: string) => void
  ) => Promise<void>;
  totalItems: number;
  setCart: (cart: CartItem[]) => void;
}
