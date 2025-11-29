import React, { useMemo, useState } from "react";
import {
  Apple,
  Smartphone,
  Wallet,
  Banknote,
  CheckCircle2,
  Hourglass,
  X,
  Copy,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { formatPrice } from "../../lib/format.js";

function detectMobileOS() {
  const ua = navigator.userAgent || "";
  const platform =
    navigator.userAgentData?.platform || navigator.platform || "";

  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    /iOS/i.test(platform) ||
    (platform === "MacIntel" &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1);

  return { isIOS, isAndroid };
}

export default function OrderFlow({
  order,
  user,
  onPay,
  onRequestCash,
  onClose,
}) {
  const [loading, setLoading] = useState(false);

  const totalCents = Number(order?.total_cents || 0);
  const balance = Number(user?.balance_cents || 0);

  const { isIOS, isAndroid } = useMemo(detectMobileOS, []);

  // ✅ Sur iPhone/iPad: seulement Apple Pay
  // ✅ Sur Android: seulement Android/Google Pay
  // ✅ Sur autre (PC): afficher les 2 (pratique pour tester)
  const showApplePay = isIOS || (!isIOS && !isAndroid);
  const showGooglePay = isAndroid || (!isIOS && !isAndroid);

  const itemsSummary = useMemo(() => {
    const list = order?.items || [];
    const map = new Map();
    for (const it of list) {
      const key = it.id || it.name;
      const prev = map.get(key);
      if (prev) map.set(key, { ...prev, qty: (prev.qty || 0) + (it.qty || 0) });
      else map.set(key, { ...it });
    }
    return Array.from(map.values()).sort((a, b) => (b.qty || 0) - (a.qty || 0));
  }, [order?.items]);

  const qrValue = useMemo(() => {
    // ✅ On encode une URL, l’admin récupère le token (dernier segment)
    // marche aussi si tu changes de domaine
    const origin = window.location.origin;
    return `${origin}/c/${order?.qr_token || ""}`;
  }, [order?.qr_token]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(order?.qr_token || ""));
    } catch {
      // fallback
      const t = document.createElement("textarea");
      t.value = String(order?.qr_token || "");
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
  };

  const pay = async (method) => {
    if (!order) return;
    try {
      setLoading(true);
      await onPay(method);
    } finally {
      setLoading(false);
    }
  };

  const cash = async () => {
    if (!order) return;
    try {
      setLoading(true);
      await onRequestCash();
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const status = order.status;

  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-gray-400">
              Commande
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div className="font-black text-3xl tracking-widest font-mono text-gray-900">
                #{order.qr_token}
              </div>
              <button
                onClick={copyCode}
                disabled={loading}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700"
                aria-label="Copier le code"
                title="Copier"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="mt-1 text-sm text-gray-600 font-bold">
              Total :{" "}
              <span className="text-teal-700">{formatPrice(totalCents)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"
            aria-label="Fermer"
            disabled={loading}
          >
            <X />
          </button>
        </div>

        {/* ✅ QR CODE affiché */}
        <div className="p-4 border-b border-gray-100">
          <div className="text-xs font-black uppercase text-gray-400 mb-2">
            QR Code
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center">
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <QRCodeCanvas value={qrValue} size={210} includeMargin />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Montre ce QR au vendeur (il le scanne) ou donne le code :{" "}
            <b>{order.qr_token}</b>
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs font-black uppercase text-gray-400 mb-2">
            Résumé
          </div>
          <div className="space-y-2">
            {itemsSummary.map((it, idx) => (
              <div
                key={(it.id || it.name) + "-" + idx}
                className="flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 truncate">
                    {it.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPrice(it.price_cents || 0)} / unité
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {it.qty}
                </div>
              </div>
            ))}
          </div>

          {status === "created" && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 font-black text-gray-800">
                <Hourglass size={18} /> Attente du vendeur…
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Le vendeur doit scanner ton QR ou taper ton code.
              </div>
            </div>
          )}

          {status === "scanned" && (
            <div className="mt-4">
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                <div className="font-black text-teal-800">Paiement</div>
                <div className="text-sm text-teal-700 mt-1">
                  Choisis ton moyen de paiement (simulation).
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {showApplePay && (
                  <button
                    disabled={loading}
                    onClick={() => pay("apple_pay")}
                    className="bg-gray-900 text-white rounded-2xl p-4 font-black flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
                  >
                    <Apple /> Apple Pay
                  </button>
                )}

                {showGooglePay && (
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
                {balance < totalCents
                  ? "— (insuffisant pour cette commande)"
                  : ""}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Si tu choisis <b>Espèces</b>, le vendeur sera notifié.
              </div>
            </div>
          )}

          {status === "cash" && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="font-black text-yellow-800 flex items-center gap-2">
                <Banknote size={18} /> Paiement en espèces demandé
              </div>
              <div className="text-sm text-yellow-800 mt-1">
                Va voir le vendeur : il a été notifié. Il confirmera le paiement
                ensuite.
              </div>
            </div>
          )}

          {status === "paid" && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="font-black text-green-800 flex items-center gap-2">
                <CheckCircle2 size={18} /> Paiement accepté
              </div>

              <div className="text-sm text-green-800 mt-1">
                Le vendeur peut maintenant te donner les produits.
              </div>

              <div className="mt-2 text-xs text-gray-600">
                Moyen :{" "}
                <span className="font-black">
                  {order.payment_method === "apple_pay" && "Apple Pay"}
                  {order.payment_method === "google_pay" &&
                    "Android/Google Pay"}
                  {order.payment_method === "paypal_balance" &&
                    "PayPal (solde)"}
                  {order.payment_method === "cash" && "Espèces"}
                  {!order.payment_method && "—"}
                </span>
              </div>
            </div>
          )}

          {status === "served" && (
            <div className="mt-4 bg-gray-900 text-white rounded-2xl p-4">
              <div className="font-black flex items-center gap-2">
                <CheckCircle2 size={18} /> Commande terminée
              </div>
              <div className="text-sm text-gray-200 mt-1">Merci 👌</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
