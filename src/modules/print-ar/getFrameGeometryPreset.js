const FRAME_GEOMETRY_PRESETS = Object.freeze([
  {
    id: "premium-gallery",
    label: "Premium gallery profile",
    profileMode: "gallery-stepped",
    profileWidthMm: 24,
    outerDepthMm: 32,
    frontFaceWidthMm: 14.5,
    sideDepthMm: 10.5,
    outerBevelMm: 0,
    innerBevelMm: 0,
    bevelSoftness: 0,
    innerLipInsetMm: 4.2,
    innerLipWidthMm: 4.2,
    innerLipDepthMm: 2.9,
    notes: "Stable premium stepped gallery profile with inner lip, no risky extrude geometry.",
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
