export function getIosWallFirstExperimentPreset() {
  return {
    preset: "wall-first-experiment",
    label: "Wall-first experiment",
    wallPlacementMode: "wall-first-experiment",
    interactionIntent: "wall-art-preview-experiment",
    orientationBias: "strong-pre-rotated-wall-first",
    frontAxis: "-y",
    upAxis: "+z",
    rootRotationEulerDeg: {
      // Experimental Quick Look compensation:
      // rotate the framed print into a much stronger hanging-picture pose.
      x: 90,
      y: 0,
      z: 180,
    },
    rootPositionOffsetM: {
      x: 0,
      y: 0,
      z: 0,
    },
    scaleNormalization: "preserve-real-size",
    objectModeRole: "secondary-inspection",
    pivotStrategy: "framed-center-experiment",
    experimentMode: true,
    exportWarning:
      "Experimental Quick Look preset with stronger pre-rotated wall-first orientation.",
  };
}
