import * as THREE from "three";
// Runtime dependency kept in features/ for stability. Canonical scene config ownership stays with the module contract.
import { buildPrintSceneConfig } from "../buildPrintSceneConfig.js";

function isCanvasLike(source) {
  return (
    (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) ||
    (typeof OffscreenCanvas !== "undefined" && source instanceof OffscreenCanvas)
  );
}

function isBitmapLike(source) {
  return typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
}

function isImageLike(source) {
  return (
    (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) ||
    isBitmapLike(source)
  );
}

function loadTexture(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      resolve(null);
      return;
    }

    if (isCanvasLike(source)) {
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      resolve(texture);
      return;
    }

    if (isImageLike(source)) {
      const texture = new THREE.Texture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      resolve(texture);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      source,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      (error) => reject(error),
    );
  });
}

function track(disposables, resource) {
  if (resource?.dispose) {
    disposables.push(resource);
  }
  return resource;
}

function resolveMaterialPreset(options = {}) {
  const preset = options.materialPreset || {};
  const appearance = options.appearance || {};

  return {
    artwork: {
      roughness: preset.artwork?.roughness ?? 0.98,
      metalness: preset.artwork?.metalness ?? 0,
      unlit: preset.artwork?.unlit ?? appearance.useArtworkUnlit ?? true,
    },
    paper: {
      roughness: preset.paper?.roughness ?? 0.99,
      metalness: preset.paper?.metalness ?? 0,
    },
    mat: {
      roughness: preset.mat?.roughness ?? 0.99,
      metalness: preset.mat?.metalness ?? 0,
    },
    frame: {
      roughness: preset.frame?.roughness ?? 0.9,
      metalness: preset.frame?.metalness ?? 0.016,
      clearcoat: preset.frame?.clearcoat ?? 0.03,
      clearcoatRoughness: preset.frame?.clearcoatRoughness ?? 0.96,
    },
  };
}

function createFrameRailMesh({
  length,
  thickness,
  depth,
  orientation = "horizontal",
  faceMaterial,
  sideMaterial,
}) {
  const width = orientation === "horizontal" ? length : thickness;
  const height = orientation === "horizontal" ? thickness : length;

  const geometry = new THREE.BoxGeometry(width, height, depth);

  const materials = [
    sideMaterial, // +X
    sideMaterial, // -X
    sideMaterial, // +Y
    sideMaterial, // -Y
    faceMaterial, // +Z front
    sideMaterial, // -Z back
  ];

  const mesh = new THREE.Mesh(geometry, materials);
  return { mesh, geometry };
}

function mixHexColors(colorA, colorB, amount = 0.5) {
  const a = new THREE.Color(colorA);
  const b = new THREE.Color(colorB);
  return `#${a.lerp(b, amount).getHexString()}`;
}

