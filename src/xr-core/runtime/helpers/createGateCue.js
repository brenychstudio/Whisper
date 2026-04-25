import * as THREE from "three";

export function createGateCue({
  scene,
  dir,
  hemi,
  floorMat,
  getBaseDirIntensity,
  getBaseHemiIntensity,
  getBaseFloorEmissive,
}) {
  let gate = null;
  let gatePos = null;
  let gateCue = 0;

  const createAt = ({ x, z }) => {
    if (gate) {
      try {
        scene.remove(gate);
      } catch {
        void 0;
      }
      gate = null;
    }

    gatePos = new THREE.Vector3(x, 0, z);

    const gateGroup = new THREE.Group();
    gateGroup.position.set(x, 0, z);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.45),
      new THREE.MeshBasicMaterial({
        color: 0x0d1020,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      })
    );
    plane.position.set(0, 1.5, 0);
    gateGroup.add(plane);

    const edge = new THREE.Mesh(
      new THREE.PlaneGeometry(2.45, 2.65),
      new THREE.MeshBasicMaterial({
        color: 0x6ea8ff,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    edge.position.set(0, 1.5, 0.001);
    gateGroup.add(edge);

    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 3.0),
      new THREE.MeshBasicMaterial({
        color: 0x9bbcff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(0, 1.5, 0.002);
    gateGroup.add(beam);

    gateGroup.userData.edge = edge;
    gateGroup.userData.beam = beam;
    gateGroup.userData.plane = plane;
    gateGroup.visible = false;

    scene.add(gateGroup);
    gate = gateGroup;

    return { gate, gatePos };
  };

  const trigger = () => {
    gateCue = 1;
  };

  const update = (dtMs) => {
    const baseDirIntensity = getBaseDirIntensity();
    const baseHemiIntensity = getBaseHemiIntensity();
    const baseFloorEmissive = getBaseFloorEmissive();

    if (gateCue <= 0) {
      dir.intensity = baseDirIntensity;
      hemi.intensity = baseHemiIntensity;
      floorMat.emissiveIntensity = baseFloorEmissive;
      return;
    }

    gateCue = Math.max(0, gateCue - dtMs / 900);
    const k = gateCue;

    dir.intensity = baseDirIntensity + 0.18 * k;
    hemi.intensity = baseHemiIntensity + 0.10 * k;
    floorMat.emissiveIntensity = baseFloorEmissive + 0.08 * k;

    if (gate && gate.visible) {
      const beamMesh = gate.userData?.beam;
      const edgeMesh = gate.userData?.edge;

      if (beamMesh?.material) {
        beamMesh.material.opacity = 0.16 * k;
      }

      if (edgeMesh?.material) {
        edgeMesh.material.opacity = 0.10 + 0.16 * k;
      }

      if (beamMesh) {
        const s = 1 + 0.04 * k;
        beamMesh.scale.set(s, s, 1);
      }
    }
  };

  const dispose = () => {
    try {
      if (!gate) return;

      const plane = gate.userData?.plane;
      const edge = gate.userData?.edge;
      const beam = gate.userData?.beam;

      try {
        plane?.geometry?.dispose?.();
        plane?.material?.dispose?.();
      } catch {
        void 0;
      }

      try {
        edge?.geometry?.dispose?.();
        edge?.material?.dispose?.();
      } catch {
        void 0;
      }

      try {
        beam?.geometry?.dispose?.();
        beam?.material?.dispose?.();
      } catch {
        void 0;
      }

      try {
        scene.remove(gate);
      } catch {
        void 0;
      }

      gate = null;
      gatePos = null;
      gateCue = 0;
    } catch {
      void 0;
    }
  };

  return {
    createAt,
    trigger,
    update,
    dispose,
    getGate: () => gate,
    getGatePos: () => gatePos,
  };
}
