const FRAME_MATERIAL_PRESETS = Object.freeze([
  {
    id: "matte-black",
    label: "Matte black",
    baseColorHex: "#303842",
    faceColorHex: "#2b333d",
    sideColorHex: "#151b23",
    roughness: 0.58,
    sideRoughness: 0.76,
    metalness: 0.03,
    clearcoat: 0.18,
    clearcoatRoughness: 0.72,
    contrastMix: 0.12,
    notes: "Deep graphite-black with clearer face/side separation and restrained premium sheen.",
  },
  {
    id: "warm-white",
    label: "Warm white",
    baseColorHex: "#e4ddcf",
    faceColorHex: "#ddd6c8",
    sideColorHex: "#aea597",
    roughness: 0.72,
    sideRoughness: 0.86,
    metalness: 0.01,
    clearcoat: 0.08,
    clearcoatRoughness: 0.86,
    contrastMix: 0.08,
    notes: "Soft museum white with deeper side planes and stronger premium object separation.",
  },
  {
    id: "natural-oak",
    label: "Natural oak",
    baseColorHex: "#8a6740",
    faceColorHex: "#85613c",
    sideColorHex: "#553921",
    roughness: 0.66,
    sideRoughness: 0.82,
    metalness: 0.01,
    clearcoat: 0.14,
    clearcoatRoughness: 0.68,
    contrastMix: 0.1,
    grainHint: "subtle",
    notes: "Richer restrained oak with deeper side tone and less flat brown-box appearance.",
  },
]);

export const FRAME_MATERIAL_PRESET_IDS = Object.freeze(
  FRAME_MATERIAL_PRESETS.map((preset) => preset.id),
);

export const DEFAULT_FRAME_MATERIAL_PRESET_ID = FRAME_MATERIAL_PRESETS[0].id;

export function getFrameMaterialPreset(
  presetId = DEFAULT_FRAME_MATERIAL_PRESET_ID,
) {
  const normalized = String(presetId || "")
    .trim()
    .toLowerCase();

  return (
    FRAME_MATERIAL_PRESETS.find((preset) => preset.id === normalized) ||
    FRAME_MATERIAL_PRESETS[0]
  );
}
