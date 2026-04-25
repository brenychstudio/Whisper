import * as THREE from "three";
import { normalizeIosExportPivot } from "./normalizeIosExportPivot.js";
import { getIosInitialTransformPreset } from "./getIosInitialTransformPreset.js";
import { buildIosWallPlacementRoot } from "./buildIosWallPlacementRoot.js";

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 100000) / 100000;
}

function computeWorldBounds(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  return {
    widthM: roundMetric(size.x),
    heightM: roundMetric(size.y),
    depthM: roundMetric(size.z),
  };
}

function bakeWorldTransforms(root) {
  root.updateMatrixWorld(true);

  root.traverse((node) => {
    if (!node.isMesh) return;

    node.updateMatrixWorld(true);
    if (node.geometry?.applyMatrix4) {
      node.geometry.applyMatrix4(node.matrixWorld);
      node.geometry.computeBoundingBox?.();
      node.geometry.computeBoundingSphere?.();
    }

    node.position.set(0, 0, 0);
    node.rotation.set(0, 0, 0);
    node.scale.set(1, 1, 1);
    node.updateMatrix();
    node.updateMatrixWorld(true);
  });

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
}

export function buildIosQuickLookScene(group, options = {}) {
  const source = group?.clone(true);
  if (!source) {
    throw new Error("iOS Quick Look scene build failed: source group missing.");
  }

  source.name = `${source.name || "print-preview"}-ios-object`;
  source.updateMatrixWorld(true);

  if (options.freezeTransforms !== false) {
    bakeWorldTransforms(source);
  }

  const pivotNormalization = normalizeIosExportPivot(source, {
    strategy: options.pivotStrategy || "framed-center",
  });
  const initialTransform = getIosInitialTransformPreset(
    options.initialTransformPreset || "balanced",
  );
  const wallPlacement = buildIosWallPlacementRoot(source, {
    preset: initialTransform,
  });

  const scene = new THREE.Scene();
  scene.name = `${wallPlacement.root.name}-scene`;
  scene.add(wallPlacement.root);
  scene.updateMatrixWorld(true);

  const bounds = computeWorldBounds(wallPlacement.root);

  return {
    scene,
    root: wallPlacement.root,
    metrics: {
      ...bounds,
      baked: options.freezeTransforms !== false,
      materialPresetApplied: Boolean(options.materialPreset),
      wallPlacementMode: wallPlacement.metadata.mode,
      interactionIntent: wallPlacement.metadata.interactionIntent,
      orientationBias: wallPlacement.metadata.orientationBias,
      pivotStrategy: pivotNormalization.strategy,
      initialTransformPreset: initialTransform.preset,
      objectModeRole: initialTransform.objectModeRole,
      frontAxis: wallPlacement.metadata.frontAxis,
      upAxis: wallPlacement.metadata.upAxis,
      experimentMode: wallPlacement.metadata.experimentMode,
    },
    pivotNormalization,
    initialTransform: wallPlacement.metadata,
    wallPlacement: wallPlacement.metadata,
  };
}
