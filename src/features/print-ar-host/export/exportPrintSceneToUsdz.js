import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { buildExportSceneGroup } from "./buildExportSceneGroup.js";
import { optimizeUsdTextures } from "./optimizeUsdTextures.js";
import { resolveIosExportProfile } from "./iosExportProfile.js";
import { getIosMaterialPreset } from "./getIosMaterialPreset.js";
import { buildIosQuickLookScene } from "./buildIosQuickLookScene.js";

const HEAVY_USDZ_BYTES = 10 * 1024 * 1024;
const HARD_LIMIT_USDZ_BYTES = 16 * 1024 * 1024;

function sanitizeVariantId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();
}

function normalizeExportResult(result) {
  if (result instanceof ArrayBuffer) {
    return result;
  }

  if (ArrayBuffer.isView(result)) {
    return result.buffer.slice(
      result.byteOffset,
      result.byteOffset + result.byteLength,
    );
  }

  throw new Error("USDZ export did not return binary data.");
}

function getSizeTier(sizeBytes) {
  if (!Number.isFinite(sizeBytes)) return "unknown";
  if (sizeBytes > HARD_LIMIT_USDZ_BYTES) return "hard-limit-risk";
  if (sizeBytes > HEAVY_USDZ_BYTES) return "heavy";
  return "ok";
}

export async function exportPrintSceneToUsdz(payload, options = {}) {
  const exportProfile = resolveIosExportProfile(options.mode);
  const materialPreset = getIosMaterialPreset(exportProfile.mode);
  const optimization = await optimizeUsdTextures({
    imageUrl: payload?.artwork?.imageUrl,
    mode: exportProfile.mode,
  });

  const { group, dispose } = await buildExportSceneGroup(payload, {
    exportTarget: "ios",
    artworkTextureSource: optimization.textureSource,
    materialPreset,
  });

  const quickLookScene = buildIosQuickLookScene(group, {
    freezeTransforms: exportProfile.sceneBake?.freezeRootTransforms !== false,
    pivotStrategy: exportProfile.pivot?.strategy || "framed-center",
    initialTransformPreset: exportProfile.initialTransform?.preset || "balanced",
    materialPreset,
  });
  quickLookScene.scene.updateMatrixWorld(true);

  const exporter = new USDZExporter();

  try {
    const binary = normalizeExportResult(
      await exporter.parseAsync(quickLookScene.scene, {
        quickLookCompatible: exportProfile.quickLookCompatible,
        includeAnchoringProperties: exportProfile.includeAnchoringProperties,
        ar: {
          anchoring: { type: exportProfile.anchoring?.type || "plane" },
          planeAnchoring: { alignment: exportProfile.anchoring?.alignment || "vertical" },
        },
        onlyVisible: true,
        maxTextureSize: exportProfile.texture?.maxDimension || 1536,
      }),
    );

    const blob = new Blob([binary], {
      type: "model/vnd.usdz+zip",
    });

    const fileName = `${sanitizeVariantId(payload?.variantId || "print-preview")}.usdz`;
    const objectUrl = URL.createObjectURL(blob);
    const sizeTier = getSizeTier(blob.size);
    const qualityWarnings = [
      ...(optimization.summary?.warnings || []),
      ...(sizeTier === "heavy" ? ["Generated USDZ is heavy for quick mobile loading."] : []),
      ...(sizeTier === "hard-limit-risk" ? ["Generated USDZ may be too heavy for comfortable Quick Look retests."] : []),
      ...(exportProfile.experimentMode?.enabled
        ? [
            "Wall-first experiment is enabled. Native Quick Look behavior may still vary despite stronger pre-rotation.",
          ]
        : []),
    ];

    return {
      format: "usdz",
      fileName,
      blob,
      objectUrl,
      sizeBytes: blob.size,
      sizeTier,
      exportProfileUsed: {
        mode: exportProfile.mode,
        label: exportProfile.label,
        quickLookCompatible: exportProfile.quickLookCompatible,
        textureMaxDimension: exportProfile.texture?.maxDimension || 1536,
        preferredEncoding: exportProfile.texture?.preferredEncoding || "jpeg",
        interactionIntent: exportProfile.interactionIntent || "wall-art-preview",
        orientationBias: exportProfile.orientationBias?.target || "wall-first",
        experimentMode: exportProfile.experimentMode?.enabled === true,
      },
      textureOptimization: optimization.summary,
      textureStrategy: optimization.summary?.outputStrategy || "source-url",
      anchoringUsed: {
        type: exportProfile.anchoring?.type || "plane",
        alignment: exportProfile.anchoring?.alignment || "vertical",
      },
      scenePrep: quickLookScene.metrics,
      initialTransform: quickLookScene.initialTransform,
      pivotNormalization: quickLookScene.pivotNormalization,
      wallPlacement: quickLookScene.wallPlacement,
      wallFirstExperimentEnabled: exportProfile.experimentMode?.enabled === true,
      qualityWarnings,
      qualityNotes: exportProfile.qualityNotes || [],
    };
  } finally {
    optimization.dispose();
    dispose();
  }
}
