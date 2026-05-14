import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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

function createProceduralTexture({ kind = "fine", color = "#808080", size = 256 } = {}) {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const base = new THREE.Color(color);
  const image = ctx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const wave = kind === "oak"
        ? Math.sin((x * 0.11) + Math.sin(y * 0.035) * 2.1) * 0.5 + 0.5
        : Math.sin((x + y) * 0.045) * 0.5 + 0.5;
      const speckle = Math.random();
      const grain = kind === "oak"
        ? 0.78 + wave * 0.18 + speckle * 0.04
        : 0.88 + wave * 0.045 + speckle * 0.07;

      image.data[i] = Math.min(255, Math.max(0, base.r * 255 * grain));
      image.data[i + 1] = Math.min(255, Math.max(0, base.g * 255 * grain));
      image.data[i + 2] = Math.min(255, Math.max(0, base.b * 255 * grain));
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "oak" ? 2.4 : 3.2, kind === "oak" ? 0.7 : 2.8);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createFrameMaterial({
  color,
  roughness,
  metalness,
  clearcoat,
  clearcoatRoughness,
  grainTexture,
  emissiveIntensity = 0.012,
}) {
  const frameColor = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color,
    map: grainTexture || null,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    emissive: frameColor,
    emissiveIntensity,
    sheen: 0.12,
    sheenRoughness: 0.78,
  });
}

