import {
  getExpectedHostedGlbPath as getExpectedGlbPathFromSchema,
  getExpectedHostedUsdzPath as getExpectedUsdzPathFromSchema,
  normalizeHostedArManifestRecord,
  normalizeHostedStatus,
} from "../../integrations/print-ar-preview/hostedArManifestSchema.js";

export const HOSTED_AR_ASSETS = {
  "forest-01-40x30-black-frame-warm-white-mat": {
    assetKey: "forest-01-40x30-black-frame-warm-white-mat",
    fileName: "forest-01-40x30-black-frame-warm-white-mat.glb",
    glbUrl: "/generated/forest-01-40x30-black-frame-warm-white-mat.glb",
    iosSrc: null,
    status: "ready",
    platform: {
      android: {
        enabled: true,
        scaleMode: "fixed",
      },
      ios: {
        enabled: false,
        quickLookMode: "ar",
      },
    },
    meta: {
      updatedAt: "2026-03-22",
      note: "Android-tested hosted GLB. USDZ not attached yet.",
      source: "manual-registry",
    },
  },
  "forest-02-70x50-black-frame-warm-white-mat": {
    assetKey: "forest-02-70x50-black-frame-warm-white-mat",
    fileName: "forest-02-70x50-black-frame-warm-white-mat.glb",
    glbUrl: "/generated/forest-02-70x50-black-frame-warm-white-mat.glb",
    iosSrc: "/generated/forest-02-70x50-black-frame-warm-white-mat.usdz",
    status: "ready",
    platform: {
      android: {
        enabled: true,
        scaleMode: "fixed",
      },
      ios: {
        enabled: true,
        quickLookMode: "ar",
      },
    },
    meta: {
      updatedAt: "2026-04-25",
      note: "Android GLB + iOS USDZ attached for exact Whisper forest-02 70x50 black/warm-white variant.",
      source: "manual-attach",
    },
  },
  "forest-03-70x50-black-frame-warm-white-mat": {
    assetKey: "forest-03-70x50-black-frame-warm-white-mat",
    fileName: "forest-03-70x50-black-frame-warm-white-mat.glb",
    glbUrl: "/generated/forest-03-70x50-black-frame-warm-white-mat.glb",
    iosSrc: null,
    status: "ready",
    platform: {
      android: {
        enabled: true,
        scaleMode: "fixed",
      },
      ios: {
        enabled: false,
        quickLookMode: "ar",
      },
    },
    meta: {
      updatedAt: "2026-03-22",
      note: "Hosted GLB attached. USDZ not attached yet.",
      source: "manual-registry",
    },
  },
};

function normalizeRecord(assetKey) {
  const key = String(assetKey || "").trim();
  if (!key) return null;
  return normalizeHostedArManifestRecord(key, HOSTED_AR_ASSETS[key]);
}

export function normalizeHostedArAssetStatus(value) {
  return normalizeHostedStatus(value) === "ready" ? "ready" : "missing";
}

export function getHostedArAsset(assetKey) {
  return normalizeRecord(assetKey);
}

export function getHostedArAttachedAsset(assetKey) {
  const record = getHostedArAsset(assetKey);
  if (!record || (!record.glbUrl && !record.iosSrc)) {
    return null;
  }

  return record;
}

export function getHostedArAssetRecord(assetKey) {
  return normalizeRecord(assetKey);
}

export function listHostedArAssetRecords() {
  return Object.keys(HOSTED_AR_ASSETS)
    .map((assetKey) => normalizeRecord(assetKey))
    .filter(Boolean);
}

export function hasHostedAndroidAsset(assetKey) {
  const record = getHostedArAssetRecord(assetKey);

  return Boolean(
    record &&
      record.status === "ready" &&
      record.platform?.android?.enabled &&
      record.glbUrl,
  );
}

export function hasHostedIosAsset(assetKey) {
  const record = getHostedArAssetRecord(assetKey);

  return Boolean(
    record &&
      record.status === "ready" &&
      record.platform?.ios?.enabled &&
      record.iosSrc,
  );
}

export function getHostedCustomerReadyState(assetKey) {
  const record = getHostedArAssetRecord(assetKey);

  if (!record || record.status !== "ready") {
    return {
      androidReady: false,
      iosReady: false,
      previewStatus: "unavailable",
    };
  }

  const androidReady = Boolean(record.platform?.android?.enabled && record.glbUrl);
  const iosReady = Boolean(record.platform?.ios?.enabled && record.iosSrc);

  return {
    androidReady,
    iosReady,
    previewStatus: androidReady ? "ready" : iosReady ? "partial" : "unavailable",
  };
}

export function getExpectedHostedGlbPath(assetKey) {
  const record = getHostedArAssetRecord(assetKey);
  if (!record) return getExpectedGlbPathFromSchema(assetKey);
  return record.glbUrl || getExpectedGlbPathFromSchema(assetKey, record.fileName);
}

export function getExpectedHostedUsdzPath(assetKey) {
  const record = getHostedArAssetRecord(assetKey);
  if (!record) return getExpectedUsdzPathFromSchema(assetKey);
  return record.iosSrc || getExpectedUsdzPathFromSchema(assetKey);
}

export function getHostedArAssetState(assetKey) {
  const record = getHostedArAsset(assetKey);

  if (!record) {
    return {
      status: "missing",
      manifestStatus: "missing",
      note: "No hosted AR asset is attached to this variant yet.",
      glbUrl: null,
      iosSrc: null,
      fileName: `${assetKey}.glb`,
      expectedGlbPath: getExpectedHostedGlbPath(assetKey),
      androidEnabled: false,
      iosEnabled: false,
      iosQuickLookMode: "ar",
      customerPreview: {
        androidReady: false,
        iosReady: false,
        previewStatus: "unavailable",
      },
    };
  }

  return {
    status: record.status === "ready" ? "ready" : "missing",
    manifestStatus: record.status,
    note: record.meta?.note || "",
    glbUrl: record.glbUrl || null,
    iosSrc: record.iosSrc || null,
    fileName: record.fileName,
    expectedGlbPath: getExpectedHostedGlbPath(record.assetKey),
    androidEnabled: Boolean(record.platform?.android?.enabled),
    iosEnabled: Boolean(record.platform?.ios?.enabled),
    iosQuickLookMode: record.platform?.ios?.quickLookMode || "ar",
    customerPreview: getHostedCustomerReadyState(record.assetKey),
    record,
  };
}

export { normalizeHostedStatus };
