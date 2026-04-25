function escapeValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fileNameFromPath(path, fallback) {
  const value = String(path || "").trim();
  if (!value) return fallback;
  const chunks = value.split("/");
  return chunks[chunks.length - 1] || fallback;
}

function normalizeQuickLookMode(value) {
  return String(value || "").trim().toLowerCase() === "object" ? "object" : "ar";
}

function getDefaultUsdzPath(assetKey) {
  return `/generated/${assetKey}.usdz`;
}

function getDefaultGlbPath(assetKey, fileName) {
  return `/generated/${fileName || `${assetKey}.glb`}`;
}

function normalizePatchRecord(row, options = {}) {
  const assetKey = String(row?.assetKey || "").trim();
  if (!assetKey) return null;

  const includeAndroid = options.includeAndroid !== false;
  const preferGeneratedGlb = options.preferGeneratedGlb === true;
  const preferGeneratedUsdz = options.preferGeneratedUsdz !== false;
  const hasLocalGlb = row?.localGlbGenerated === true || row?.hasSessionOutput === true;
  const hasLocalUsdz = row?.localUsdzGenerated === true || row?.hasUsdzSessionOutput === true;
  const existingRecord = row?.health || {};
  const existingAndroidEnabled =
    typeof row?.health?.androidEnabled === "boolean"
      ? row.health.androidEnabled
      : Boolean(row?.payload?.bridgeAssets?.platform?.android?.enabled);
  const existingIosEnabled =
    typeof row?.health?.iosEnabled === "boolean"
      ? row.health.iosEnabled
      : Boolean(row?.payload?.bridgeAssets?.platform?.ios?.enabled);
  const existingQuickLookMode =
    row?.health?.iosQuickLookMode ||
    row?.payload?.bridgeAssets?.platform?.ios?.quickLookMode ||
    row?.payload?.assets?.platform?.ios?.quickLookMode ||
    "ar";

  const fileName =
    String(row?.fileName || "").trim() ||
    fileNameFromPath(row?.glbUrl || row?.plannedGlbPath, `${assetKey}.glb`);

  const plannedGlbPath = String(row?.plannedGlbPath || "").trim();
  const plannedUsdzPath = String(row?.plannedUsdzPath || getDefaultUsdzPath(assetKey)).trim();
  const attachedGlbPath = String(row?.glbUrl || "").trim();
  const glbUrl = includeAndroid
    ? attachedGlbPath ||
      (preferGeneratedGlb && hasLocalGlb && plannedGlbPath ? plannedGlbPath : null) ||
      (options.mode === "combined" && (attachedGlbPath || hasLocalGlb)
        ? plannedGlbPath || getDefaultGlbPath(assetKey, fileName)
        : null)
    : null;

  const iosSrc = String(
    options.iosSrc ||
      (preferGeneratedUsdz && (hasLocalUsdz || !row?.iosSrc) ? plannedUsdzPath : "") ||
      row?.iosSrc ||
      row?.health?.iosSrc ||
      getDefaultUsdzPath(assetKey),
  ).trim();

  const existingStatus = String(
    row?.hostedStatus || row?.health?.manifestStatus || "",
  ).trim();
  const status =
    String(
      options.status ||
        (existingStatus === "ready" || existingStatus === "draft" || existingStatus === "disabled"
          ? existingStatus
          : "ready"),
    ).trim() || "ready";
  const note =
    String(
      options.note ||
        row?.hostedNote ||
        (options.mode === "combined"
          ? "Generated assets prepared for manual Android+iPhone/iPad attach and validation."
          : "Generated USDZ prepared for manual iPhone/iPad Quick Look validation."),
    ).trim();
  const source = String(options.source || "manual-ios-attach").trim();
  const updatedAt = String(options.updatedAt || new Date().toISOString().slice(0, 10)).trim();
  const androidEnabled =
    includeAndroid &&
    (typeof options.androidEnabled === "boolean"
      ? options.androidEnabled
      : Boolean(glbUrl) && (existingAndroidEnabled || options.mode === "combined"));
  const scaleMode =
    String(
      options.scaleMode ||
        row?.payload?.bridgeAssets?.platform?.android?.scaleMode ||
        "fixed",
    ).trim() === "auto"
      ? "auto"
      : "fixed";
  const iosEnabled =
    typeof options.iosEnabled === "boolean"
      ? options.iosEnabled
      : existingIosEnabled || Boolean(iosSrc);
  const quickLookMode = normalizeQuickLookMode(options.quickLookMode || existingQuickLookMode);

  return {
    assetKey,
    fileName,
    glbUrl,
    iosSrc,
    status,
    note,
    source,
    updatedAt,
    androidEnabled,
    scaleMode,
    iosEnabled,
    quickLookMode,
    includeAndroid,
    manifestDeclared: Boolean(existingRecord?.manifestDeclared),
  };
}

function stringifyMaybeString(value) {
  if (!value) return "null";
  return `"${escapeValue(value)}"`;
}

function stringifyEntry(record) {
  return [
    `  "${escapeValue(record.assetKey)}": {`,
    `    assetKey: "${escapeValue(record.assetKey)}",`,
    `    fileName: "${escapeValue(record.fileName)}",`,
    `    glbUrl: ${stringifyMaybeString(record.glbUrl)},`,
    `    iosSrc: "${escapeValue(record.iosSrc)}",`,
    `    status: "${escapeValue(record.status)}",`,
    "    platform: {",
    "      android: {",
    `        enabled: ${record.androidEnabled ? "true" : "false"},`,
    `        scaleMode: "${escapeValue(record.scaleMode)}",`,
    "      },",
    "      ios: {",
    `        enabled: ${record.iosEnabled ? "true" : "false"},`,
    `        quickLookMode: "${escapeValue(record.quickLookMode)}",`,
    "      },",
    "    },",
    "    meta: {",
    `      updatedAt: "${escapeValue(record.updatedAt)}",`,
    `      note: "${escapeValue(record.note)}",`,
    `      source: "${escapeValue(record.source)}",`,
    "    },",
    "  },",
  ].join("\n");
}

export function buildIosManifestSingleEntryPatch(row, options = {}) {
  const normalized = normalizePatchRecord(row, options);
  if (!normalized) return "";
  return stringifyEntry(normalized);
}

export function buildIosManifestBatchPatch(rows, options = {}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const normalized = sourceRows
    .map((row) => normalizePatchRecord(row, options))
    .filter(Boolean);

  if (!normalized.length) {
    return "";
  }

  const records = options.sortByAssetKey === false
    ? normalized
    : [...normalized].sort((a, b) => a.assetKey.localeCompare(b.assetKey));

  const header =
    options.mode === "combined"
      ? "// Paste canonical Android+iOS entries into HOSTED_AR_ASSETS in hostedArAssets.js"
      : "// Paste canonical iOS-ready entries into HOSTED_AR_ASSETS in hostedArAssets.js";

  return [
    header,
    records.map((record) => stringifyEntry(record)).join("\n"),
  ].join("\n");
}

export function buildIosManifestPatch(rows, options = {}) {
  return buildIosManifestBatchPatch(rows, options);
}
