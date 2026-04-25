import { resolveHostedArAssetHealth } from "../../../integrations/print-ar-preview/resolveHostedArAssetHealth.js";
import { resolveAndroidBridge } from "../../../modules/print-ar/android/resolveAndroidBridge.js";
import { getIosQuickLookPolicy } from "./getIosQuickLookPolicy.js";

function detectMobileARPlatform() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const isIPadOS =
    /Macintosh/i.test(ua) &&
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/i.test(ua) || isIPadOS) {
    return "ios";
  }

  if (/Android/i.test(ua)) {
    return "android";
  }

  return "desktop";
}

function resolveCurrentPlatformBridge(platform, androidBridge, iosBridge, planned) {
  if (platform === "android") {
    return androidBridge;
  }

  if (platform === "ios") {
    return iosBridge;
  }

  return {
    platform: "desktop",
    platformLabel: "Desktop",
    mode: "generated-preview",
    canLaunchAttached: false,
    canAttemptLaunch: false,
    launchUrl: null,
    expectedPath:
      planned.quickLookUsdzPath ||
      planned.sceneViewerGlbPath ||
      planned.webGlbPath ||
      null,
    readiness: "desktop",
    message: "Open this page on iPhone/iPad or Android to test the mobile AR launch path.",
  };
}

export function resolveMobileARBridge(payload, options = {}) {
  const platform = detectMobileARPlatform();
  const attached = payload?.bridgeAssets?.attached ?? {};
  const planned = payload?.bridgeAssets?.planned ?? {};
  const manifestRecord = payload?.bridgeAssets?.manifestRecord ?? null;
  const androidValidation = options.hostedValidation || options.androidValidation || null;
  const iosValidation = options.iosValidation || null;

  const health = resolveHostedArAssetHealth(payload?.assetKey || "", {
    record: manifestRecord,
    androidValidation,
    iosValidation,
  });

  const androidBridge = resolveAndroidBridge(payload, {
    health,
    isCurrentPlatform: platform === "android",
  });

  const iosPolicy = getIosQuickLookPolicy({ health });
  const iosBridge = {
    platform: "ios",
    platformLabel: "iPhone / iPad",
    mode: "quick-look",
    canLaunchAttached: health.iosLaunchReady,
    canAttemptLaunch: health.iosLaunchReady,
    launchUrl: health.iosLaunchReady ? health.iosSrc : null,
    expectedPath: planned.quickLookUsdzPath || null,
    readiness: iosPolicy.state,
    message: iosPolicy.message,
    policy: iosPolicy,
    quickLookMode: iosPolicy.quickLookMode,
    health,
  };

  const currentBridge = resolveCurrentPlatformBridge(
    platform,
    androidBridge,
    iosBridge,
    planned,
  );

  return {
    ...currentBridge,
    platform,
    android: androidBridge,
    ios: iosBridge,
    androidHealth: health,
    iosHealth: health,
  };
}
