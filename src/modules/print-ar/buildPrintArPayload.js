import { buildPrintArAssetKey } from "./buildPrintArAssetKey.js";
import { FRAME_PRESETS } from "./framePresets.js";
import {
  getExpectedHostedGlbPath,
  getExpectedHostedUsdzPath,
  getHostedArAssetRecord,
} from "./hostedAssets.js";
import { normalizeFramePreset } from "./normalizeFramePreset.js";

const DEFAULT_ARTIST = "Concept2048";

const DEFAULT_MAT_BY_SIZE = {
  "30x40": {
    style: "Warm white",
    topMm: 28,
    rightMm: 28,
    bottomMm: 36,
    leftMm: 28,
  },
  "40x30": {
    style: "Warm white",
    topMm: 28,
    rightMm: 28,
    bottomMm: 36,
    leftMm: 28,
  },
  "50x70": {
    style: "Warm white",
    topMm: 36,
    rightMm: 34,
    bottomMm: 46,
    leftMm: 34,
  },
  "70x50": {
    style: "Warm white",
    topMm: 34,
    rightMm: 36,
    bottomMm: 44,
    leftMm: 36,
  },
  "70x100": {
    style: "Warm white",
    topMm: 44,
    rightMm: 40,
    bottomMm: 56,
    leftMm: 40,
  },
  "100x70": {
    style: "Warm white",
    topMm: 40,
    rightMm: 44,
    bottomMm: 54,
    leftMm: 44,
  },
};

const PAPER_BORDER_PRESETS = {
  "30x40": { topMm: 12, rightMm: 12, bottomMm: 18, leftMm: 12 },
  "40x30": { topMm: 12, rightMm: 12, bottomMm: 18, leftMm: 12 },
  "50x70": { topMm: 16, rightMm: 16, bottomMm: 24, leftMm: 16 },
  "70x50": { topMm: 16, rightMm: 16, bottomMm: 24, leftMm: 16 },
  "70x100": { topMm: 20, rightMm: 20, bottomMm: 30, leftMm: 20 },
  "100x70": { topMm: 20, rightMm: 20, bottomMm: 30, leftMm: 20 },
};

const IMAGE_META_CACHE = new Map();

function normalizeSizeKey(value) {
  return String(value || "")
    .trim()
    .replace(/×/g, "x")
    .replace(/\s+/g, "");
}

function parseSizeToMm(value) {
  const normalized = normalizeSizeKey(value);
  const match = normalized.match(/^(\d+)x(\d+)$/i);

  if (!match) {
    return {
      key: "50x70",
      label: "50×70",
      widthMm: 500,
      heightMm: 700,
    };
  }

  const widthCm = Number(match[1]);
  const heightCm = Number(match[2]);

  return {
    key: `${widthCm}x${heightCm}`,
    label: `${widthCm}×${heightCm}`,
    widthMm: widthCm * 10,
    heightMm: heightCm * 10,
  };
}

function loadImageMeta(url) {
  if (!url) {
    return Promise.resolve({
      width: 1,
      height: 1,
      aspectRatio: 1,
      orientation: "portrait",
    });
  }

  const cacheKey = String(url);
  const cached = IMAGE_META_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const loadPromise = new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || 1;
      const height = img.naturalHeight || 1;

      resolve({
        width,
        height,
        aspectRatio: width / height,
        orientation: width >= height ? "landscape" : "portrait",
      });
    };

    img.onerror = () => {
      resolve({
        width: 1,
        height: 1,
        aspectRatio: 1,
        orientation: "portrait",
      });
    };

    img.src = cacheKey;
  });

  IMAGE_META_CACHE.set(cacheKey, loadPromise);
  return loadPromise;
}

function orientSizeByArtwork(parsed, orientation) {
  const isLandscapeArtwork = orientation === "landscape";
  const isLandscapeSize = parsed.widthMm >= parsed.heightMm;

  if (isLandscapeArtwork === isLandscapeSize) {
    return parsed;
  }

  return {
    key: `${parsed.heightMm / 10}x${parsed.widthMm / 10}`,
    label: `${parsed.heightMm / 10}×${parsed.widthMm / 10}`,
    widthMm: parsed.heightMm,
    heightMm: parsed.widthMm,
  };
}

