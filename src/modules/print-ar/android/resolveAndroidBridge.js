function resolveAndroidReadiness(health) {
  if (health.androidLaunchReady) {
    return health.tooHeavy ? "ready-warning" : "ready";
  }

  if (!health.manifestDeclared || health.manifestStatus === "missing") {
    return "missing-asset";
  }

  if (health.manifestStatus === "disabled" || !health.androidEnabled) {
    return "disabled";
  }

  if (health.manifestStatus !== "ready" || !health.fileDeclared) {
    return "needs-attach";
  }

  if (health.validationStatus === "invalid") {
    return "invalid";
  }

  if (health.reachable === false) {
    return "unreachable";
  }

  return "checking";
}

function resolveAndroidMessage(health, readiness) {
  if (readiness === "ready") {
    return "Hosted GLB is attached, reachable, and ready for Android wall preview.";
  }

  if (readiness === "ready-warning") {
    return "Hosted GLB is ready for Android, but it is heavier than ideal and may need a lighter export.";
  }

  if (readiness === "disabled") {
    return "Android preview is disabled in the hosted manifest for this exact variant.";
  }

  if (readiness === "unreachable") {
    return "Manifest entry exists, but the hosted GLB could not be reached.";
  }

  if (readiness === "invalid") {
    return "Hosted GLB response looks invalid for Scene Viewer.";
  }

  if (readiness === "missing-asset") {
    return "No hosted Android asset is attached for this exact variant yet.";
  }

  if (readiness === "needs-attach") {
    return "The Android manifest record exists, but the final hosted GLB attach is still incomplete.";
  }

  if (health.tooHeavy) {
    return "Hosted GLB needs a lighter export before it should be treated as stable.";
  }

  return "Checking hosted GLB readiness before enabling Android launch.";
}

function resolveAndroidStatusLabel(readiness) {
  if (readiness === "ready") return "Ready";
  if (readiness === "ready-warning") return "Ready with warning";
  if (readiness === "missing-asset") return "Missing asset";
  if (readiness === "needs-attach") return "Asset needs attach";
  if (readiness === "invalid") return "Invalid asset";
  if (readiness === "unreachable") return "Hosted asset unreachable";
  if (readiness === "disabled") return "Disabled";
  return "Checking";
}

export function resolveAndroidBridge(payload, options = {}) {
  const health = options.health;
  const isCurrentPlatform = options.isCurrentPlatform !== false;
  const planned = payload?.bridgeAssets?.planned ?? {};
  const readiness = health ? resolveAndroidReadiness(health) : "missing-asset";

  return {
    platform: "android",
    platformLabel: "Android",
    mode: "scene-viewer",
    supportTier: "primary",
    readiness,
    statusLabel: resolveAndroidStatusLabel(readiness),
    message: resolveAndroidMessage(health || {}, readiness),
    canLaunchAttached: Boolean(health?.androidLaunchReady),
    canAttemptLaunch: Boolean(isCurrentPlatform && health?.androidLaunchReady),
    launchUrl: health?.androidLaunchReady ? health.glbUrl : null,
    expectedPath: planned.sceneViewerGlbPath || planned.webGlbPath || null,
    health: health || null,
  };
}
