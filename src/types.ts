export interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  qty: number;
  category: string;
  image?: string;
  is_available?: boolean;
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
    | "expired";
  items: CartItem[];
  created_at: any; // Firebase Timestamp
  payment_method?:
    | "apple_pay"
    | "google_pay"
    | "paypal_balance"
    | "cash"
    | "loyalty";
  points_earned?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  points: number;
  balance_cents: number;
  favorites?: string[];
  points_history?: Record<string, number>; // Ex: { "2023-10": 120 }
}
