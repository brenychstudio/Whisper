// Compatibility wrapper. Canonical hosted asset ownership lives in src/modules/print-ar/.
export {
  getExpectedHostedGlbPath,
  getExpectedHostedUsdzPath,
  getHostedArAssetRecord,
  hasHostedAndroidAsset,
  hasHostedIosAsset,
  listHostedArAssetRecords,
  normalizeHostedStatus,
} from "../../modules/print-ar/index.js";
