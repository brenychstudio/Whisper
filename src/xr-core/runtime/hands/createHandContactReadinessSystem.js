// src/xr-core/runtime/hands/createHandContactReadinessSystem.js
import * as THREE from "three";

const CONTACT_NEAR_DIST = 0.06;

export function createHandContactReadinessSystem({ handPresence, gestureSystem }) {
  const state = {
    left: {
      ready: false,
      fingertip: new THREE.Vector3(),
      middleTip: new THREE.Vector3(),
    },
    right: {
      ready: false,
      fingertip: new THREE.Vector3(),
      middleTip: new THREE.Vector3(),
    },
  };

  function updateOne(handedness) {
    const bundle = handPresence.getBundle(handedness);
    const gesture = gestureSystem.getState(handedness);
    const out = state[handedness];

    out.ready = false;

    if (!bundle?.active || !gesture) return;

    out.fingertip.copy(gesture.indexTip);
    out.middleTip.copy(gesture.middleTip);

    const spread = gesture.indexTip.distanceTo(gesture.middleTip);
    out.ready = spread <= CONTACT_NEAR_DIST;
  }

  function update() {
    updateOne("left");
    updateOne("right");
  }

  return {
    state,
    update,
  };
}
