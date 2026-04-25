const COMMON = {
  quickLookCompatible: true,
  includeAnchoringProperties: true,
  interactionIntent: "wall-art-preview",
  anchoring: {
    type: "plane",
    alignment: "vertical",
  },
  pivot: {
    strategy: "framed-center",
    keepDepthBalanced: true,
  },
  initialTransform: {
    preset: "balanced",
    wallPlacementMode: "wall-first",
    frontAxis: "+z",
    upAxis: "+y",
    objectModeRole: "inspection-secondary",
  },
  orientationBias: {
    strength: "balanced",
    target: "wall-first",
  },
  experimentMode: {
    enabled: false,
    note: "",
  },
  sceneBake: {
    freezeRootTransforms: true,
    centerAtOrigin: true,
    pivotAtBackFaceCenter: false,
  },
  objectMode: {
    preferredStart: "object",
    keepPresentationNeutral: true,
    intent: "secondary-inspection",
  },
  material: {
    artwork: {
      roughness: 0.9,
      metalness: 0.0,
      emissiveBoost: 0.02,
    },
    paper: {
      roughness: 0.95,
      metalness: 0.0,
    },
    mat: {
      roughness: 0.94,
      metalness: 0.0,
    },
    frame: {
      roughness: 0.82,
      metalness: 0.02,
    },
  },
};

export const IOS_EXPORT_MODES = {
  balanced: {
    mode: "balanced",
    label: "Balanced Quick Look",
    ...COMMON,
    texture: {
      maxDimension: 1536,
      preferredEncoding: "jpeg",
      jpegQuality: 0.86,
      flattenAlpha: true,
      strategy: "scaled-jpeg",
    },
    qualityNotes: [
      "Balanced preset keeps the framed print in the calmer wall-first export orientation.",
      "Uses centered pivot normalization so object mode feels calmer and less rescue-heavy.",
      "Uses reduced texture dimensions and flattened artwork alpha for faster Quick Look loading.",
    ],
  },
  "wall-first-experiment": {
    mode: "wall-first-experiment",
    label: "Wall-First Experiment",
    ...COMMON,
    interactionIntent: "wall-art-preview-experiment",
    pivot: {
      strategy: "framed-center-experiment",
      keepDepthBalanced: true,
    },
    initialTransform: {
      preset: "wall-first-experiment",
      wallPlacementMode: "wall-first-experiment",
      frontAxis: "-y",
      upAxis: "+z",
      objectModeRole: "inspection-secondary",
    },
    orientationBias: {
      strength: "aggressive",
      target: "pre-rotated-wall-placement",
    },
    experimentMode: {
      enabled: true,
      note: "Last strong Quick Look export-side attempt for framed wall placement.",
    },
    texture: {
      maxDimension: 1536,
      preferredEncoding: "jpeg",
      jpegQuality: 0.86,
      flattenAlpha: true,
      strategy: "scaled-jpeg",
    },
    qualityNotes: [
      "Experimental preset pre-rotates the framed print into a stronger wall-first orientation for Quick Look retest.",
      "This is intentionally more aggressive than balanced mode and should be evaluated on device.",
      "Object mode remains secondary; the export is biased toward wall-hanging behavior first.",
    ],
  },
};

export const DEFAULT_IOS_EXPORT_MODE = "balanced";

export function resolveIosExportProfile(mode = DEFAULT_IOS_EXPORT_MODE) {
  const normalizedMode = String(mode || DEFAULT_IOS_EXPORT_MODE)
    .trim()
    .toLowerCase();
  return IOS_EXPORT_MODES[normalizedMode] || IOS_EXPORT_MODES[DEFAULT_IOS_EXPORT_MODE];
}
