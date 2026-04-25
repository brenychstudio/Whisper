import { resolveIosExportProfile } from "./iosExportProfile.js";

export function getIosMaterialPreset(mode = "balanced") {
  const profile = resolveIosExportProfile(mode);
  const material = profile.material || {};

  return {
    artwork: {
      roughness: material.artwork?.roughness ?? 0.9,
      metalness: material.artwork?.metalness ?? 0.0,
      emissiveBoost: material.artwork?.emissiveBoost ?? 0.0,
    },
    paper: {
      roughness: material.paper?.roughness ?? 0.95,
      metalness: material.paper?.metalness ?? 0.0,
    },
    mat: {
      roughness: material.mat?.roughness ?? 0.94,
      metalness: material.mat?.metalness ?? 0.0,
    },
    frame: {
      roughness: material.frame?.roughness ?? 0.82,
      metalness: material.frame?.metalness ?? 0.02,
    },
  };
}
