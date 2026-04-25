// Internal prep helper for local-first manifest work. Not part of the customer runtime surface.
function escapeValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fileNameFromPath(path, assetKey) {
  const value = String(path || "").trim();
  if (!value) return `${assetKey}.glb`;
  const chunks = value.split("/");
  return chunks[chunks.length - 1] || `${assetKey}.glb`;
}

function normalizePatchRecord(row, options = {}) {
  const assetKey = String(row?.assetKey || "").trim();
  if (!assetKey) return null;

  const fileName = String(row?.fileName || "")
    .trim() || fileNameFromPath(row?.plannedGlbPath, assetKey);
  const glbUrl = String(row?.glbUrl || row?.plannedGlbPath || `/generated/${fileName}`).trim();
  const iosSrc = row?.iosSrc ? String(row.iosSrc).trim() : null;
  const status = String(options.status || "ready").trim() || "ready";
  const note =
    String(options.note || row?.hostedNote || "Hosted GLB attached. USDZ not attached yet.").trim();
  const source = String(options.source || "manual-manifest-update").trim();
  const updatedAt = String(options.updatedAt || new Date().toISOString().slice(0, 10)).trim();
  const androidEnabled = options.androidEnabled !== false;
  const scaleMode = options.scaleMode === "auto" ? "auto" : "fixed";
  const iosEnabled = options.iosEnabled === true;

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
  };
}

function stringifyEntry(record) {
  const iosSrcText = record.iosSrc ? `"${escapeValue(record.iosSrc)}"` : "null";
  return [
    `  "${escapeValue(record.assetKey)}": {`,
    `    assetKey: "${escapeValue(record.assetKey)}",`,
    `    fileName: "${escapeValue(record.fileName)}",`,
    `    glbUrl: "${escapeValue(record.glbUrl)}",`,
    `    iosSrc: ${iosSrcText},`,
    `    status: "${escapeValue(record.status)}",`,
    "    platform: {",
    "      android: {",
    `        enabled: ${record.androidEnabled ? "true" : "false"},`,
    `        scaleMode: "${escapeValue(record.scaleMode)}",`,
    "      },",
    "      ios: {",
    `        enabled: ${record.iosEnabled ? "true" : "false"},`,
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

export function buildHostedArManifestSingleEntryPatch(row, options = {}) {
  const normalized = normalizePatchRecord(row, options);
  if (!normalized) return "";
  return stringifyEntry(normalized);
}

export function buildHostedArManifestBatchPatch(rows, options = {}) {
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

  const entries = records.map((record) => stringifyEntry(record)).join("\n");

  return [
    "// Paste entries into HOSTED_AR_ASSETS in hostedArAssets.js",
    entries,
  ].join("\n");
}

export function buildHostedArManifestPatch(rows, options = {}) {
  return buildHostedArManifestBatchPatch(rows, options);
}
