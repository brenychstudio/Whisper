// src/xr-core/runtime/hands/createHandLocomotionBridge.js
import * as THREE from "three";

const HANDS = ["left", "right"];
const MAX_RAY_DISTANCE = 18;
const DOWNWARD_BIAS = 0.38;
const AIM_SMOOTHING = 0.22;
const TELEPORT_COOLDOWN_MS = 520;

const POINTER_COLOR = 0xc7d0d2;

function makeRayLine(opacity = 0.22) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const material = new THREE.LineBasicMaterial({
    color: POINTER_COLOR,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
  });

  const line = new THREE.Line(geometry, material);
  line.visible = false;
  line.frustumCulled = false;
  return line;
}

function makeMarker(opacity = 0.18) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.11, 0.17, 48),
    new THREE.MeshBasicMaterial({
      color: POINTER_COLOR,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    })
  );

  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

function updateLine(line, origin, target) {
  const attr = line.geometry.attributes.position;
  attr.setXYZ(0, origin.x, origin.y, origin.z);
  attr.setXYZ(1, target.x, target.y, target.z);
  attr.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

function getJointWorldPosition(hand, jointName, target) {
  const joint = hand?.joints?.[jointName];
  if (!joint) return false;
  joint.getWorldPosition(target);
  return true;
}

function makeHandState(handedness) {
  return {
    handedness,
    active: false,
    aimValid: false,
    teleportPoint: new THREE.Vector3(),
    smoothedPoint: new THREE.Vector3(),
    hasSmoothedPoint: false,
    origin: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    ray: makeRayLine(handedness === "right" ? 0.24 : 0.16),
    marker: makeMarker(handedness === "right" ? 0.2 : 0.14),
  };
}

export function createHandLocomotionBridge({
  scene,
  rig,
  handPresence,
  controllers = [],
  floorObjects = [],
}) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = MAX_RAY_DISTANCE;

  const tempTip = new THREE.Vector3();
  const tempBase = new THREE.Vector3();
  const tempWrist = new THREE.Vector3();
  const tempDir = new THREE.Vector3();
  const tempDown = new THREE.Vector3(0, -1, 0);
  const tempHit = new THREE.Vector3();

  const perHand = {
    left: makeHandState("left"),
    right: makeHandState("right"),
  };

  const state = {
    activeHand: null,
    lastTeleportAt: 0,
    perHand,
  };

  for (const handedness of HANDS) {
    scene.add(perHand[handedness].ray);
    scene.add(perHand[handedness].marker);
  }

  function hideHand(handState) {
    handState.active = false;
    handState.aimValid = false;
    handState.ray.visible = false;
    handState.marker.visible = false;
    handState.hasSmoothedPoint = false;
  }

  function computeHandAim(handedness) {
    const handState = perHand[handedness];
    const bundle = handPresence.getBundle(handedness);

    if (!bundle?.active || !bundle?.hand) {
      hideHand(handState);
      return;
    }

    const hasTip = getJointWorldPosition(bundle.hand, "index-finger-tip", tempTip);
    const hasBase =
      getJointWorldPosition(bundle.hand, "index-finger-metacarpal", tempBase) ||
      getJointWorldPosition(bundle.hand, "wrist", tempBase);
    const hasWrist = getJointWorldPosition(bundle.hand, "wrist", tempWrist);

    if (!(hasTip && hasBase && hasWrist)) {
      hideHand(handState);
      return;
    }

    handState.active = true;
    handState.origin.copy(tempTip);

    // Aim direction: index base -> fingertip, with a controlled downward bias
    // so the ray naturally finds the floor.
    tempDir.copy(tempTip).sub(tempBase);

    if (tempDir.lengthSq() < 0.000001) {
      tempDir.copy(tempTip).sub(tempWrist);
    }

    if (tempDir.lengthSq() < 0.000001) {
      hideHand(handState);
      return;
    }

    tempDir.normalize().lerp(tempDown, DOWNWARD_BIAS).normalize();
    handState.direction.copy(tempDir);

    raycaster.set(handState.origin, handState.direction);
    const hits = raycaster.intersectObjects(floorObjects.filter(Boolean), true);

    if (!hits.length) {
      handState.aimValid = false;
      handState.ray.visible = false;
      handState.marker.visible = false;
      handState.hasSmoothedPoint = false;
      return;
    }

    tempHit.copy(hits[0].point);

    if (!handState.hasSmoothedPoint) {
      handState.smoothedPoint.copy(tempHit);
      handState.hasSmoothedPoint = true;
    } else {
      handState.smoothedPoint.lerp(tempHit, AIM_SMOOTHING);
    }

    handState.aimValid = true;
    handState.teleportPoint.copy(handState.smoothedPoint);

    updateLine(handState.ray, handState.origin, handState.teleportPoint);
    handState.ray.visible = true;

    handState.marker.visible = true;
    handState.marker.position.copy(handState.teleportPoint);
    handState.marker.position.y += 0.014;
  }

  function commitTeleport(handedness) {
    const now = performance.now();
    if (now - state.lastTeleportAt < TELEPORT_COOLDOWN_MS) return false;

    const handState = perHand[handedness];
    if (!handState?.aimValid) return false;

    rig.position.x = handState.teleportPoint.x;
    rig.position.z = handState.teleportPoint.z;

    state.activeHand = handedness;
    state.lastTeleportAt = now;
    return true;
  }

  function getHandednessFromEvent(event, fallbackIndex) {
    const fromInput = event?.data?.handedness;
    if (fromInput === "left" || fromInput === "right") return fromInput;

    // Fallback only. Most Quest sessions provide event.data.handedness.
    return fallbackIndex === 0 ? "left" : "right";
  }

  const cleanupFns = [];

  controllers.forEach((controller, index) => {
    const onSelectStart = (event) => {
      const handedness = getHandednessFromEvent(event, index);
      commitTeleport(handedness);
    };

    controller.addEventListener("selectstart", onSelectStart);
    cleanupFns.push(() => {
      controller.removeEventListener("selectstart", onSelectStart);
    });
  });

  function update() {
    computeHandAim("left");
    computeHandAim("right");
  }

  function dispose() {
    for (const fn of cleanupFns) {
      try {
        fn();
      } catch {}
    }

    for (const handedness of HANDS) {
      const handState = perHand[handedness];

      try {
        scene.remove(handState.ray);
      } catch {}

      try {
        scene.remove(handState.marker);
      } catch {}

      try {
        handState.ray.geometry?.dispose?.();
      } catch {}

      try {
        handState.ray.material?.dispose?.();
      } catch {}

      try {
        handState.marker.geometry?.dispose?.();
      } catch {}

      try {
        handState.marker.material?.dispose?.();
      } catch {}
    }
  }

  return {
    state,
    update,
    dispose,
  };
}