function fitArtworkIntoPaper(paperWidthMm, paperHeightMm, imageAspectRatio, sizeKey) {
  const preset = PAPER_BORDER_PRESETS[sizeKey] ?? {
    topMm: 16,
    rightMm: 16,
    bottomMm: 24,
    leftMm: 16,
  };

  const innerWidthMm = Math.max(
    paperWidthMm - preset.leftMm - preset.rightMm,
    40,
  );
  const innerHeightMm = Math.max(
    paperHeightMm - preset.topMm - preset.bottomMm,
    40,
  );

  let imageWidthMm = innerWidthMm;
  let imageHeightMm = imageWidthMm / imageAspectRatio;

  if (imageHeightMm > innerHeightMm) {
    imageHeightMm = innerHeightMm;
    imageWidthMm = imageHeightMm * imageAspectRatio;
  }

  const extraX = Math.max(innerWidthMm - imageWidthMm, 0);
  const extraY = Math.max(innerHeightMm - imageHeightMm, 0);

  const leftMm = preset.leftMm + extraX / 2;
  const rightMm = preset.rightMm + extraX / 2;

  const topWeight = 0.42;
  const bottomWeight = 0.58;

  const topMm = preset.topMm + extraY * topWeight;
  const bottomMm = preset.bottomMm + extraY * bottomWeight;

  return {
    imageArea: {
      widthMm: imageWidthMm,
      heightMm: imageHeightMm,
      offsetXMm: 0,
      offsetYMm: (bottomMm - topMm) / 2,
    },
    printBorder: {
      topMm,
      rightMm,
      bottomMm,
      leftMm,
    },
  };
}

function buildOuterSize(paperWidthMm, paperHeightMm, frame, mat) {
  const frameInsetX = frame ? frame.widthMm * 2 : 0;
  const frameInsetY = frame ? frame.widthMm * 2 : 0;
  const matInsetX = mat ? mat.leftMm + mat.rightMm : 0;
  const matInsetY = mat ? mat.topMm + mat.bottomMm : 0;

  return {
    widthMm: paperWidthMm + frameInsetX + matInsetX,
    heightMm: paperHeightMm + frameInsetY + matInsetY,
  };
}

function buildFrameFromPreset(framePresetId) {
  const preset = normalizeFramePreset(framePresetId);

  return {
    id: preset.id,
    style: preset.style,
    label: preset.label,
    uiLabel: preset.uiLabel,
    materialMode: preset.materialMode,
    geometryPresetId: preset.geometryPresetId,
    materialPresetId: preset.materialPresetId,
    geometry: preset.geometry,
    material: preset.material,
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    profileWidthMm: preset.profileWidthMm,
    profileDepthMm: preset.profileDepthMm,
    outerDepthMm: preset.outerDepthMm,
    frontFaceWidthMm: preset.frontFaceWidthMm,
    sideDepthMm: preset.sideDepthMm,
    outerBevelMm: preset.outerBevelMm,
    innerBevelMm: preset.innerBevelMm,
    bevelSoftness: preset.bevelSoftness,
    profileMode: preset.profileMode,
    colorHex: preset.colorHex,
    faceColorHex: preset.faceColorHex,
    sideColorHex: preset.sideColorHex,
    roughness: preset.roughness,
    sideRoughness: preset.sideRoughness,
    metalness: preset.metalness,
    sideMetalness: preset.sideMetalness,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: preset.clearcoatRoughness,
    grainHint: preset.grainHint,
    notes: preset.notes,
  };
}

function buildFramePresetOptions() {
  return FRAME_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    uiLabel: preset.uiLabel,
    materialMode: preset.materialMode,
    materialPresetId: preset.materialPresetId,
    geometryPresetId: preset.geometryPresetId,
  }));
}

function buildHostedVariantState({
  assetKey,
  productImageUrl,
}) {
  const hostedRecord = getHostedArAssetRecord(assetKey);
  const manifestStatus = hostedRecord?.status || "missing";
  const plannedWebGlbPath = getExpectedHostedGlbPath(assetKey);
  const plannedSceneViewerPath = plannedWebGlbPath;
  const plannedQuickLookPath = getExpectedHostedUsdzPath(assetKey);
  const plannedGlbFileName = plannedWebGlbPath.split("/").pop() || `${assetKey}.glb`;
  const plannedUsdzFileName = plannedQuickLookPath.split("/").pop() || `${assetKey}.usdz`;
  const platform = hostedRecord?.platform || {
    android: {
      enabled: false,
      scaleMode: "fixed",
    },
    ios: {
      enabled: false,
      quickLookMode: "ar",
    },
  };

  const customerPreview = {
    androidReady:
      manifestStatus === "ready" &&
      Boolean(platform?.android?.enabled) &&
      Boolean(hostedRecord?.glbUrl),
    iosReady:
      manifestStatus === "ready" &&
      Boolean(platform?.ios?.enabled) &&
      Boolean(hostedRecord?.iosSrc),
  };
  customerPreview.previewStatus = customerPreview.androidReady
    ? "ready"
    : customerPreview.iosReady
      ? "partial"
      : "unavailable";
  customerPreview.visualMode = "interactive-3d";

  return {
    manifestStatus,
    hostedRecord,
    platform,
    customerPreview,
    assets: {
      glbUrl: hostedRecord?.glbUrl || null,
      iosSrc: hostedRecord?.iosSrc || null,
      posterUrl: productImageUrl || "",
      platform,
    },
    bridgeAssets: {
      status: manifestStatus,
      manifestStatus,
      manifestDeclared: Boolean(hostedRecord),
      manifestRecord: hostedRecord,
      platform,
      attached: {
        glbUrl: hostedRecord?.glbUrl || null,
        iosSrc: hostedRecord?.iosSrc || null,
      },
      planned: {
        webGlbPath: plannedWebGlbPath,
        webGlbFileName: plannedGlbFileName,
        sceneViewerGlbPath: plannedSceneViewerPath,
        quickLookUsdzPath: plannedQuickLookPath,
        quickLookUsdzFileName: plannedUsdzFileName,
      },
      note: hostedRecord?.meta?.note || "",
      customerPreview,
    },
  };
}

