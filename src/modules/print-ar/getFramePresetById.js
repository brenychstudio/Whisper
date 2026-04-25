import { FRAME_PRESETS } from "./framePresets.js";

export function getFramePresetById(framePresetId) {
  const normalized = String(framePresetId || "").trim().toLowerCase();

  return (
    FRAME_PRESETS.find((preset) => preset.id === normalized) ||
    FRAME_PRESETS[0]
  );
}

