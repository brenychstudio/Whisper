// src/xr-core/runtime/hands/createHandPresenceSystem.js
import * as THREE from "three";

export function createHandPresenceSystem({
  renderer,
  scene,
  rigParent = scene,
}) {
  const mountRoot = new THREE.Group();
  mountRoot.name = "xr-hand-mount-root";
  rigParent.add(mountRoot);

  const bundles = [0, 1].map((index) => {
    const handedness = index === 0 ? "left" : "right";
    const hand = renderer.xr.getHand(index);
    hand.name = `xr-hand-${handedness}`;
    rigParent.add(hand);

    return {
      index,
      handedness,
      hand,
      source: null,
      active: false,
      tracked: false,
      model: null,
    };
  });

  const findSourceForHand = (handedness) => {
    const session = renderer.xr.getSession?.();
    if (!session?.inputSources) return null;

    for (const source of session.inputSources) {
      if (source?.hand && source.handedness === handedness) {
        return source;
      }
    }

    return null;
  };

  const update = () => {
    const xrPresenting = renderer.xr.isPresenting;

    for (const bundle of bundles) {
      const source = xrPresenting ? findSourceForHand(bundle.handedness) : null;
      bundle.source = source;
      bundle.active = Boolean(source?.hand);
      bundle.tracked = bundle.active;
      bundle.hand.visible = xrPresenting && bundle.active;
    }
  };

  const isAnyHandTracked = () => bundles.some((bundle) => bundle.active);

  const getBundle = (handedness) =>
    bundles.find((bundle) => bundle.handedness === handedness) || null;

  const dispose = () => {
    try {
      rigParent.remove(mountRoot);
    } catch {}

    for (const bundle of bundles) {
      try {
        if (bundle.model) {
          bundle.hand.remove(bundle.model);
          bundle.model = null;
        }
      } catch {}

      try {
        rigParent.remove(bundle.hand);
      } catch {}
    }
  };

  return {
    mountRoot,
    bundles,
    getBundle,
    isAnyHandTracked,
    update,
    dispose,
  };
}