export async function buildExportSceneGroup(payload, options = {}) {
  const config = buildPrintSceneConfig(payload);
  const textureSource = options.artworkTextureSource || config.artwork.imageUrl;
  const texture = await loadTexture(textureSource);
  const disposables = [];
  const materialPreset = resolveMaterialPreset({
    ...options,
    appearance: config.appearance?.export || {},
  });

  if (texture) {
    texture.flipY = options.textureFlipY ?? false;
    texture.needsUpdate = true;
    track(disposables, texture);
  }

  const group = new THREE.Group();
  group.name = payload?.variantId || "print-preview";

  const scale = 0.001;
  const frameOuterWidth = config.frame.outerWidthMm * scale;
  const frameOuterHeight = config.frame.outerHeightMm * scale;
  const matOuterWidth = config.mat.outerWidthMm * scale;
  const matOuterHeight = config.mat.outerHeightMm * scale;
  const paperWidth = config.paper.widthMm * scale;
  const paperHeight = config.paper.heightMm * scale;
  const imageWidth = config.artwork.widthMm * scale;
  const imageHeight = config.artwork.heightMm * scale;
  const imageOffsetX = config.artwork.offsetXMm * scale;
  const imageOffsetY = config.artwork.offsetYMm * scale;
  const frameDepth = Math.max(config.frame.profileDepthMm * scale, 0.004);
  const matDepth = Math.max(config.mat.depthMm * scale, 0.0014);
  const paperDepth = Math.max(config.paper.depthMm * scale, 0.0012);

  if (config.frame.enabled) {
    const frameFaceColor = config.frame.faceColor || config.frame.color || "#26282d";
    const frameSideColor = config.frame.sideColor || frameFaceColor;
    const faceMaterial = track(
      disposables,
      new THREE.MeshPhysicalMaterial({
        color: frameFaceColor,
        roughness: config.frame.roughness ?? materialPreset.frame.roughness,
        metalness: config.frame.metalness ?? materialPreset.frame.metalness,
        clearcoat: config.frame.clearcoat ?? materialPreset.frame.clearcoat,
        clearcoatRoughness:
          config.frame.clearcoatRoughness ?? materialPreset.frame.clearcoatRoughness,
      }),
    );

    const sideMaterial = track(
      disposables,
      new THREE.MeshPhysicalMaterial({
        color: frameSideColor,
        roughness:
          config.frame.sideRoughness ??
          config.frame.roughness ??
          materialPreset.frame.roughness,
        metalness:
          config.frame.sideMetalness ??
          config.frame.metalness ??
          materialPreset.frame.metalness,
        clearcoat: Math.max(
          (config.frame.clearcoat ?? materialPreset.frame.clearcoat) * 0.45,
          0,
        ),
        clearcoatRoughness:
          config.frame.clearcoatRoughness ?? materialPreset.frame.clearcoatRoughness,
      }),
    );

    const profileWidth = Math.max(config.frame.profileWidthMm * scale, 0.012);
    const railDepth = Math.max(config.frame.profileDepthMm * scale, 0.01);

    const horizontalRail = createFrameRailMesh({
      length: frameOuterWidth,
      thickness: profileWidth,
      depth: railDepth,
      orientation: "horizontal",
      faceMaterial,
      sideMaterial,
    });

    const verticalRail = createFrameRailMesh({
      length: frameOuterHeight,
      thickness: profileWidth,
      depth: railDepth,
      orientation: "vertical",
      faceMaterial,
      sideMaterial,
    });

    track(disposables, horizontalRail.geometry);
    track(disposables, verticalRail.geometry);

    const top = horizontalRail.mesh;
    const bottom = horizontalRail.mesh.clone();
    const left = verticalRail.mesh;
    const right = verticalRail.mesh.clone();

    const halfOuterW = frameOuterWidth / 2;
    const halfOuterH = frameOuterHeight / 2;
    const halfProfileW = profileWidth / 2;

    top.position.set(0, halfOuterH - halfProfileW, 0);
    bottom.position.set(0, -halfOuterH + halfProfileW, 0);
    left.position.set(-halfOuterW + halfProfileW, 0, 0);
    right.position.set(halfOuterW - halfProfileW, 0, 0);

    top.userData.part = "frame";
    bottom.userData.part = "frame";
    left.userData.part = "frame";
    right.userData.part = "frame";
    group.add(top, bottom, left, right);

    const lipInset = Math.max(
      (config.frame.innerLipInsetMm ?? 5.2) * scale,
      0.0035,
    );
    const lipWidth = Math.max(
      (config.frame.innerLipWidthMm ?? 2.8) * scale,
      0.0018,
    );
    const lipDepth = Math.max(
      Math.min((config.frame.innerLipDepthMm ?? 1.9) * scale, frameDepth * 0.42),
      0.0009,
    );

    const lipFaceColor = mixHexColors(frameFaceColor, frameSideColor, 0.72);
    const lipSideColor = mixHexColors(frameSideColor, "#0b0f14", 0.32);

    const lipFaceMaterial = track(
      disposables,
      new THREE.MeshPhysicalMaterial({
        color: lipFaceColor,
        roughness: Math.min(
          (config.frame.roughness ?? materialPreset.frame.roughness) + 0.04,
          1,
        ),
        metalness: config.frame.metalness ?? materialPreset.frame.metalness,
        clearcoat: Math.max(
          (config.frame.clearcoat ?? materialPreset.frame.clearcoat) * 0.35,
          0,
        ),
        clearcoatRoughness:
          config.frame.clearcoatRoughness ?? materialPreset.frame.clearcoatRoughness,
      }),
    );

    const lipSideMaterial = track(
      disposables,
      new THREE.MeshPhysicalMaterial({
        color: lipSideColor,
        roughness: Math.min(
          (config.frame.sideRoughness ??
            config.frame.roughness ??
            materialPreset.frame.roughness) + 0.05,
          1,
        ),
        metalness:
          config.frame.sideMetalness ??
          config.frame.metalness ??
          materialPreset.frame.metalness,
        clearcoat: Math.max(
          (config.frame.clearcoat ?? materialPreset.frame.clearcoat) * 0.2,
          0,
        ),
        clearcoatRoughness:
          config.frame.clearcoatRoughness ?? materialPreset.frame.clearcoatRoughness,
      }),
    );

    const lipHorizontalRail = createFrameRailMesh({
      length: frameOuterWidth - lipInset * 2,
      thickness: lipWidth,
      depth: lipDepth,
      orientation: "horizontal",
      faceMaterial: lipFaceMaterial,
      sideMaterial: lipSideMaterial,
    });

    const lipVerticalRail = createFrameRailMesh({
      length: frameOuterHeight - lipInset * 2,
      thickness: lipWidth,
      depth: lipDepth,
      orientation: "vertical",
      faceMaterial: lipFaceMaterial,
      sideMaterial: lipSideMaterial,
    });

    track(disposables, lipHorizontalRail.geometry);
    track(disposables, lipVerticalRail.geometry);

    const lipTop = lipHorizontalRail.mesh;
    const lipBottom = lipHorizontalRail.mesh.clone();
    const lipLeft = lipVerticalRail.mesh;
    const lipRight = lipVerticalRail.mesh.clone();

    const lipZ = frameDepth / 2 - lipDepth / 2 - 0.00015;

    lipTop.position.set(0, halfOuterH - lipInset - lipWidth / 2, lipZ);
    lipBottom.position.set(0, -halfOuterH + lipInset + lipWidth / 2, lipZ);
    lipLeft.position.set(-halfOuterW + lipInset + lipWidth / 2, 0, lipZ);
    lipRight.position.set(halfOuterW - lipInset - lipWidth / 2, 0, lipZ);

    lipTop.userData.part = "frame";
    lipBottom.userData.part = "frame";
    lipLeft.userData.part = "frame";
    lipRight.userData.part = "frame";

    group.add(lipTop, lipBottom, lipLeft, lipRight);
  }

  if (config.mat.enabled) {
    const matGeometry = track(
      disposables,
      new THREE.BoxGeometry(matOuterWidth, matOuterHeight, matDepth),
    );
    const matMaterial = track(
      disposables,
      new THREE.MeshStandardMaterial({
        color: config.mat.color,
        roughness: materialPreset.mat.roughness,
        metalness: materialPreset.mat.metalness,
      }),
    );

    const matBoard = new THREE.Mesh(matGeometry, matMaterial);
    matBoard.position.set(0, 0, frameDepth / 2 - matDepth / 2);
    matBoard.userData.part = "mat";
    group.add(matBoard);
  }

  const paperGeometry = track(
    disposables,
    new THREE.BoxGeometry(paperWidth, paperHeight, paperDepth),
  );
  const paperMaterial = track(
    disposables,
    new THREE.MeshStandardMaterial({
      color: config.paper.color,
      roughness: materialPreset.paper.roughness,
      metalness: materialPreset.paper.metalness,
    }),
  );
  const paperSheet = new THREE.Mesh(paperGeometry, paperMaterial);
  paperSheet.position.set(0, 0, frameDepth / 2 + matDepth / 2 + paperDepth / 2);
  paperSheet.userData.part = "paper";
  group.add(paperSheet);

  const artGeometry = track(disposables, new THREE.PlaneGeometry(imageWidth, imageHeight));
  const artMaterial = track(
    disposables,
    materialPreset.artwork.unlit
      ? new THREE.MeshBasicMaterial({
          color: "#ffffff",
          map: texture || null,
          toneMapped: false,
        })
      : new THREE.MeshStandardMaterial({
          color: "#ffffff",
          map: texture || null,
          roughness: materialPreset.artwork.roughness,
          metalness: materialPreset.artwork.metalness,
        }),
  );
  const artMesh = new THREE.Mesh(artGeometry, artMaterial);
  artMesh.position.set(
    imageOffsetX,
    imageOffsetY,
    frameDepth / 2 + matDepth / 2 + paperDepth + 0.0008,
  );
  artMesh.userData.part = "artwork";
  group.add(artMesh);

  group.userData.printPreview = {
    productId: payload?.productId || "",
    variantId: payload?.variantId || "",
    title: payload?.title || "",
    paperWidthMm: config.paper.widthMm,
    paperHeightMm: config.paper.heightMm,
    exportTarget: options.exportTarget || "glb",
    exportHints: config.exportHints,
    frontAxis: config.exportHints?.preferredFrontAxis || "Z+",
    upAxis: config.exportHints?.preferredUpAxis || "Y",
  };

  group.updateMatrixWorld(true);

  return {
    group,
    dispose() {
      for (const resource of disposables) {
        resource.dispose();
      }
    },
  };
}
