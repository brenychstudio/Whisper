import { launchAndroidAr } from "../../../modules/print-ar/android/launchAndroidAr.js";

function toAbsoluteUrl(value) {
  if (!value) return null;
  return new URL(value, window.location.origin).toString();
}

function launchIOSQuickLook(url) {
  const absoluteUrl = toAbsoluteUrl(url);
  if (!absoluteUrl) return false;

  const link = document.createElement("a");
  link.setAttribute("rel", "ar");
  link.setAttribute("href", absoluteUrl);
  link.style.display = "none";

  const img = document.createElement("img");
  img.setAttribute("alt", "AR Quick Look");
  link.appendChild(img);

  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
  }, 0);

  return true;
}

export function launchMobileARBridge(bridge, payload, options = {}) {
  if (!bridge?.launchUrl || !bridge?.canAttemptLaunch) return false;

  if (bridge.platform === "ios") {
    return launchIOSQuickLook(bridge.launchUrl);
  }

  if (bridge.platform === "android") {
    return launchAndroidAr(bridge.launchUrl, payload?.title, options);
  }

  return false;
}
