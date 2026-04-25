import * as THREE from "three";
import { getIosInitialTransformPreset } from "./getIosInitialTransformPreset.js";

function degToRad(value) {
  return (Number(value) || 0) * (Math.PI / 180);
}

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 100000) / 100000;
}

export function buildIosWallPlacementRoot(object3d, options = {}) {
  if (!object3d) {
    throw new Error("iOS wall-placement root build failed: object missing.");
  }

  const preset = options.preset || getIosInitialTransformPreset();
  const root = new THREE.Group();
  root.name = `${object3d.name || "print-preview"}-ios-wall-root`;
  object3d.position.set(0, 0, 0);
  object3d.rotation.set(0, 0, 0);
  object3d.scale.set(1, 1, 1);
  object3d.updateMatrix();
  object3d.updateMatrixWorld(true);

  const rotation = preset.rootRotationEulerDeg || {};
  const position = preset.rootPositionOffsetM || {};

  root.rotation.set(
    degToRad(rotation.x),
    degToRad(rotation.y),
    degToRad(rotation.z),
  );
  root.position.set(
    Number(position.x) || 0,
    Number(position.y) || 0,
    Number(position.z) || 0,
  );

  root.userData.iosWallPlacement = {
    mode: preset.wallPlacementMode || "wall-first",
    interactionIntent: preset.interactionIntent || "wall-art-preview",
    orientationBias: preset.orientationBias || "calm-wall-first",
    frontAxis: preset.frontAxis || "+z",
    upAxis: preset.upAxis || "+y",
    scaleNormalization: preset.scaleNormalization || "preserve-real-size",
    experimentMode: preset.experimentMode === true,
  };

  root.add(object3d);
  root.updateMatrixWorld(true);

  return {
    root,
    metadata: {
      preset: preset.preset || "wall-first",
      label: preset.label || "Wall-first",
      mode: root.userData.iosWallPlacement.mode,
      interactionIntent: root.userData.iosWallPlacement.interactionIntent,
      orientationBias: root.userData.iosWallPlacement.orientationBias,
      frontAxis: root.userData.iosWallPlacement.frontAxis,
      upAxis: root.userData.iosWallPlacement.upAxis,
      scaleNormalization: root.userData.iosWallPlacement.scaleNormalization,
      experimentMode: root.userData.iosWallPlacement.experimentMode,
      rootRotationEulerDeg: {
        x: roundMetric(rotation.x),
        y: roundMetric(rotation.y),
        z: roundMetric(rotation.z),
      },
      rootPositionOffsetM: {
        x: roundMetric(position.x),
        y: roundMetric(position.y),
        z: roundMetric(position.z),
      },
      exportWarning: preset.exportWarning || "",
    },
  };
}
