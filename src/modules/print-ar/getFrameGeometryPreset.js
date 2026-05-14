const FRAME_GEOMETRY_PRESETS = Object.freeze([
  {
    id: "premium-gallery",
    label: "Premium gallery profile",
    profileMode: "gallery-stepped",
    profileWidthMm: 25.5,
    outerDepthMm: 34,
    frontFaceWidthMm: 15.5,
    sideDepthMm: 12,
    outerBevelMm: 2.2,
    innerBevelMm: 1.2,
    bevelSoftness: 0.55,
    innerLipInsetMm: 4.8,
    innerLipWidthMm: 4.8,
    innerLipDepthMm: 3.2,
    notes: "Premium gallery profile with softened bevels, inner lip, and deeper shadow separation.",
  },
]);

export const FRAME_GEOMETRY_PRESET_IDS = Object.freeze(
  FRAME_GEOMETRY_PRESETS.map((preset) => preset.id),
);

export const DEFAULT_FRAME_GEOMETRY_PRESET_ID = FRAME_GEOMETRY_PRESETS[0].id;

export function getFrameGeometryPreset(
  presetId = DEFAULT_FRAME_GEOMETRY_PRESET_ID,
) {
  const normalized = String(presetId || "")
    .trim()
    .toLowerCase();

  return (
    FRAME_GEOMETRY_PRESETS.find((preset) => preset.id === normalized) ||
    FRAME_GEOMETRY_PRESETS[0]
  );
}