function createFrameRailMesh({
  length,
  thickness,
  depth,
  orientation = "horizontal",
  material,
  bevelRadius = 0.002,
}) {
  const width = orientation === "horizontal" ? length : thickness;
  const height = orientation === "horizontal" ? thickness : length;

  const radius = Math.min(bevelRadius, width * 0.08, height * 0.32, depth * 0.32);
  const geometry = new RoundedBoxGeometry(width, height, depth, 4, radius);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
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
    const frameGrainTexture = track(
      disposables,
      createProceduralTexture({
        kind: config.frame.grainHint === "subtle" ? "oak" : "fine",
        color: frameFaceColor,
      }),
    );
    const frameMaterial = track(
      disposables,
      createFrameMaterial({
        color: frameFaceColor,
        roughness: Math.min(config.frame.roughness ?? materialPreset.frame.roughness, 0.92),
        metalness: config.frame.metalness ?? materialPreset.frame.metalness,
        clearcoat: Math.max(config.frame.clearcoat ?? materialPreset.frame.clearcoat, 0.08),
        clearcoatRoughness:
          config.frame.clearcoatRoughness ?? materialPreset.frame.clearcoatRoughness,
        grainTexture: frameGrainTexture,
      }),
    );
    const frameSideMaterial = track(
      disposables,
      createFrameMaterial({
        color: frameSideColor,
        roughness: config.frame.sideRoughness ?? materialPreset.frame.roughness,
        metalness: config.frame.sideMetalness ?? materialPreset.frame.metalness,
        clearcoat: Math.max((config.frame.clearcoat ?? materialPreset.frame.clearcoat) * 0.35, 0.02),
        clearcoatRoughness: config.frame.clearcoatRoughness ?? materialPreset.frame.clearcoatRoughness,
        grainTexture: frameGrainTexture,
      }),
    );

    const profileWidth = Math.max(config.frame.profileWidthMm * scale, 0.012);
    const railDepth = Math.max(config.frame.profileDepthMm * scale, 0.01);
    const railBevel = Math.max((config.frame.geometry?.outerBevelMm || 1.8) * scale, 0.0014);

    const horizontalRail = createFrameRailMesh({
      length: frameOuterWidth,
      thickness: profileWidth,
      depth: railDepth,
      orientation: "horizontal",
      material: frameMaterial,
      bevelRadius: railBevel,
    });

    const verticalRail = createFrameRailMesh({
      length: frameOuterHeight,
      thickness: profileWidth,
      depth: railDepth,
      orientation: "vertical",
      material: frameMaterial,
      bevelRadius: railBevel,
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

    const sideInset = Math.max(profileWidth * 0.18, 0.004);
    const sideDepth = Math.max(railDepth * 0.78, 0.008);
    const sideBevel = Math.max(railBevel * 0.55, 0.0009);

    const sideHorizontalRail = createFrameRailMesh({
      length: frameOuterWidth - sideInset * 2,
      thickness: Math.max(profileWidth * 0.34, 0.006),
      depth: sideDepth,
      orientation: "horizontal",
      material: frameSideMaterial,
      bevelRadius: sideBevel,
    });

    const sideVerticalRail = createFrameRailMesh({
      length: frameOuterHeight - sideInset * 2,
      thickness: Math.max(profileWidth * 0.34, 0.006),
      depth: sideDepth,
      orientation: "vertical",
      material: frameSideMaterial,
      bevelRadius: sideBevel,
    });

    track(disposables, sideHorizontalRail.geometry);
    track(disposables, sideVerticalRail.geometry);

    const sideTop = sideHorizontalRail.mesh;
    const sideBottom = sideHorizontalRail.mesh.clone();
    const sideLeft = sideVerticalRail.mesh;
    const sideRight = sideVerticalRail.mesh.clone();
    const sideZ = -railDepth * 0.13;

    sideTop.position.set(0, halfOuterH - profileWidth * 0.19, sideZ);
    sideBottom.position.set(0, -halfOuterH + profileWidth * 0.19, sideZ);
    sideLeft.position.set(-halfOuterW + profileWidth * 0.19, 0, sideZ);
    sideRight.position.set(halfOuterW - profileWidth * 0.19, 0, sideZ);

    top.userData.part = "frame";
    bottom.userData.part = "frame";
    left.userData.part = "frame";
    right.userData.part = "frame";
    sideTop.userData.part = "frame";
    sideBottom.userData.part = "frame";
    sideLeft.userData.part = "frame";
    sideRight.userData.part = "frame";
    group.add(sideTop, sideBottom, sideLeft, sideRight, top, bottom, left, right);

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

    const lipFaceMaterial = track(
      disposables,
      createFrameMaterial({
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
        grainTexture: frameGrainTexture,
      }),
    );

    const lipHorizontalRail = createFrameRailMesh({
      length: frameOuterWidth - lipInset * 2,
      thickness: lipWidth,
      depth: lipDepth,
      orientation: "horizontal",
      material: lipFaceMaterial,
      bevelRadius: Math.max(railBevel * 0.45, 0.0007),
    });

    const lipVerticalRail = createFrameRailMesh({
      length: frameOuterHeight - lipInset * 2,
      thickness: lipWidth,
      depth: lipDepth,
      orientation: "vertical",
      material: lipFaceMaterial,
      bevelRadius: Math.max(railBevel * 0.45, 0.0007),
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
        emissive: new THREE.Color(config.mat.color),
        emissiveIntensity: 0.012,
      }),
    );

    const matBoard = new THREE.Mesh(matGeometry, matMaterial);
    matBoard.position.set(0, 0, frameDepth / 2 - matDepth / 2);
    matBoard.userData.part = "mat";
    group.add(matBoard);
  }

  if (!config.mat.enabled) {
    const paperShadowGeometry = track(
      disposables,
      new THREE.PlaneGeometry(paperWidth + 0.032, paperHeight + 0.032),
    );
    const paperShadowMaterial = track(
      disposables,
      new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: config.frame.enabled ? 0.18 : 0.12,
        depthWrite: false,
      }),
    );
    const paperShadow = new THREE.Mesh(paperShadowGeometry, paperShadowMaterial);
    paperShadow.position.set(
      0.002,
      -0.004,
      frameDepth / 2 + matDepth / 2 + 0.00045,
    );
    paperShadow.userData.part = "paper-shadow";
    group.add(paperShadow);

    const paperGeometry = track(
      disposables,
      new RoundedBoxGeometry(paperWidth, paperHeight, paperDepth, 3, 0.0012),
    );
    const paperMaterial = track(
      disposables,
      new THREE.MeshStandardMaterial({
        color: config.paper.color,
        roughness: materialPreset.paper.roughness,
        metalness: materialPreset.paper.metalness,
        emissive: new THREE.Color(config.paper.color),
        emissiveIntensity: 0.01,
      }),
    );
    const paperSheet = new THREE.Mesh(paperGeometry, paperMaterial);
    paperSheet.position.set(0, 0, frameDepth / 2 + matDepth / 2 + paperDepth / 2);
    paperSheet.userData.part = "paper";
    group.add(paperSheet);
  }

  const artworkZ = config.mat.enabled
    ? frameDepth / 2 + 0.001
    : frameDepth / 2 + matDepth / 2 + paperDepth + 0.0008;

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
    artworkZ,
  );
  artMesh.userData.part = "artwork";
  group.add(artMesh);

  const glassGeometry = track(disposables, new THREE.PlaneGeometry(imageWidth, imageHeight));
  const glassMaterial = track(
    disposables,
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.055,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  glassMesh.position.set(
    imageOffsetX,
    imageOffsetY,
    artworkZ + 0.00045,
  );
  glassMesh.userData.part = "glass";
  group.add(glassMesh);

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
