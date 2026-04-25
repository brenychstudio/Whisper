function toAbsoluteUrl(value) {
  if (!value) return null;
  return new URL(value, window.location.origin).toString();
}

export function buildSceneViewerIntent(url, title, options = {}) {
  const absoluteUrl = toAbsoluteUrl(url);
  if (!absoluteUrl) return null;

  const params = new URLSearchParams();
  params.set("file", absoluteUrl);
  params.set("mode", "ar_preferred");

  if (title) {
    params.set("title", String(title).slice(0, 60));
  }

  params.set("resizable", options.resizable === false ? "false" : "true");
  params.set(
    "enable_vertical_placement",
    options.enableVerticalPlacement === false ? "false" : "true",
  );

  const browserFallback = encodeURIComponent(window.location.href);

  return `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${browserFallback};end;`;
}

export function launchAndroidAr(url, title, options) {
  const intentUrl = buildSceneViewerIntent(url, title, options);
  if (!intentUrl) return false;

  window.location.href = intentUrl;
  return true;
}
