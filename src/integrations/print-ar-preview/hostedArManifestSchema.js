const READY_STATUSES = new Set(["ready", "attached", "available"]);
const DISABLED_STATUSES = new Set(["disabled", "off"]);

export const HOSTED_AR_STATUS = {
  DRAFT: "draft",
  READY: "ready",
  DISABLED: "disabled",
  MISSING: "missing",
};

function sanitizeText(value) {
  return String(value || "").trim();
}

function deriveFileNameFromUrl(glbUrl, assetKey) {
  const value = sanitizeText(glbUrl);
  if (!value) return `${assetKey}.glb`;
  const chunks = value.split("/");
  const fileName = chunks[chunks.length - 1] || "";
  return fileName || `${assetKey}.glb`;
}

function normalizeAndroidScaleMode(value) {
  const normalized = sanitizeText(value).toLowerCase();
  if (normalized === "auto" || normalized === "adjustable" || normalized === "resizable") {
    return "auto";
  }
  return "fixed";
}

function normalizeIosQuickLookMode(value) {
  const normalized = sanitizeText(value).toLowerCase();
  if (normalized === "object") {
    return "object";
  }
  return "ar";
}

export function normalizeHostedStatus(value) {
  const normalized = sanitizeText(value).toLowerCase();

  if (READY_STATUSES.has(normalized)) {
    return HOSTED_AR_STATUS.READY;
  }

  if (DISABLED_STATUSES.has(normalized)) {
    return HOSTED_AR_STATUS.DISABLED;
  }

  return HOSTED_AR_STATUS.DRAFT;
}

export function getExpectedHostedGlbPath(assetKey, fileName) {
  const normalizedAssetKey = sanitizeText(assetKey);
  const normalizedFileName = sanitizeText(fileName) || `${normalizedAssetKey}.glb`;
  return `/generated/${normalizedFileName}`;
}

export function getExpectedHostedUsdzPath(assetKey) {
  const normalizedAssetKey = sanitizeText(assetKey);
  return `/generated/${normalizedAssetKey}.usdz`;
}

export function normalizeHostedArManifestRecord(assetKey, raw) {
  const normalizedAssetKey = sanitizeText(raw?.assetKey || assetKey);

  if (!normalizedAssetKey || !raw || typeof raw !== "object") {
    return null;
  }

  const status = normalizeHostedStatus(raw.status);
  const hasExplicitGlbUrl = Object.prototype.hasOwnProperty.call(raw, "glbUrl");
  const explicitGlbUrl = sanitizeText(raw.glbUrl || "");
  const fileName = sanitizeText(raw.fileName || "") || deriveFileNameFromUrl(explicitGlbUrl, normalizedAssetKey);
  const defaultGlbUrl = getExpectedHostedGlbPath(normalizedAssetKey, fileName);
  const glbUrl = hasExplicitGlbUrl ? explicitGlbUrl || null : defaultGlbUrl;
  const iosSrc = sanitizeText(raw.iosSrc || "") || null;

  const rawAndroid = raw.platform?.android || {};
  const rawIos = raw.platform?.ios || {};

  const androidEnabled =
    typeof rawAndroid.enabled === "boolean"
      ? rawAndroid.enabled
      : status !== HOSTED_AR_STATUS.DISABLED;

  const iosEnabled =
    typeof rawIos.enabled === "boolean"
      ? rawIos.enabled
      : status !== HOSTED_AR_STATUS.DISABLED && Boolean(iosSrc);

  const note = sanitizeText(raw.meta?.note || raw.note || "");
  const source = sanitizeText(raw.meta?.source || raw.source || "manual");
  const updatedAt = sanitizeText(raw.meta?.updatedAt || raw.updatedAt || "");

  return {
    assetKey: normalizedAssetKey,
    fileName,
    glbUrl,
    iosSrc,
    status,
    platform: {
      android: {
        enabled: androidEnabled,
        scaleMode: normalizeAndroidScaleMode(rawAndroid.scaleMode || raw.androidScaleMode),
      },
      ios: {
        enabled: iosEnabled,
        quickLookMode: normalizeIosQuickLookMode(rawIos.quickLookMode),
      },
    },
    meta: {
      updatedAt,
      note,
      source,
    },
  };
}