function resolvePayloadSizeKey(payload) {
  const sourceKey = String(payload?.sourceMeta?.sizeKey || "").trim();
  if (sourceKey) return sourceKey;

  const widthCm = Math.round((Number(payload?.print?.widthMm) || 0) / 10);
  const heightCm = Math.round((Number(payload?.print?.heightMm) || 0) / 10);
  return `${widthCm}x${heightCm}`;
}

export function applyFramePresetToPayload(payload, framePresetId) {
  if (!payload) return payload;

  const frame = buildFrameFromPreset(framePresetId);
  const sizeKey = resolvePayloadSizeKey(payload);
  const assetKey = buildPrintArAssetKey({
    printId: payload.productId,
    sizeKey,
    frameKey: `${frame.id}-frame`,
    matKey: "warm-white-mat",
  });

  const outerSize = buildOuterSize(
    payload?.print?.widthMm,
    payload?.print?.heightMm,
    frame,
    payload?.mat,
  );

  const hostedState = buildHostedVariantState({
    assetKey,
    productImageUrl: payload?.artwork?.imageUrl || payload?.assets?.posterUrl || "",
  });

  return {
    ...payload,
    variantId: assetKey,
    assetKey,
    frame,
    outerSize,
    assets: hostedState.assets,
    bridgeAssets: hostedState.bridgeAssets,
    customerPreview: hostedState.customerPreview,
    framePresetOptions: payload.framePresetOptions || buildFramePresetOptions(),
    sourceMeta: {
      ...payload.sourceMeta,
      sizeKey,
      framePresetId: frame.id,
    },
  };
}

export async function buildPrintArPayload({
  print,
  size,
  shareUrl,
  framePresetId = "black",
}) {
  const parsed = parseSizeToMm(size?.label || size?.key || "50×70");
  const imageMeta = await loadImageMeta(print?.image);
  const oriented = orientSizeByArtwork(parsed, imageMeta.orientation);

  const frame = buildFrameFromPreset(framePresetId);
  const mat = DEFAULT_MAT_BY_SIZE[oriented.key] ?? {
    style: "Warm white",
    topMm: 34,
    rightMm: 34,
    bottomMm: 44,
    leftMm: 34,
  };

  const fitted = fitArtworkIntoPaper(
    oriented.widthMm,
    oriented.heightMm,
    imageMeta.aspectRatio,
    oriented.key,
  );

  const outerSize = buildOuterSize(
    oriented.widthMm,
    oriented.heightMm,
    frame,
    mat,
  );

  const assetKey = buildPrintArAssetKey({
    printId: print.id,
    sizeKey: oriented.key,
    frameKey: `${frame.id}-frame`,
    matKey: "warm-white-mat",
  });
  const hostedState = buildHostedVariantState({
    assetKey,
    productImageUrl: print.image,
  });

  return {
    productId: print.id,
    variantId: assetKey,
    assetKey,
    title: print.title,
    artist: DEFAULT_ARTIST,
    locale: "en",
    currency: "EUR",
    price: size?.price ?? print.priceFrom ?? null,
    artwork: {
      imageUrl: print.image,
      aspectRatio: imageMeta.aspectRatio,
    },
    print: {
      widthMm: oriented.widthMm,
      heightMm: oriented.heightMm,
    },
    imageArea: fitted.imageArea,
    printBorder: fitted.printBorder,
    frame,
    mat,
    outerSize,
    assets: hostedState.assets,
    bridgeAssets: hostedState.bridgeAssets,
    customerPreview: hostedState.customerPreview,
    framePresetOptions: buildFramePresetOptions(),
    androidAr: {
      scaleMode: "true-scale",
      allowAdjustableScale: true,
      verticalPlacement: true,
    },
    cta: {
      label: print.buyUrl ? "Purchase" : "Request purchase",
      url: print.buyUrl || shareUrl || "",
    },
    sourceMeta: {
      series: print.series || "",
      edition: print.edition || "",
      paper: print.paper || "",
      shareUrl: shareUrl || "",
      artworkOrientation: imageMeta.orientation,
      imageWidth: imageMeta.width,
      imageHeight: imageMeta.height,
      sizeKey: oriented.key,
      framePresetId: frame.id,
    },
    preview: {
      visualMode: "interactive-3d",
      interactionIntent: "customer-premium",
    },
  };
}

export const buildSitePrintPreviewPayload = buildPrintArPayload;
