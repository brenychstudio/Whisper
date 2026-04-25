const FRAME_MATERIAL_PRESETS = Object.freeze([
  {
    id: "matte-black",
    label: "Matte black",
    baseColorHex: "#262c34",
    faceColorHex: "#262c34",
    sideColorHex: "#0f141b",
    roughness: 0.68,
    sideRoughness: 0.86,
    metalness: 0.03,
    clearcoat: 0.12,
    clearcoatRoughness: 0.92,
    contrastMix: 0.12,
    notes: "Deep graphite-black with clearer face/side separation and restrained premium sheen.",
  },
  {
    id: "warm-white",
    label: "Warm white",
    baseColorHex: "#e4ddcf",
    faceColorHex: "#e4ddcf",
    sideColorHex: "#bfb6a8",
    roughness: 0.78,
    sideRoughness: 0.9,
    metalness: 0.01,
    clearcoat: 0.05,
    clearcoatRoughness: 0.95,
    contrastMix: 0.08,
    notes: "Soft museum white with deeper side planes and stronger premium object separation.",
  },
  {
    id: "natural-oak",
    label: "Natural oak",
    baseColorHex: "#8a6740",
    faceColorHex: "#8a6740",
    sideColorHex: "#684a2f",
    roughness: 0.76,
    sideRoughness: 0.88,
    metalness: 0.01,
    clearcoat: 0.06,
    clearcoatRoughness: 0.93,
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
