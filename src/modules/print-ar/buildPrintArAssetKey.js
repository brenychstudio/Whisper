export function sanitizeVariantId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();
}

function normalizeFrameKey(frameKey) {
  const value = sanitizeVariantId(frameKey || "black-frame");
  if (!value) return "black-frame";
  if (value === "black" || value === "white" || value === "oak") {
    return `${value}-frame`;
  }
  return value.includes("-frame") ? value : `${value}-frame`;
}

export function buildPrintArAssetKey({
  printId,
  sizeKey,
  frameKey = "black-frame",
  matKey = "warm-white-mat",
}) {
  return sanitizeVariantId(
    [printId, sizeKey, normalizeFrameKey(frameKey), matKey].filter(Boolean).join("-"),
  );
}

export const buildVariantAssetId = buildPrintArAssetKey;
