// src/integrations/print-ar-preview/buildWhisperPrintArPayload.js
import { buildPrintArPayload } from "../../modules/print-ar/buildPrintArPayload.js";

function normalizeToneId(value = "warm-white") {
  const raw = String(value || "warm-white").trim().toLowerCase().replace(/_/g, "-");

  if (raw === "warmwhite") return "warm-white";
  if (["black", "white", "ivory", "warm-white"].includes(raw)) return raw;

  return "warm-white";
}

function resolvePaperColor(toneId) {
  const normalized = normalizeToneId(toneId);

  if (normalized === "black") return "#111111";
  if (normalized === "white") return "#f7f7f4";
  if (normalized === "ivory") return "#efe6d3";

  return "#f4efe6";
}

function parseSizeMm(sizeObj) {
  const label = String(sizeObj?.label || sizeObj?.size || sizeObj?.name || "").toLowerCase();

  const match = label.match(/(\d+(?:\.\d+)?)\s*(?:cm)?\s*(?:x|\u00D7)\s*(\d+(?:\.\d+)?)/i);
  if (!match) {
    return {
      widthMm: 700,
      heightMm: 500,
      sizeKey: "70x50",
    };
  }

  const a = Number(match[1]);
  const b = Number(match[2]);

  const widthCm = Math.max(a, b);
  const heightCm = Math.min(a, b);

  return {
    widthMm: Math.round(widthCm * 10),
    heightMm: Math.round(heightCm * 10),
    sizeKey: `${Math.round(widthCm)}x${Math.round(heightCm)}`,
  };
}

function resolveSourceDimensions(print) {
  return {
    widthPx:
      print?.sourceWidthPx ||
      print?.widthPx ||
      print?.imageWidth ||
      print?.media?.width ||
      1600,
    heightPx:
      print?.sourceHeightPx ||
      print?.heightPx ||
      print?.imageHeight ||
      print?.media?.height ||
      1100,
  };
}

function resolveImageUrl(print) {
  return (
    print?.src ||
    print?.image ||
    print?.imageUrl ||
    print?.thumb ||
    print?.cover ||
    print?.media?.src ||
    ""
  );
}

function resolveEffectiveMarginsMm(sizeObj) {
  const border = sizeObj?.border || sizeObj?.margins || sizeObj?.visibleMarginsMm;

  if (border) {
    return {
      topMm: Number(border.topMm ?? border.top ?? 45),
      rightMm: Number(border.rightMm ?? border.right ?? 45),
      bottomMm: Number(border.bottomMm ?? border.bottom ?? 55),
      leftMm: Number(border.leftMm ?? border.left ?? 45),
    };
  }

  return {
    topMm: 45,
    rightMm: 45,
    bottomMm: 55,
    leftMm: 45,
  };
}

function resolveContainedArtworkArea({
  paperWidthMm,
  paperHeightMm,
  margins,
  sourceWidthPx,
  sourceHeightPx,
}) {
  const openingWidth = Math.max(1, paperWidthMm - margins.leftMm - margins.rightMm);
  const openingHeight = Math.max(1, paperHeightMm - margins.topMm - margins.bottomMm);
  const sourceAspect = sourceWidthPx > 0 && sourceHeightPx > 0 ? sourceWidthPx / sourceHeightPx : 1;

  let artworkWidth = openingWidth;
  let artworkHeight = artworkWidth / sourceAspect;

  if (artworkHeight > openingHeight) {
    artworkHeight = openingHeight;
    artworkWidth = artworkHeight * sourceAspect;
  }

  const offsetXMm = (margins.leftMm - margins.rightMm) / 2;
  const offsetYMm = (margins.bottomMm - margins.topMm) / 2;

  return {
    widthMm: artworkWidth,
    heightMm: artworkHeight,
    offsetXMm,
    offsetYMm,
  };
}

function resolveFramePreset(framePresetId = "black") {
  const normalized = String(framePresetId || "black").toLowerCase();

  if (normalized === "white") {
    return {
      presetId: "white",
      material: "matte-white",
      color: "#e8e5df",
      profileWidthMm: 22,
      depthMm: 30,
    };
  }

  if (normalized === "oak") {
    return {
      presetId: "oak",
      material: "natural-oak",
      color: "#9b7a52",
      profileWidthMm: 24,
      depthMm: 32,
    };
  }

  return {
    presetId: "black",
    material: "matte-black",
    color: "#111214",
    profileWidthMm: 22,
    depthMm: 30,
  };
}

function buildStableAssetKey({ print, sizeKey, framePresetId, toneId }) {
  const printId = print?.id || print?.slug || "print";
  const tone = normalizeToneId(toneId);

  return `${printId}-${sizeKey}-${framePresetId}-frame-${tone}-mat`;
}

export async function buildWhisperPrintArPayload({
  print,
  size,
  shareUrl,
  framePresetId = "black",
  paperToneId = "warm-white",
}) {
  const paper = parseSizeMm(size);
  const source = resolveSourceDimensions(print);
  const imageUrl = resolveImageUrl(print);
  const margins = resolveEffectiveMarginsMm(size);
  const toneId = normalizeToneId(paperToneId);
  const paperColor = resolvePaperColor(toneId);
  const artworkArea = resolveContainedArtworkArea({
    paperWidthMm: paper.widthMm,
    paperHeightMm: paper.heightMm,
    margins,
    sourceWidthPx: source.widthPx,
    sourceHeightPx: source.heightPx,
  });
  const frame = resolveFramePreset(framePresetId);

  const assetKey = buildStableAssetKey({
    print,
    sizeKey: paper.sizeKey,
    framePresetId: frame.presetId,
    toneId,
  });

  const basePayload = await buildPrintArPayload({
    print: {
      ...print,
      id: print?.id || print?.slug,
      title: print?.title || "Untitled print",
      src: imageUrl,
      imageUrl,
      sourceWidthPx: source.widthPx,
      sourceHeightPx: source.heightPx,
    },
    size: {
      ...size,
      label: size?.label || paper.sizeKey,
      widthMm: paper.widthMm,
      heightMm: paper.heightMm,
      paperWidthMm: paper.widthMm,
      paperHeightMm: paper.heightMm,
      visibleMarginsMm: margins,
      effectiveMarginsMm: margins,
      artworkArea,
      paperToneId: toneId,
      paperColor,
    },
    shareUrl,
    framePresetId: frame.presetId,
  });

  return {
    ...basePayload,
    assetKey,
    variantIdentity: {
      assetKey,
      printId: print?.id || print?.slug,
      sizeKey: paper.sizeKey,
      framePresetId: frame.presetId,
      paperToneId: toneId,
    },
    sceneConfig: {
      id: assetKey,
      artwork: {
        imageUrl,
        widthPx: source.widthPx,
        heightPx: source.heightPx,
      },
      paper: {
        widthMm: paper.widthMm,
        heightMm: paper.heightMm,
        toneId,
        color: paperColor,
      },
      margins,
      artworkArea,
      frame: {
        presetId: frame.presetId,
        profileWidthMm: frame.profileWidthMm,
        depthMm: frame.depthMm,
        color: frame.color,
        material: frame.material,
      },
      mat: {
        enabled: false,
        color: paperColor,
        geometryMode: "none",
      },
    },
  };
}
