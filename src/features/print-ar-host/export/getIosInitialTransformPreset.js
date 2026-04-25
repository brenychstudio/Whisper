import { getIosWallFirstExperimentPreset } from "./getIosWallFirstExperimentPreset.js";

export const DEFAULT_IOS_TRANSFORM_PRESET = "balanced";

const IOS_TRANSFORM_PRESETS = {
  balanced: {
    preset: "balanced",
    label: "Balanced",
    wallPlacementMode: "wall-first",
    interactionIntent: "wall-art-preview",
    orientationBias: "calm-wall-first",
    frontAxis: "+z",
    upAxis: "+y",
    rootRotationEulerDeg: {
      x: 0,
      y: 0,
      z: 0,
    },
    rootPositionOffsetM: {
      x: 0,
      y: 0,
      z: 0,
    },
    scaleNormalization: "preserve-real-size",
    objectModeRole: "inspection-secondary",
    pivotStrategy: "framed-center",
    experimentMode: false,
    exportWarning: "",
  },
  "wall-first": {
    preset: "balanced",
    label: "Balanced",
    wallPlacementMode: "wall-first",
    interactionIntent: "wall-art-preview",
    orientationBias: "calm-wall-first",
    frontAxis: "+z",
    upAxis: "+y",
    rootRotationEulerDeg: {
      x: 0,
      y: 0,
      z: 0,
    },
    rootPositionOffsetM: {
      x: 0,
      y: 0,
      z: 0,
    },
    scaleNormalization: "preserve-real-size",
    objectModeRole: "inspection-secondary",
    pivotStrategy: "framed-center",
    experimentMode: false,
    exportWarning: "",
  },
  "wall-first-experiment": getIosWallFirstExperimentPreset(),
};

export function getIosInitialTransformPreset(
  preset = DEFAULT_IOS_TRANSFORM_PRESET,
) {
  const normalized = String(preset || DEFAULT_IOS_TRANSFORM_PRESET)
    .trim()
    .toLowerCase();

  return (
    IOS_TRANSFORM_PRESETS[normalized] ||
    IOS_TRANSFORM_PRESETS[DEFAULT_IOS_TRANSFORM_PRESET]
  );
}
