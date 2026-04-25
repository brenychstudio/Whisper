// src/xr-core/runtime/hands/createHandVisualProxySystem.js
import * as THREE from "three";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";

function makeGhostHandMaterial(_sourceMaterial, style = {}) {
  const color = style.color ?? 0xd5dde0;
  const opacity = style.opacity ?? 0.16;
  const roughness = style.roughness ?? 0.82;
  const metalness = style.metalness ?? 0.0;
  const emissive = style.emissive ?? 0x7d8a8f;
  const emissiveIntensity = style.emissiveIntensity ?? 0.045;

  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    transparent: true,
    opacity,
    roughness,
    metalness,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

function ensureStyled(bundle, style) {
  if (!bundle?.model) return;

  bundle.model.traverse((obj) => {
    if (!(obj.isMesh || obj.isSkinnedMesh)) return;
    if (obj.userData.__whisperHandStyled) return;

    const oldMaterial = obj.material;
    obj.material = makeGhostHandMaterial(oldMaterial, style);
    obj.frustumCulled = false;
    obj.renderOrder = 10;
    obj.userData.__whisperHandStyled = true;

    try {
      oldMaterial?.dispose?.();
    } catch {}
  });
}

function ensureModel(bundle, factory) {
  if (!bundle?.hand) return;
  if (bundle.model) return;

  const model = factory.createHandModel(bundle.hand, "mesh");
  model.name = `whisper-hand-model-${bundle.handedness}`;
  bundle.hand.add(model);
  bundle.model = model;
}

function syncControllerVisuals(controllers = [], handsTracked = false) {
  for (const controller of controllers) {
    try {
      if (controller.userData?._line) {
        // Keep the target ray available for hand-tracking navigation.
        // The locomotion shell decides when the ray is visible.
        controller.userData._line.visible = controller.userData._line.visible;
      }
    } catch {}

    try {
      if (controller.userData?._grip) {
        // Hide physical controller model when real tracked hands are active.
        controller.userData._grip.visible = !handsTracked;
      }
    } catch {}
  }
}

export function createHandVisualProxySystem({
  handPresence,
  controllers = [],
  style = {},
}) {
  const factory = new XRHandModelFactory();

  const update = () => {
    handPresence.update();

    for (const bundle of handPresence.bundles) {
      ensureModel(bundle, factory);
      ensureStyled(bundle, style);

      if (bundle.hand) {
        bundle.hand.visible = bundle.active;
      }
    }

    syncControllerVisuals(controllers, handPresence.isAnyHandTracked());
  };

  const dispose = () => {
    syncControllerVisuals(controllers, false);

    for (const bundle of handPresence.bundles) {
      try {
        if (bundle.model) {
          bundle.hand.remove(bundle.model);
          bundle.model = null;
        }
      } catch {}
    }
  };

  return {
    update,
    dispose,
  };
}
