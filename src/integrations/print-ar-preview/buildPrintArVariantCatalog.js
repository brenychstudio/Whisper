// Site/internal helper. Canonical runtime payload logic lives in src/modules/print-ar/.
import { buildPrintArPayload } from "../../modules/print-ar/buildPrintArPayload.js";
import { getHostedArAssetRecord } from "./resolveHostedArAssetRecord.js";

function normalizeSizeEntry(size) {
  if (typeof size === "string") {
    const key = String(size).trim().replace(/Г—/g, "x").replace(/\s+/g, "");
    return { key, label: key.replace("x", "Г—") };
  }

  if (!size || typeof size !== "object") {
    return null;
  }

  const key = String(size.key || size.label || "")
    .trim()
    .replace(/Г—/g, "x")
    .replace(/\s+/g, "");

  if (!key) {
    return null;
  }

  return {
    ...size,
    key,
    label: size.label || key.replace("x", "Г—"),
  };
}

function sizeKeyFromPayload(payload) {
  const widthCm = Math.round((Number(payload?.print?.widthMm) || 0) / 10);
  const heightCm = Math.round((Number(payload?.print?.heightMm) || 0) / 10);
  return `${widthCm}x${heightCm}`;
}

function sizeLabelFromKey(sizeKey) {
  const [w, h] = String(sizeKey || "").split("x");
  if (!w || !h) return String(sizeKey || "");
  return `${w}Г—${h}`;
}

export async function buildPrintArVariantCatalog({ prints, getShareUrl } = {}) {
  const sourcePrints = Array.isArray(prints) ? prints : [];
  const toShareUrl =
    typeof getShareUrl === "function" ? getShareUrl : () => "";
  const catalog = [];

  for (const print of sourcePrints) {
    if (!print?.id) continue;

    const normalizedSizes = (Array.isArray(print.sizes) ? print.sizes : [])
      .map(normalizeSizeEntry)
      .filter(Boolean);

    for (const size of normalizedSizes) {
      const payload = await buildPrintArPayload({
        print,
        size,
        shareUrl: toShareUrl(print.id),
      });

      const hosted = getHostedArAssetRecord(payload.assetKey);
      const sizeKey = sizeKeyFromPayload(payload);

      catalog.push({
        productId: print.id,
        printId: print.id,
        title: print.title || "",
        series: print.series || "",
        sizeKey,
        sizeLabel: size.label || sizeLabelFromKey(sizeKey),
        requestedSizeKey: size.key || "",
        framePresetId: payload?.frame?.id || "black",
        frameLabel: payload?.frame?.label || payload?.frame?.style || "Matte black",
        assetKey: payload.assetKey,
        hostedStatus: hosted?.status || "missing",
        hostedNote: hosted?.meta?.note || "",
        glbUrl: hosted?.glbUrl || null,
        iosSrc: hosted?.iosSrc || null,
        plannedGlbPath:
          payload?.bridgeAssets?.planned?.webGlbPath ||
          `/generated/${payload.assetKey}.glb`,
        plannedUsdzPath:
          payload?.bridgeAssets?.planned?.quickLookUsdzPath ||
          `/generated/${payload.assetKey}.usdz`,
        payload,
      });
    }
  }

  return catalog;
}
