import { User } from "firebase/auth";
import { Firestore } from "firebase/firestore";

// Ajout de l'interface Product (c'est un CartItem sans la quantité)
export interface Product {
  id: string;
  name: string;
  price_cents: number;
  category: string;
  image?: string;
  is_available?: boolean;
  description?: string;
}

// CartItem étend Product en ajoutant la quantité
export interface CartItem extends Product {
  qty: number;
}

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
  created_at: any; // On garde 'any' pour le timestamp Firestore pour l'instant
  payment_method?: string;
  points_earned?: number;
  paid_at?: any;
  served_at?: any;
}

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
  db: Firestore;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product | CartItem) => void; // Accepte les deux
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  createOrder: (
    onSuccess: (id: string) => void,
    onError?: (msg: string) => void
  ) => Promise<void>;
  totalItems: number;
  setCart: (cart: CartItem[]) => void;
}
