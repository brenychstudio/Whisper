import { getFramePresetById } from "./getFramePresetById.js";
import { getFrameGeometryPreset } from "./getFrameGeometryPreset.js";
import { getFrameMaterialPreset } from "./getFrameMaterialPreset.js";

export function normalizeFramePreset(framePresetId) {
  const preset = getFramePresetById(framePresetId);
  const geometryPreset = getFrameGeometryPreset(
    preset.geometryPresetId || "premium-gallery",
  );
  const materialPreset = getFrameMaterialPreset(
    preset.materialPresetId || preset.materialMode,
  );

  return {
    id: preset.id,
    label: preset.label,
    uiLabel: preset.uiLabel,
    materialMode: preset.materialMode,
    assetKeyToken: preset.assetKeyToken,
    style: preset.style,
    geometryPresetId: geometryPreset.id,
    materialPresetId: materialPreset.id,
    geometry: geometryPreset,
    material: materialPreset,
    widthMm: geometryPreset.profileWidthMm,
    depthMm: geometryPreset.outerDepthMm,
    profileWidthMm: geometryPreset.profileWidthMm,
    profileDepthMm: geometryPreset.outerDepthMm,
    outerDepthMm: geometryPreset.outerDepthMm,
    frontFaceWidthMm: geometryPreset.frontFaceWidthMm,
    sideDepthMm: geometryPreset.sideDepthMm,
    outerBevelMm: geometryPreset.outerBevelMm,
    innerBevelMm: geometryPreset.innerBevelMm,
    bevelSoftness: geometryPreset.bevelSoftness,
    profileMode: geometryPreset.profileMode,
    colorHex: materialPreset.faceColorHex,
    faceColorHex: materialPreset.faceColorHex,
    sideColorHex: materialPreset.sideColorHex,
    roughness: materialPreset.roughness,
    sideRoughness: materialPreset.sideRoughness,
    metalness: materialPreset.metalness,
    sideMetalness: materialPreset.metalness,
    clearcoat: materialPreset.clearcoat,
    clearcoatRoughness: materialPreset.clearcoatRoughness,
    grainHint: materialPreset.grainHint,
    notes: preset.notes,
  };
}
