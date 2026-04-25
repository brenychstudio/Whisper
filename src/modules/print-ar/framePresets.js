export const FRAME_PRESET_IDS = Object.freeze(["black", "white", "oak"]);

export const FRAME_PRESETS = Object.freeze([
  {
    id: "black",
    label: "Matte black",
    uiLabel: "Black",
    materialMode: "matte-black",
    materialPresetId: "matte-black",
    geometryPresetId: "premium-gallery",
    assetKeyToken: "black-frame",
    style: "Matte black",
    notes: "Primary baseline frame finish.",
  },
  {
    id: "white",
    label: "Warm white",
    uiLabel: "White",
    materialMode: "warm-white",
    materialPresetId: "warm-white",
    geometryPresetId: "premium-gallery",
    assetKeyToken: "white-frame",
    style: "Warm white",
    notes: "Soft warm white, never pure clinical white.",
  },
  {
    id: "oak",
    label: "Natural oak",
    uiLabel: "Oak",
    materialMode: "natural-oak",
    materialPresetId: "natural-oak",
    geometryPresetId: "premium-gallery",
    assetKeyToken: "oak-frame",
    style: "Natural oak",
    notes: "Neutral restrained wood tone for interior blend.",
  },
]);
