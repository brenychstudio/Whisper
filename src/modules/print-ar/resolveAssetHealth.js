import { getHostedArAssetRecord } from "./hostedAssets.js";

function uniqueIssues(issues) {
  return Array.from(new Set(issues.filter(Boolean)));
}

function toReachable(validation, fileDeclared) {
  if (!validation) return fileDeclared ? "unknown" : false;
  if (
    validation.status === "ok" ||
    validation.status === "too-heavy" ||
    validation.status === "ok-heavy"
  ) {
    return true;
  }
  if (
    validation.status === "missing" ||
    validation.status === "unreachable" ||
    validation.status === "invalid"
  ) {
    return false;
  }
  return "unknown";
}

function canTreatValidationAsAcceptable(validation) {
  if (!validation) return false;
  return validation.status === "ok" || validation.status === "too-heavy";
}

function canTreatIosValidationAsAcceptable(validation) {
  if (!validation) return false;
  return validation.status === "ok" || validation.status === "ok-heavy";
}

export function resolveAssetHealth(assetKey, options = {}) {
  const record = options.record === undefined
    ? getHostedArAssetRecord(assetKey)
    : options.record;
  const validation = options.androidValidation || options.validation || null;
  const iosValidation = options.iosValidation || null;

  const manifestDeclared = Boolean(record);
  const manifestStatus = record?.status || "missing";
  const glbUrl = record?.glbUrl || null;
  const fileName = record?.fileName || `${assetKey}.glb`;
  const fileDeclared = Boolean(glbUrl);
  const androidEnabled = Boolean(record?.platform?.android?.enabled);
  const iosSrc = record?.iosSrc || null;
  const iosDeclared = Boolean(iosSrc);
  const iosEnabled = Boolean(record?.platform?.ios?.enabled);
  const iosQuickLookMode = record?.platform?.ios?.quickLookMode || "ar";

  const reachable = toReachable(validation, fileDeclared);
  const bytes = Number.isFinite(validation?.sizeBytes) ? validation.sizeBytes : null;
  const tooHeavy = Boolean(validation?.tooHeavy);
  const iosReachable = toReachable(iosValidation, iosDeclared);
  const iosBytes = Number.isFinite(iosValidation?.sizeBytes)
    ? iosValidation.sizeBytes
    : null;
  const iosContentType = iosValidation?.contentType || iosValidation?.mimeType || null;
  const iosTooHeavy = Boolean(iosValidation?.tooHeavy);

  const issues = [];
  const iosIssues = [];

  if (!manifestDeclared) {
    issues.push("Manifest missing.");
    iosIssues.push("Manifest missing.");
  } else {
    if (manifestStatus === "draft") {
      issues.push("Manifest status is draft.");
    }
    if (manifestStatus === "disabled") {
      issues.push("Manifest status is disabled.");
    }
    if (!fileDeclared) {
      issues.push("Manifest entry has no GLB path.");
    }
    if (!androidEnabled) {
      issues.push("Android is disabled in manifest.");
    }

    if (!iosDeclared) {
      iosIssues.push("Manifest entry has no USDZ path.");
    }
    if (!iosEnabled) {
      iosIssues.push("iOS Quick Look is disabled in manifest.");
    }
  }

  if (validation?.status === "unreachable") {
    issues.push("Manifest ready, file unreachable.");
  }
  if (validation?.status === "invalid") {
    issues.push("Hosted GLB response is invalid.");
  }
  if (tooHeavy) {
    issues.push("Heavy GLB warning.");
  }
  if (!validation && manifestDeclared && manifestStatus === "ready" && fileDeclared) {
    issues.push("Hosted file has not been health-checked yet.");
  }

  if (iosValidation?.status === "unreachable") {
    iosIssues.push("Manifest ready, USDZ file unreachable.");
  }
  if (iosValidation?.status === "invalid") {
    iosIssues.push("Hosted USDZ response is invalid.");
  }
  if (iosTooHeavy) {
    iosIssues.push("Heavy USDZ warning.");
  }
  if (!iosValidation && manifestDeclared && manifestStatus === "ready" && iosDeclared) {
    iosIssues.push("Hosted USDZ has not been health-checked yet.");
  }

  const acceptableValidation = canTreatValidationAsAcceptable(validation);
  const androidLaunchReady = Boolean(
    manifestDeclared &&
      manifestStatus === "ready" &&
      androidEnabled &&
      fileDeclared &&
      reachable === true &&
      acceptableValidation,
  );
  const iosLaunchReady = Boolean(
    manifestDeclared &&
      manifestStatus === "ready" &&
      iosEnabled &&
      iosDeclared &&
      iosReachable === true &&
      canTreatIosValidationAsAcceptable(iosValidation),
  );

  let level = "warn";
  if (androidLaunchReady) {
    level = tooHeavy ? "warn" : "ready";
  } else if (
    !manifestDeclared ||
    (manifestStatus === "ready" && !fileDeclared) ||
    reachable === false ||
    validation?.status === "invalid"
  ) {
    level = "error";
  }

  let iosLevel = "warn";
  if (iosLaunchReady) {
    iosLevel = iosTooHeavy ? "warn" : "ready";
  } else if (
    (manifestDeclared && manifestStatus === "ready" && !iosDeclared) ||
    (manifestDeclared && manifestStatus === "ready" && iosEnabled && iosReachable === false) ||
    iosValidation?.status === "invalid"
  ) {
    iosLevel = "error";
  }

  const launchReadyCount = Number(androidLaunchReady) + Number(iosLaunchReady);
  const platformState =
    launchReadyCount === 2
      ? "both-ready"
      : androidLaunchReady
        ? "android-ready-only"
        : iosLaunchReady
          ? "ios-ready-only"
          : "neither-ready";
  const combinedLevel =
    level === "error" || iosLevel === "error"
      ? "error"
      : platformState === "both-ready"
        ? "ready"
        : "warn";
  const customerPreviewStatus = androidLaunchReady
    ? "ready"
    : iosLaunchReady
      ? "partial"
      : "unavailable";
  const customerPrimaryAction = androidLaunchReady
    ? "android"
    : iosLaunchReady
      ? "ios"
      : "none";

  return {
    assetKey,
    manifestDeclared,
    manifestStatus,
    fileDeclared,
    glbUrl,
    fileName,
    reachable,
    bytes,
    tooHeavy,
    androidEnabled,
    androidLaunchReady,
    issues: uniqueIssues(issues),
    level,
    validationStatus: validation?.status || (fileDeclared ? "unchecked" : "missing"),
    iosSrc,
    iosDeclared,
    iosEnabled,
    iosQuickLookMode,
    iosReachable,
    iosBytes,
    iosContentType,
    iosTooHeavy,
    iosLaunchReady,
    iosIssues: uniqueIssues(iosIssues),
    iosLevel,
    iosValidationStatus: iosValidation?.status || (iosDeclared ? "unchecked" : "missing"),
    platformState,
    combinedLevel,
    customerPreviewStatus,
    customerPrimaryAction,
  };
}

export const resolveHostedArAssetHealth = resolveAssetHealth;
