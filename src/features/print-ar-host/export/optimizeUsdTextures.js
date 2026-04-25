import {
  DEFAULT_IOS_EXPORT_MODE,
  resolveIosExportProfile,
} from "./iosExportProfile.js";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("No artwork image URL available for USDZ export."));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Artwork image could not be loaded for USDZ export."));
    image.src = url;
  });
}

function toQualityTier(width, height) {
  const pixels = width * height;
  if (pixels <= 1024 * 1024) return "light";
  if (pixels <= 2048 * 2048) return "balanced";
  return "heavy";
}

function estimateBytes(width, height, encoding, quality) {
  const pixels = width * height;
  if (encoding === "jpeg") {
    const q = Math.min(Math.max(Number(quality) || 0.85, 0.5), 0.95);
    return Math.round(pixels * (0.6 - q * 0.25));
  }
  return Math.round(pixels * 3.2);
}

function computeTargetSize(width, height, maxDimension) {
  const longest = Math.max(width, height);
  if (!longest || longest <= maxDimension) {
    return { width, height, scaled: false };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function renderFlattenedArtwork(image, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function chooseOutput(canvas, strategy, quality) {
  if (strategy.preferredEncoding === "jpeg") {
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/jpeg")) {
        return {
          textureSource: dataUrl,
          outputStrategy: "scaled-jpeg-data-url",
          encoding: "jpeg",
        };
      }
    } catch {
      // fallback to canvas below
    }
  }

  return {
    textureSource: canvas,
    outputStrategy: "scaled-canvas",
    encoding: "png",
  };
}

export async function optimizeUsdTextures(input = {}) {
  const imageUrl = String(input.imageUrl || "").trim();
  const mode = String(input.mode || DEFAULT_IOS_EXPORT_MODE).trim().toLowerCase();
  const profile = resolveIosExportProfile(mode);
  const strategy = profile.texture || {};
  const image = await loadImage(imageUrl);

  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const target = computeTargetSize(
    sourceWidth,
    sourceHeight,
    strategy.maxDimension || 1536,
  );

  const shouldFlatten = strategy.flattenAlpha !== false;
  const flattened = shouldFlatten;
  const workingCanvas = renderFlattenedArtwork(image, target.width, target.height);

  if (!workingCanvas) {
    const estimatedBytes = estimateBytes(
      sourceWidth,
      sourceHeight,
      "png",
      1,
    );
    return {
      textureSource: imageUrl,
      exportProfileUsed: profile,
      summary: {
        applied: false,
        sourceWidth,
        sourceHeight,
        outputWidth: sourceWidth,
        outputHeight: sourceHeight,
        outputStrategy: "source-url",
        preferredEncoding: strategy.preferredEncoding || "jpeg",
        flattened,
        qualityTier: toQualityTier(sourceWidth, sourceHeight),
        estimatedBytes,
        warnings: ["Canvas optimization unavailable; using source image URL."],
      },
      dispose() {},
    };
  }

  const output = chooseOutput(
    workingCanvas,
    strategy,
    Number(strategy.jpegQuality) || 0.86,
  );

  const estimatedBytes = estimateBytes(
    target.width,
    target.height,
    output.encoding,
    Number(strategy.jpegQuality) || 0.86,
  );
  const qualityTier = toQualityTier(target.width, target.height);

  const warnings = [];
  if (target.scaled) warnings.push("Artwork texture scaled down for Quick Look.");
  if (qualityTier === "heavy") warnings.push("iOS texture may still be heavy for older devices.");

  return {
    textureSource: output.textureSource,
    exportProfileUsed: profile,
    summary: {
      applied: target.scaled || output.outputStrategy !== "source-url",
      sourceWidth,
      sourceHeight,
      outputWidth: target.width,
      outputHeight: target.height,
      outputStrategy: output.outputStrategy,
      preferredEncoding: output.encoding,
      flattened,
      qualityTier,
      estimatedBytes,
      warnings,
    },
    dispose() {
      workingCanvas.width = 1;
      workingCanvas.height = 1;
    },
  };
}
