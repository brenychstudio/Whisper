import * as THREE from "three";

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 100000) / 100000;
}

export function normalizeIosExportPivot(object3d, options = {}) {
  if (!object3d) {
    throw new Error("iOS pivot normalization failed: object missing.");
  }

  object3d.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object3d);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const strategy = options.strategy || "framed-center";
  const experimental = strategy === "framed-center-experiment";
  const positionBefore = object3d.position.clone();

  const targetCenterZ = experimental ? center.z * 0.7 : center.z;

  object3d.position.x -= center.x;
  object3d.position.y -= center.y;
  object3d.position.z -= targetCenterZ;
  object3d.updateMatrixWorld(true);

  return {
    applied: true,
    strategy,
    experimental,
    positionOffsetM: {
      x: roundMetric(object3d.position.x - positionBefore.x),
      y: roundMetric(object3d.position.y - positionBefore.y),
      z: roundMetric(object3d.position.z - positionBefore.z),
    },
    bounds: {
      widthM: roundMetric(size.x),
      heightM: roundMetric(size.y),
      depthM: roundMetric(size.z),
    },
    sourceCenterM: {
      x: roundMetric(center.x),
      y: roundMetric(center.y),
      z: roundMetric(center.z),
    },
  };
}
