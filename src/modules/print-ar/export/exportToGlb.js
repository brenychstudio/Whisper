import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildExportSceneGroup } from "../../../features/print-ar-host/export/buildExportSceneGroup.js";
import { sanitizeVariantId } from "../buildPrintArAssetKey.js";

function exportGroupToBinary(group) {
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
          return;
        }

        reject(new Error("GLB export did not return an ArrayBuffer."));
      },
      (error) => {
        reject(error instanceof Error ? error : new Error("GLB export failed."));
      },
      {
        binary: true,
        maxTextureSize: 4096,
        onlyVisible: true,
      },
    );
  });
}

export async function exportToGlb(payload) {
  const { group, dispose } = await buildExportSceneGroup(payload, {
    exportTarget: "glb",
  });

  try {
    const arrayBuffer = await exportGroupToBinary(group);
    const blob = new Blob([arrayBuffer], {
      type: "model/gltf-binary",
    });
    const fileName = `${sanitizeVariantId(payload?.variantId || "print-preview")}.glb`;
    const objectUrl = URL.createObjectURL(blob);

    return {
      format: "glb",
      fileName,
      blob,
      objectUrl,
      sizeBytes: blob.size,
    };
  } finally {
    dispose();
  }
}

export const exportPrintSceneToGlb = exportToGlb;
