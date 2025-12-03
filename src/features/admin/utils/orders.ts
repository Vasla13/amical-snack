export function groupItems(items) {
  const map = new Map();
  (items || []).forEach((it) => {
    const key = it.id || it.product_id || it.name || Math.random().toString(36);
    const prev = map.get(key);
    if (prev) map.set(key, { ...prev, qty: (prev.qty || 0) + (it.qty || 0) });
    else map.set(key, { ...it, qty: it.qty || 0 });
  });
  const arr = Array.from(map.values());
  arr.sort(
    (a, b) =>
      (b.qty || 0) - (a.qty || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""))
  );
  return arr;
}

export function methodLabel(method) {
  const m = String(method || "");
  if (m === "apple_pay") return "APPLE PAY";
  if (m === "google_pay") return "ANDROID / GOOGLE PAY";
  if (m === "paypal_balance") return "PAYPAL (SOLDE)";
  if (m === "cash") return "ESPÈCES";
  return "";
}

export function getCreatedMs(o) {
  const ts = o?.created_at;
  return ts && typeof ts.toMillis === "function" ? ts.toMillis() : null;
}

export function isExpirableStatus(status) {
  return status === "created" || status === "scanned" || status === "cash";
}

export function isExpired(order, ttlMs) {
  if (!isExpirableStatus(order.status)) return false;
  const createdMs = getCreatedMs(order);
  if (!createdMs) return false;
  return Date.now() - createdMs > ttlMs;
}
