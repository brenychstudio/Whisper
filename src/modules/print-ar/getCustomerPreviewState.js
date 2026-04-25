export function getCustomerPreviewState({
  mobileBridge,
  runtimeStatus,
  selectedFrameLabel,
} = {}) {
  const androidReady = Boolean(mobileBridge?.android?.canLaunchAttached);
  const iosReady = Boolean(mobileBridge?.ios?.canLaunchAttached);
  const platform = mobileBridge?.platform || "desktop";

  let primaryAction = "none";
  let secondaryAction = "none";
  let previewStatus = "unavailable";
  let customerMessage = selectedFrameLabel
    ? `Preview unavailable for ${selectedFrameLabel.toLowerCase()} right now.`
    : "Preview unavailable right now.";

  if (androidReady) {
    primaryAction = "android";
    secondaryAction = iosReady ? "ios" : "none";
    previewStatus = "ready";
    customerMessage =
      platform === "android"
        ? "Preview ready."
        : "Preview ready for Android.";
  } else if (iosReady) {
    primaryAction = "ios";
    previewStatus = "partial";
    customerMessage =
      platform === "ios"
        ? "Preview ready."
        : "Preview available on iPhone/iPad.";
  }

  if (runtimeStatus === "loading" && previewStatus === "unavailable") {
    customerMessage = "Checking preview availability...";
  }

  return {
    hasPreview: androidReady || iosReady,
    androidReady,
    iosReady,
    primaryAction,
    secondaryAction,
    previewStatus,
    customerMessage,
  };
}
