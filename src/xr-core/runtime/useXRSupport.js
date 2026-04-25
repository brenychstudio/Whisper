// src/xr-core/runtime/useXRSupport.js
export async function isImmersiveVRSupported() {
  try {
    const xr = typeof navigator !== "undefined" ? navigator.xr : null;
    if (!xr || !xr.isSessionSupported) return false;
    return await xr.isSessionSupported("immersive-vr");
  } catch {
    return false;
  }
}

export function isLikelyMobileViewport() {
  if (typeof window === "undefined") return false;

  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 980px)")?.matches ?? false;
  return coarse || narrow;
}

export function canUseDeviceOrientation() {
  if (typeof window === "undefined") return false;
  return "DeviceOrientationEvent" in window;
}

export function requiresDeviceOrientationPermission() {
  if (typeof window === "undefined") return false;
  return typeof window.DeviceOrientationEvent?.requestPermission === "function";
}

export function isLikelyHeadsetXRBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /OculusBrowser|Quest/i.test(ua);
}
