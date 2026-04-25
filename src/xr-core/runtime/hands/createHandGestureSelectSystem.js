// src/xr-core/runtime/hands/createHandGestureSelectSystem.js
import * as THREE from "three";

const PINCH_ON_DIST = 0.024;
const PINCH_OFF_DIST = 0.038;
const PINCH_CONFIRM_MS = 70;
const MIDDLE_GUARD_DIST = 0.026;

function getJointPosition(bundle, jointName, target) {
  const joint = bundle?.hand?.joints?.[jointName];
  if (!joint) return false;
  joint.getWorldPosition(target);
  return true;
}

function makeHandState() {
  return {
    pinching: false,
    rawPinching: false,
    rawSince: 0,
    justStarted: false,
    justEnded: false,
    pinchStrength: 0,
    thumbIndexDist: Infinity,
    thumbMiddleDist: Infinity,
    thumbTip: new THREE.Vector3(),
    indexTip: new THREE.Vector3(),
    middleTip: new THREE.Vector3(),
  };
}

export function createHandGestureSelectSystem({ handPresence }) {
  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();

  const state = {
    left: makeHandState(),
    right: makeHandState(),
  };

  function endPinch(handState) {
    handState.rawPinching = false;
    handState.rawSince = 0;

    if (handState.pinching) {
      handState.pinching = false;
      handState.justEnded = true;
    }
  }

  function updateHand(bundle, handState, nowMs) {
    handState.justStarted = false;
    handState.justEnded = false;
    handState.pinchStrength = 0;
    handState.thumbIndexDist = Infinity;
    handState.thumbMiddleDist = Infinity;

    if (!bundle?.active) {
      endPinch(handState);
      return;
    }

    const hasThumb = getJointPosition(bundle, "thumb-tip", handState.thumbTip);
    const hasIndex = getJointPosition(bundle, "index-finger-tip", handState.indexTip);
    const hasMiddle = getJointPosition(bundle, "middle-finger-tip", handState.middleTip);

    if (!(hasThumb && hasIndex && hasMiddle)) {
      endPinch(handState);
      return;
    }

    tempA.copy(handState.thumbTip);
    tempB.copy(handState.indexTip);
    const thumbIndexDist = tempA.distanceTo(tempB);

    tempB.copy(handState.middleTip);
    const thumbMiddleDist = tempA.distanceTo(tempB);

    handState.thumbIndexDist = thumbIndexDist;
    handState.thumbMiddleDist = thumbMiddleDist;

    const threshold = handState.pinching ? PINCH_OFF_DIST : PINCH_ON_DIST;

    // Guard: не вважаємо закриту/зібрану кисть pinch-жестом.
    // Має бути саме thumb + index, а middle має лишатися достатньо окремо.
    const rawPinch =
      thumbIndexDist <= threshold &&
      thumbMiddleDist >= MIDDLE_GUARD_DIST;

    handState.pinchStrength = THREE.MathUtils.clamp(
      1 - (thumbIndexDist - PINCH_ON_DIST) / (PINCH_OFF_DIST - PINCH_ON_DIST),
      0,
      1
    );

    if (!rawPinch) {
      endPinch(handState);
      return;
    }

    if (!handState.rawPinching) {
      handState.rawPinching = true;
      handState.rawSince = nowMs;
    }

    if (!handState.pinching && nowMs - handState.rawSince >= PINCH_CONFIRM_MS) {
      handState.pinching = true;
      handState.justStarted = true;
    }
  }

  function update() {
    const nowMs = performance.now();

    updateHand(handPresence.getBundle("left"), state.left, nowMs);
    updateHand(handPresence.getBundle("right"), state.right, nowMs);
  }

  function getState(handedness) {
    return state[handedness] || null;
  }

  return {
    state,
    getState,
    update,
  };
}
