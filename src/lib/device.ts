export function detectMobileOS() {
  const ua = navigator.userAgent || "";
  // CORRECTION : Cast 'navigator' en 'any'
  const platform =
    (navigator as any).userAgentData?.platform || navigator.platform || "";

  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    /iOS/i.test(platform) ||
    (platform === "MacIntel" &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "other";
}
