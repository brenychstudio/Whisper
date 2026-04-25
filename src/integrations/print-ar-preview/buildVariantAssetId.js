// Compatibility wrapper. Canonical asset key construction lives in src/modules/print-ar/.
export {
  buildPrintArAssetKey as buildVariantAssetId,
  sanitizeVariantId,
} from "../../modules/print-ar/index.js";
