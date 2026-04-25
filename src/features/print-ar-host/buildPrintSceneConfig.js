// Runtime dependency kept in features/ for stability. Canonical frame preset ownership lives in src/modules/print-ar/.
import { getFrameGeometryPreset } from "../../modules/print-ar/getFrameGeometryPreset.js";
import { getFrameMaterialPreset } from "../../modules/print-ar/getFrameMaterialPreset.js";

function resolveMatColor(style) {
  const value = String(style || "").toLowerCase();

  if (value.includes("warm")) return "#ece6dc";
  if (value.includes("white")) return "#f1ede6";
  if (value.includes("black")) return "#232428";

  return "#ece6dc";
}

export function buildPrintSceneConfig(payload) {
  const paperWidthMm = payload?.print?.widthMm ?? 500;
  const paperHeightMm = payload?.print?.heightMm ?? 700;
  const frameGeometry = getFrameGeometryPreset(
    payload?.frame?.geometryPresetId ||
      payload?.frame?.geometry?.id ||
      "premium-gallery",
  );
  const frameMaterial = getFrameMaterialPreset(
    payload?.frame?.materialPresetId ||
      payload?.frame?.material?.id ||
      payload?.frame?.materialMode ||
      "matte-black",
  );

  const borderTopMm = payload?.printBorder?.topMm ?? 16;
  const borderRightMm = payload?.printBorder?.rightMm ?? 16;
  const borderBottomMm = payload?.printBorder?.bottomMm ?? 24;
  const borderLeftMm = payload?.printBorder?.leftMm ?? 16;

  const imageWidthMm =
    payload?.imageArea?.widthMm ??
    Math.max(paperWidthMm - borderLeftMm - borderRightMm, 40);

  const imageHeightMm =
    payload?.imageArea?.heightMm ??
    Math.max(paperHeightMm - borderTopMm - borderBottomMm, 40);

  const imageOffsetXMm =
    payload?.imageArea?.offsetXMm ?? ((borderLeftMm - borderRightMm) / 2);

  const imageOffsetYMm =
    payload?.imageArea?.offsetYMm ?? ((borderBottomMm - borderTopMm) / 2);

  const matOuterWidthMm =
    paperWidthMm + ((payload?.mat?.leftMm ?? 0) + (payload?.mat?.rightMm ?? 0));

  const matOuterHeightMm =
    paperHeightMm + ((payload?.mat?.topMm ?? 0) + (payload?.mat?.bottomMm ?? 0));

  return {
    paper: {
      widthMm: paperWidthMm,
      heightMm: paperHeightMm,
      depthMm: 1.2,
      color: "#f3efe8",
      border: {
        topMm: borderTopMm,
        rightMm: borderRightMm,
        bottomMm: borderBottomMm,
        leftMm: borderLeftMm,
      },
    },
    artwork: {
      widthMm: imageWidthMm,
      heightMm: imageHeightMm,
      depthMm: 0.6,
      imageUrl: payload?.artwork?.imageUrl ?? "",
      offsetXMm: imageOffsetXMm,
      offsetYMm: imageOffsetYMm,
    },
    mat: {
      enabled: Boolean(payload?.mat),
      outerWidthMm: matOuterWidthMm,
      outerHeightMm: matOuterHeightMm,
      depthMm: payload?.mat ? 1.4 : 0,
      color: resolveMatColor(payload?.mat?.style),
    },
    frame: {
      enabled: Boolean(payload?.frame),
      id: payload?.frame?.id || "black",
      label: payload?.frame?.label || payload?.frame?.style || "Matte black",
      materialMode: payload?.frame?.materialMode || "matte-black",
      geometryPresetId: frameGeometry.id,
      materialPresetId: frameMaterial.id,
      outerWidthMm: payload?.outerSize?.widthMm ?? 620,
      outerHeightMm: payload?.outerSize?.heightMm ?? 860,
      profileWidthMm: payload?.frame?.widthMm ?? frameGeometry.profileWidthMm,
      profileDepthMm: payload?.frame?.depthMm ?? frameGeometry.outerDepthMm,
      outerDepthMm: frameGeometry.outerDepthMm,
      frontFaceWidthMm: frameGeometry.frontFaceWidthMm,
      sideDepthMm: frameGeometry.sideDepthMm,
      outerBevelMm: frameGeometry.outerBevelMm,
      innerBevelMm: frameGeometry.innerBevelMm,
      bevelSoftness: frameGeometry.bevelSoftness,
      innerLipInsetMm: frameGeometry.innerLipInsetMm,
      innerLipWidthMm: frameGeometry.innerLipWidthMm,
      innerLipDepthMm: frameGeometry.innerLipDepthMm,
      profileMode: frameGeometry.profileMode,
      geometry: frameGeometry,
      material: frameMaterial,
      color: payload?.frame?.colorHex || frameMaterial.faceColorHex,
      faceColor: payload?.frame?.faceColorHex || frameMaterial.faceColorHex,
      sideColor: payload?.frame?.sideColorHex || frameMaterial.sideColorHex,
      roughness: payload?.frame?.roughness ?? frameMaterial.roughness,
      sideRoughness: payload?.frame?.sideRoughness ?? frameMaterial.sideRoughness,
      metalness: payload?.frame?.metalness ?? frameMaterial.metalness,
      sideMetalness: payload?.frame?.sideMetalness ?? frameMaterial.metalness,
      clearcoat: payload?.frame?.clearcoat ?? frameMaterial.clearcoat,
      clearcoatRoughness:
        payload?.frame?.clearcoatRoughness ?? frameMaterial.clearcoatRoughness,
      grainHint: payload?.frame?.grainHint || frameMaterial.grainHint,
    },
    assembly: {
      outerWidthMm: payload?.outerSize?.widthMm ?? 620,
      outerHeightMm: payload?.outerSize?.heightMm ?? 860,
      totalDepthMm: payload?.frame?.depthMm ?? 28,
      wallOffsetMm: 4,
    },
    appearance: {
      preview: {
        rendererToneMapping: "neutral",
        rendererExposure: 1,
        ambientIntensity: 0.9,
        keyIntensity: 0.68,
        fillIntensity: 0.14,
        rimIntensity: 0.06,
        useArtworkUnlit: true,
        backgroundColor: "#0f141d",
        wallColor: "#1a2130",
        wallOpacity: 0.42,
      },
      interactivePreview: {
        useArtworkUnlit: true,
        lightingIntent: "calm-premium",
        idleMotionIntent: "subtle-float",
        backgroundColor: "#0e131b",
        wallColor: "#1a2130",
        wallOpacity: 0.38,
        frameContrastBoost: 0.04,
      },
      export: {
        useArtworkUnlit: true,
      },
    },
    exportHints: {
      preferredUpAxis: "Y",
      preferredFrontAxis: "Z+",
      preferredWallNormal: "Z-",
      centerAtOrigin: true,
      pivotStrategy: "framed-center",
      wallPlacementIntent: "wall-first",
    },
  };
}
