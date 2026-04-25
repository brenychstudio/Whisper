import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

export function createLocomotionShell({
  scene,
  renderer,
  camera,
  rig,
  floor,
  snapTurnDeg = 30,
  snapCooldownMs = 320,
  markerColor = 0x9bbcff,
  onCollectorSelect = null,
}) {
  const controllerModelFactory = new XRControllerModelFactory();
  const teleportRay = new THREE.Raycaster();
  const interactRay = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  const tmpV = new THREE.Vector3();

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.25, 32),
    new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  const controllers = [];
  const interactiveMeshes = [];
  const keys = new Set();

  let lastSnapAt = 0;
  const snapAngle = THREE.MathUtils.degToRad(snapTurnDeg);

  const makeController = (i) => {
    const c = renderer.xr.getController(i);
    c.userData.teleportPoint = null;

    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    line.scale.z = 6;
    line.visible = false;
    c.add(line);

    c.addEventListener("selectstart", () => {
      if (typeof onCollectorSelect === "function") {
        const handled = onCollectorSelect({
          controller: c,
          interactRay,
          tempMatrix,
          tmpV,
          interactiveMeshes,
        });
        if (handled) return;
      }

      const p = c.userData.teleportPoint;
      if (!p) return;
      rig.position.x = p.x;
      rig.position.z = p.z;
    });

    scene.add(c);

    const grip = renderer.xr.getControllerGrip(i);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    c.userData._grip = grip;
    c.userData._line = line;
    return c;
  };

  controllers.push(makeController(0), makeController(1));

  const onKeyDown = (e) => keys.add(e.key.toLowerCase());
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const updateTeleport = () => {
    if (!renderer.xr.isPresenting) {
      marker.visible = false;
      controllers.forEach((c) => {
        c.userData.teleportPoint = null;
        if (c.userData?._line) c.userData._line.visible = false;
      });
      return;
    }

    let best = null;
    let bestDist = Infinity;

    for (const c of controllers) {
      tempMatrix.identity().extractRotation(c.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
      const dirv = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();

      teleportRay.set(origin, dirv);
      const hits = teleportRay.intersectObject(floor, false);

      if (hits.length) {
        const p = hits[0].point;
        const d = origin.distanceTo(p);

        c.userData.teleportPoint = { x: p.x, z: p.z };

        if (c.userData?._line) {
          c.userData._line.visible = true;
          c.userData._line.scale.z = Math.max(0.2, d);
        }

        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      } else {
        c.userData.teleportPoint = null;
        if (c.userData?._line) c.userData._line.visible = false;
      }
    }

    if (best) {
      marker.visible = true;
      marker.position.set(best.x, 0.012, best.z);
    } else {
      marker.visible = false;
    }
  };

  const hideTeleportVisuals = () => {
    marker.visible = false;

    for (const c of controllers) {
      c.userData.teleportPoint = null;

      if (c.userData?._line) {
        c.userData._line.visible = false;
      }
    }
  };

  const updateDesktopMove = (dtSec) => {
    if (renderer.xr.isPresenting) return;

    const speed = 1.45;
    let f = 0;
    let s = 0;

    if (keys.has("w") || keys.has("arrowup")) f += 1;
    if (keys.has("s") || keys.has("arrowdown")) f -= 1;
    if (keys.has("a") || keys.has("arrowleft")) s -= 1;
    if (keys.has("d") || keys.has("arrowright")) s += 1;

    if (!f && !s) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, f);
    move.addScaledVector(right, s);

    const len = move.length() || 1;
    move.multiplyScalar((speed * dtSec) / len);

    rig.position.add(move);
  };

  const updateSnapTurn = (tNow) => {
    if (!renderer.xr.isPresenting) return;

    const session = renderer.xr.getSession?.();
    if (!session?.inputSources) return;

    for (const src of session.inputSources) {
      if (src.handedness && src.handedness !== "right") continue;
      const gp = src.gamepad;
      if (!gp?.axes?.length) continue;

      const axes = gp.axes;
      const x = axes.length >= 4 ? axes[2] : axes[0];

      if (Math.abs(x) < 0.75) continue;
      if (tNow - lastSnapAt < snapCooldownMs) continue;

      lastSnapAt = tNow;
      const dirn = x > 0 ? -1 : 1;
      rig.rotation.y += dirn * snapAngle;
      break;
    }
  };

  const dispose = () => {
    try {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    } catch {
      void 0;
    }

    try {
      marker.geometry.dispose();
      marker.material.dispose();
      scene.remove(marker);
    } catch {
      void 0;
    }

    for (const c of controllers) {
      try {
        if (c.userData?._line) {
          c.userData._line.geometry?.dispose?.();
          c.userData._line.material?.dispose?.();
        }
      } catch {
        void 0;
      }

      try {
        if (c.userData?._grip) {
          scene.remove(c.userData._grip);
        }
      } catch {
        void 0;
      }

      try {
        scene.remove(c);
      } catch {
        void 0;
      }
    }
  };

  return {
    controllers,
    interactiveMeshes,
    updateTeleport,
    hideTeleportVisuals,
    updateDesktopMove,
    updateSnapTurn,
    dispose,
  };
}
