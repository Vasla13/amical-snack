import React, { useMemo, useState } from "react";
import { Apple, Smartphone, Wallet, Banknote } from "lucide-react";
import { detectMobileOS } from "../../../lib/device.js";
import { formatPrice } from "../../../lib/format.js";

export default function PaymentMethods({ order, user, onPay, onRequestCash }) {
  const [loading, setLoading] = useState(false);

  const os = useMemo(() => detectMobileOS(), []);
  const totalCents = Number(order?.total_cents || 0);
  const balance = Number(user?.balance_cents || 0);

  // iOS => Apple Pay, Android => Google Pay, desktop => les 2 (pratique tests)
  const showApple = os === "ios" || os === "other";
  const showGoogle = os === "android" || os === "other";

  const pay = async (method) => {
    try {
      setLoading(true);
      await onPay(method);
    } finally {
      setLoading(false);
    }
  };

  const cash = async () => {
    try {
      setLoading(true);
      await onRequestCash();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
        <div className="font-black text-teal-800">Paiement</div>
        <div className="text-sm text-teal-700 mt-1">
          Choisis ton moyen (démo).
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {showApple && (
          <button
            disabled={loading}
            onClick={() => pay("apple_pay")}
            className="bg-gray-900 text-white rounded-2xl p-4 font-black flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
          >
            <Apple /> Apple Pay
          </button>
        )}

        {showGoogle && (
          <button
            disabled={loading}
            onClick={() => pay("google_pay")}
            className="bg-gray-900 text-white rounded-2xl p-4 font-black flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
          >
            <Smartphone /> Android Pay
          </button>
        )}

        <button
          disabled={loading || balance < totalCents}
          onClick={() => pay("paypal_balance")}
          className={`rounded-2xl p-4 font-black flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60 ${
            balance >= totalCents
              ? "bg-teal-700 text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          <Wallet /> PayPal (solde)
        </button>

        <button
          disabled={loading}
          onClick={cash}
          className="bg-yellow-400 text-black rounded-2xl p-4 font-black flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
        >
          <Banknote /> Espèces
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Solde PayPal :{" "}
        <span className="font-black">{formatPrice(balance)}</span>{" "}
        {balance < totalCents ? "— (insuffisant)" : ""}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Si tu choisis <b>Espèces</b>, le vendeur est notifié.
      </div>
    </div>
  );
}
