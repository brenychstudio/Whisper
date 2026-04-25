import * as THREE from "three";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth01 = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

function makeSoulWispTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const g = ctx.createRadialGradient(cx, cy, size * 0.03, cx, cy, size * 0.48);
  g.addColorStop(0.0, "rgba(255,255,255,0.98)");
  g.addColorStop(0.10, "rgba(255,255,255,0.88)");
  g.addColorStop(0.28, "rgba(255,255,255,0.46)");
  g.addColorStop(0.58, "rgba(255,255,255,0.12)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeRadialGradientTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.06, size / 2, size / 2, size * 0.62);
  g.addColorStop(0.0, "rgba(255,255,255,0.14)");
  g.addColorStop(0.35, "rgba(255,255,255,0.05)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createWhisperFinaleController({
  scene,
  renderer,
  camera,
  rig,
  ambient,
  dir,
  hemi,
  floorMat,
  dustMat,
  corridorOn,
  frameMeshes,
  indexByPrintId,
  anchorByPrintId,
  collectorGroup,
  showCollector,
  setBeaconToPoint,
  finaleConfig,
}) {
  const cfg = {
    enabled: finaleConfig?.enabled === true,
    portalDistance: finaleConfig?.portalDistance ?? 1.2,
    portalAheadM: finaleConfig?.portalAheadM ?? 3.8,
    formingMinMs: finaleConfig?.formingMinMs ?? 3200,
    transitionMs: finaleConfig?.transitionMs ?? 9000,
    soulsCount: Math.max(24, Math.min(144, finaleConfig?.soulsCount ?? 48)),
    soulsOpacity: finaleConfig?.soulsOpacity ?? 0.72,
  };

  let mode = "off"; // off | forming | transition | white
  let mix = 0;
  let targetMix = 0;
  let pid = null;
  let startedAt = 0;
  let readableSince = 0;
  const readableHoldMs = 1550;
  let transitionCaptured = false;
  let revealDelayMs = 0;
  let whiteStartedAt = 0;
  let collectorShown = false;

  const portalPos = new THREE.Vector3();
  const center = new THREE.Vector3();
  const viewDir = new THREE.Vector3(0, 0, 1);

  const startBg = new THREE.Color();
  const startFog = new THREE.Color();
  const startFloor = new THREE.Color();
  let startAmbient = 0;
  let startDir = 0;
  let startHemi = 0;
  let startFloorEmissive = 0;

  let body = null;
  let trailA = null;
  let trailB = null;
  let bodyMat = null;
  let trailAMat = null;
  let trailBMat = null;
  let bodyTex = null;
  let core = null;
  let coreMat = null;
  let coreTex = null;

  const count = Math.max(cfg.soulsCount, 72);
  const phase = new Float32Array(count);
  const orbitPhase = new Float32Array(count);
  const lift = new Float32Array(count);
  const delay = new Float32Array(count);
  const approach = new Float32Array(count);
  const sourceX = new Float32Array(count);
  const sourceY = new Float32Array(count);
  const sourceZ = new Float32Array(count);
  const currentX = new Float32Array(count);
  const currentY = new Float32Array(count);
  const currentZ = new Float32Array(count);
  const velX = new Float32Array(count);
  const velY = new Float32Array(count);
  const velZ = new Float32Array(count);
  const drift = new Float32Array(count);
  const band = new Uint8Array(count);
  const scaleA = new Float32Array(count);
  const scaleB = new Float32Array(count);
  const scaleC = new Float32Array(count);

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmpCol = new THREE.Color();
  const tmpObj = new THREE.Object3D();
  const baseCol = new THREE.Color(0xbfe6ff);

  function ensureAssets() {
    if (body) return;

    bodyTex = makeSoulWispTexture(256);
    coreTex = makeRadialGradientTexture(384);

    const plane = new THREE.PlaneGeometry(1, 1);
    const matBase = {
      map: bodyTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      toneMapped: false,
      fog: true,
    };

    bodyMat = new THREE.MeshBasicMaterial({ ...matBase });
    trailAMat = new THREE.MeshBasicMaterial({ ...matBase });
    trailBMat = new THREE.MeshBasicMaterial({ ...matBase });

    body = new THREE.InstancedMesh(plane, bodyMat, count);
    trailA = new THREE.InstancedMesh(plane, trailAMat, count);
    trailB = new THREE.InstancedMesh(plane, trailBMat, count);

    body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    trailA.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    trailB.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    body.frustumCulled = false;
    trailA.frustumCulled = false;
    trailB.frustumCulled = false;

    trailB.renderOrder = 57;
    trailA.renderOrder = 58;
    body.renderOrder = 59;

    scene.add(trailB);
    scene.add(trailA);
    scene.add(body);

    coreMat = new THREE.MeshBasicMaterial({
      map: coreTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      color: 0xe6f2ff,
      toneMapped: false,
      fog: true,
    });
    core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coreMat);
    core.frustumCulled = false;
    core.visible = false;
    core.renderOrder = 56;
    scene.add(core);
  }

  function seed(at) {
    ensureAssets();
    center.copy(at);

    for (let i = 0; i < count; i++) {
      const bRnd = Math.random();
      const b = bRnd < 0.42 ? 0 : bRnd < 0.80 ? 1 : 2;
      band[i] = b;
      phase[i] = Math.random() * Math.PI * 2;
      orbitPhase[i] = phase[i];
      lift[i] = Math.random();
      delay[i] = Math.random() * 0.74;
      approach[i] = 0.60 + Math.random() * 0.46;
      drift[i] = (Math.random() - 0.5) * 0.55;

      const angle = Math.random() * Math.PI * 2;
      const radius = 7 + Math.random() * 4; // 7-11m
      const sx = center.x + Math.cos(angle) * radius;
      const sz = center.z + Math.sin(angle) * radius;
      sourceX[i] = sx;
      sourceZ[i] = sz;
      sourceY[i] = 0.6 + Math.random() * 3.0;

      currentX[i] = sourceX[i];
      currentY[i] = sourceY[i];
      currentZ[i] = sourceZ[i];

      velX[i] = 0;
      velY[i] = 0;
      velZ[i] = 0;

      const hueTone = b === 0 ? 1.0 : b === 1 ? 0.86 : 0.70;
      const c = baseCol.clone().multiplyScalar((0.82 + Math.random() * 0.16) * hueTone);
      body.setColorAt(i, c);
      trailA.setColorAt(i, c.clone().multiplyScalar(b === 2 ? 0.72 : 0.38));
      trailB.setColorAt(i, c.clone().multiplyScalar(b === 2 ? 0.40 : 0.10));

      scaleA[i] = b === 0 ? 0.16 + Math.random() * 0.04 : b === 1 ? 0.22 + Math.random() * 0.06 : 0.30 + Math.random() * 0.08;
      scaleB[i] = scaleA[i] * (b === 2 ? 1.20 : 0.72);
      scaleC[i] = scaleA[i] * (b === 2 ? 1.55 : 0.42);
    }

    body.instanceColor.needsUpdate = true;
    trailA.instanceColor.needsUpdate = true;
    trailB.instanceColor.needsUpdate = true;

    body.visible = true;
    trailA.visible = true;
    trailB.visible = true;
    core.visible = true;
    bodyMat.opacity = 0;
    trailAMat.opacity = 0;
    trailBMat.opacity = 0;
    coreMat.opacity = 0;
  }

  function writeField(tNow, revealT, gatherT, disperseT = 0, dtMs = 16) {
    if (!body || !trailA || !trailB) return;

    const vx = viewDir.x;
    const vz = viewDir.z;
    const rx = -vz;
    const rz = vx;

    const camBill = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
    tmpObj.quaternion.copy(camBill.quaternion);

    const dt = Math.min(0.05, Math.max(0.001, dtMs / 1000));

    for (let i = 0; i < count; i++) {
      const b = band[i];
      const soulReveal = smooth01((revealT - delay[i]) / approach[i]);

      const arriveT = smooth01((gatherT - 0.00) / 0.56) * soulReveal;
      const orbitT = smooth01((gatherT - 0.18) / 0.68) * soulReveal;
      const condenseDelay = delay[i] * 0.02;
      const condenseT = smooth01((gatherT - (0.98 + condenseDelay)) / 0.20) * soulReveal;
      const condenseEase = smooth01(condenseT);
      const orbitBlend = smooth01(orbitT * 0.82);

      // visible orbit speed - stateful, not just tiny tNow drift
      const spinSpeed =
        (0.52 + b * 0.08 + orbitT * 0.24 + (1 - condenseEase) * 0.14) * dt;

      orbitPhase[i] += spinSpeed;

      // three rings:
      // 1) arrival ring (bigger)
      // 2) orbit ring (main visible vortex)
      // 3) condense ring (small but still rotating)
      const arrivalRX = b === 0 ? 4.6 : b === 1 ? 3.8 : 2.9;
      const arrivalRZ = b === 0 ? 3.2 : b === 1 ? 2.6 : 1.9;

      const orbitRX = b === 0 ? 2.35 : b === 1 ? 1.84 : 1.36;
      const orbitRZ = b === 0 ? 1.62 : b === 1 ? 1.26 : 0.94;

      const condenseRX = b === 0 ? 1.02 : b === 1 ? 0.76 : 0.54;
      const condenseRZ = b === 0 ? 0.72 : b === 1 ? 0.54 : 0.38;

      const a = orbitPhase[i];
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      const arrivalRight = ca * arrivalRX;
      const arrivalForward = sa * arrivalRZ;

      const orbitRight = ca * orbitRX;
      const orbitForward = sa * orbitRZ;

      const condenseRight = ca * condenseRX;
      const condenseForward = sa * condenseRZ;

      const arrivalX = center.x + rx * arrivalRight + vx * arrivalForward;
      const arrivalZ = center.z + rz * arrivalRight + vz * arrivalForward;

      const orbitX = center.x + rx * orbitRight + vx * orbitForward;
      const orbitZ = center.z + rz * orbitRight + vz * orbitForward;

      const condenseX = center.x + rx * condenseRight + vx * condenseForward;
      const condenseZ = center.z + rz * condenseRight + vz * condenseForward;

      const arrivalY =
        1.10 +
        lift[i] * (1.28 + b * 0.08) +
        Math.sin(a * 0.9 + phase[i] * 0.25) * 0.16;

      const orbitY =
        1.06 +
        lift[i] * (0.92 + b * 0.06) +
        Math.sin(a * 1.15 + phase[i] * 0.22) * 0.12;

      const condenseY =
        1.02 +
        lift[i] * (0.54 + b * 0.04) +
        Math.sin(a * 1.35 + phase[i] * 0.18) * 0.06;

      // staged blend
      const arrivalToOrbit = THREE.MathUtils.lerp(arrivalX, orbitX, orbitBlend);
      const arrivalToOrbitZ = THREE.MathUtils.lerp(arrivalZ, orbitZ, orbitBlend);
      const arrivalToOrbitY = THREE.MathUtils.lerp(arrivalY, orbitY, orbitBlend);

      const targetX = THREE.MathUtils.lerp(sourceX[i], arrivalToOrbit, arriveT);
      const targetZ = THREE.MathUtils.lerp(sourceZ[i], arrivalToOrbitZ, arriveT);
      const targetY = THREE.MathUtils.lerp(sourceY[i], arrivalToOrbitY, arriveT);

      const finalTargetX = THREE.MathUtils.lerp(targetX, condenseX, condenseEase);
      const finalTargetZ = THREE.MathUtils.lerp(targetZ, condenseZ, condenseEase);
      const finalTargetY = THREE.MathUtils.lerp(targetY, condenseY, condenseEase);

      // spring with real inertia
      const springXZ = 0.96 + orbitT * 0.54 + condenseEase * 0.18;
      const springY = 0.88 + orbitT * 0.36;
      const damp = Math.pow(0.968 - condenseEase * 0.006, dt * 60);

      velX[i] += (finalTargetX - currentX[i]) * springXZ * dt;
      velY[i] += (finalTargetY - currentY[i]) * springY * dt;
      velZ[i] += (finalTargetZ - currentZ[i]) * springXZ * dt;

      velX[i] *= damp;
      velY[i] *= damp;
      velZ[i] *= damp;

      currentX[i] += velX[i];
      currentY[i] += velY[i];
      currentZ[i] += velZ[i];

      let x = currentX[i];
      let yv = currentY[i];
      let z = currentZ[i];

      if (disperseT > 0) {
        const outX = x - center.x;
        const outZ = z - center.z;
        const outLen = Math.max(0.0001, Math.sqrt(outX * outX + outZ * outZ));
        const outNX = outX / outLen;
        const outNZ = outZ / outLen;

        const release = 0.05 + disperseT * 0.10;
        const upward = 0.02 + disperseT * 0.05;

        x += outNX * release;
        yv += upward + lift[i] * 0.02;
        z += outNZ * release;
      }

      // body
      tmpObj.position.set(x, yv, z);
      tmpObj.scale.setScalar(scaleA[i]);
      tmpObj.updateMatrix();
      body.setMatrixAt(i, tmpObj.matrix);

      // trail A
      tmpObj.position.set(
        x - velX[i] * 0.35,
        yv - velY[i] * 0.35,
        z - velZ[i] * 0.35
      );
      tmpObj.scale.setScalar(scaleB[i]);
      tmpObj.updateMatrix();
      trailA.setMatrixAt(i, tmpObj.matrix);

      // trail B
      tmpObj.position.set(
        x - velX[i] * 0.70,
        yv - velY[i] * 0.70,
        z - velZ[i] * 0.70
      );
      tmpObj.scale.setScalar(scaleC[i]);
      tmpObj.updateMatrix();
      trailB.setMatrixAt(i, tmpObj.matrix);
    }

    body.instanceMatrix.needsUpdate = true;
    trailA.instanceMatrix.needsUpdate = true;
    trailB.instanceMatrix.needsUpdate = true;
  }

  function start(nextPid) {
    if (!cfg.enabled || !nextPid) {
      const at = anchorByPrintId.get(nextPid) || new THREE.Vector3(0, 0, rig.position.z);
      showCollector(nextPid, at);
      return;
    }

    ensureAssets();
    pid = nextPid;
    mode = "forming";
    mix = 0;
    targetMix = 0;
    startedAt = performance.now();
    readableSince = 0;
    transitionCaptured = false;
    revealDelayMs = 520;
    whiteStartedAt = 0;
    collectorShown = false;

    const idx = indexByPrintId.get(nextPid);
    const frame = typeof idx === "number" ? frameMeshes[idx] : null;
    const anchor = anchorByPrintId.get(nextPid);
    const at = frame ? frame.position.clone() : anchor ? anchor.clone() : new THREE.Vector3(rig.position.x, 0, rig.position.z - 1);

    const portalAhead = THREE.MathUtils.clamp(cfg.portalAheadM, 3.6, 4.4);
    const px = THREE.MathUtils.lerp(at.x, 0, 0.18);
    const pz = at.z - portalAhead;

    portalPos.set(px, 0, pz);
    center.copy(portalPos);

    viewDir.set(rig.position.x - px, 0, rig.position.z - pz);
    if (viewDir.lengthSq() < 0.0001) viewDir.set(0, 0, 1);
    viewDir.normalize();

    setBeaconToPoint(portalPos);
    collectorGroup.visible = false;
    seed(portalPos);
  }

  function update(dtMs, tNow) {
    if (!cfg.enabled || mode === "off") return;

    const mixK = 1 - Math.pow(0.5, dtMs / Math.max(1, cfg.transitionMs));
    mix += (targetMix - mix) * mixK;

    if (mode === "forming") {
      ensureAssets();
      const formingElapsed = Math.max(0, (tNow - startedAt) - revealDelayMs);
      const formingSpanMs = Math.max(cfg.formingMinMs, 10200);
      const formT = clamp01(formingElapsed / formingSpanMs);

      const revealT = smooth01((formT - 0.08) / 0.28);
      const gatherT = smooth01((formT - 0.30) / 0.38);

      const fadeK = 1 - Math.pow(0.5, dtMs / 220);

      bodyMat.opacity += (Math.min(1, cfg.soulsOpacity * (0.04 + 0.34 * revealT)) - bodyMat.opacity) * fadeK;
      trailAMat.opacity += (Math.min(1, cfg.soulsOpacity * (0.012 + 0.10 * revealT)) - trailAMat.opacity) * fadeK;
      trailBMat.opacity += (Math.min(1, cfg.soulsOpacity * (0.004 + 0.035 * revealT)) - trailBMat.opacity) * fadeK;

      writeField(tNow, revealT, gatherT, 0, dtMs);

      if (core && coreMat) {
        const camBill = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
        core.quaternion.copy(camBill.quaternion);
        core.position.set(portalPos.x, 1.18, portalPos.z);
        const pulse = 1 + 0.035 * Math.sin(tNow * 0.0026);
        const s = THREE.MathUtils.lerp(0.92, 1.48, gatherT) * pulse;
        core.scale.set(s, s, 1);
        const coreTarget = 0.035 + 0.12 * gatherT;
        const coreK = 1 - Math.pow(0.5, dtMs / 220);
        coreMat.opacity += (coreTarget - coreMat.opacity) * coreK;
      }

      const dx = rig.position.x - portalPos.x;
      const dz = rig.position.z - portalPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const activeCam = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
      activeCam.getWorldDirection(tmp);
      tmp.y = 0;
      if (tmp.lengthSq() > 0.0001) tmp.normalize();
      tmp2.set(portalPos.x - rig.position.x, 0, portalPos.z - rig.position.z);
      if (tmp2.lengthSq() > 0.0001) tmp2.normalize();
      const facingDot = tmp.dot(tmp2);
      const facingPortal = facingDot > 0.2;
      const soulsReadable = bodyMat.opacity > 0.24 && gatherT > 0.52;
      const triggerRadius = Math.max(cfg.portalDistance, 2.8);
      const canEnterWhite =
        formingElapsed >= formingSpanMs * 1.05 &&
        d < triggerRadius &&
        facingPortal &&
        soulsReadable;

      if (canEnterWhite) {
        if (!readableSince) readableSince = tNow;
      } else {
        readableSince = 0;
      }

      if (readableSince && (tNow - readableSince) >= readableHoldMs) {
        if (!transitionCaptured) {
          startBg.copy(scene.background);
          startFog.copy(scene.fog?.color || scene.background);
          startFloor.copy(floorMat.color);
          startAmbient = ambient.intensity;
          startDir = dir.intensity;
          startHemi = hemi.intensity;
          startFloorEmissive = floorMat.emissiveIntensity;
          transitionCaptured = true;
        }
        mode = "transition";
        targetMix = 1;
        readableSince = 0;
      }
    }

    if (mode === "transition" || mode === "white") {
      ensureAssets();
      const revealT = 1;
      const gatherT = THREE.MathUtils.lerp(0.94, 0.99, mix);
      const disperseT = smooth01((mix - 0.24) / 0.54);
      const fadeK = 1 - Math.pow(0.5, dtMs / 900);
      const visualMix = smooth01(clamp01((mix - 0.06) / 0.94));

      bodyMat.opacity += (cfg.soulsOpacity * (0.008 + (1 - mix) * 0.030) - bodyMat.opacity) * fadeK;
      trailAMat.opacity += (cfg.soulsOpacity * (0.002 + (1 - mix) * 0.010) - trailAMat.opacity) * fadeK;
      trailBMat.opacity += (cfg.soulsOpacity * (0.000 + (1 - mix) * 0.003) - trailBMat.opacity) * fadeK;

      writeField(tNow, revealT, gatherT, disperseT, dtMs);

      if (core && coreMat) {
        const camBill = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
        core.quaternion.copy(camBill.quaternion);
        core.position.set(portalPos.x, 1.18, portalPos.z);
        const pulse = 1 + 0.03 * Math.sin(tNow * 0.0022);
        const s = THREE.MathUtils.lerp(1.02, 1.42, mix) * pulse;
        core.scale.set(s, s, 1);
        const coreTarget = 0.05 + (1 - mix) * 0.03;
        coreMat.opacity += (coreTarget - coreMat.opacity) * fadeK;
      }

      const whiteBg = new THREE.Color(0xe2e5e0);
      const whiteFog = new THREE.Color(0xd9ddd8);
      const whiteFloor = new THREE.Color(0xd5ddd7);

      if (scene.background) {
        tmpCol.lerpColors(startBg, whiteBg, visualMix);
        scene.background.copy(tmpCol);
      }
      if (scene.fog) {
        tmpCol.lerpColors(startFog, whiteFog, visualMix);
        scene.fog.color.copy(tmpCol);
        scene.fog.near = corridorOn ? 2.0 : 3.0;
        scene.fog.far = corridorOn ? 18.0 : 10.0;
      }

      ambient.intensity = THREE.MathUtils.lerp(startAmbient, 0.92, visualMix);
      dir.intensity = THREE.MathUtils.lerp(startDir, 0.20, visualMix);
      hemi.intensity = THREE.MathUtils.lerp(startHemi, 0.34, visualMix);

      tmpCol.lerpColors(startFloor, whiteFloor, visualMix);
      floorMat.color.copy(tmpCol);
      floorMat.emissiveIntensity = THREE.MathUtils.lerp(startFloorEmissive, 0.18, visualMix);

      if (dustMat) dustMat.opacity = 0.18 * (1 - visualMix);

      if (mode === "transition" && visualMix > 0.985) {
        mode = "white";
        whiteStartedAt = tNow;
      }

      if (mode === "white" && !collectorShown && whiteStartedAt && (tNow - whiteStartedAt) > 1700) {
        collectorShown = true;
        if (pid) showCollector(pid, portalPos);
      }
    }
  }

  function dispose() {
    try {
      if (body) scene.remove(body);
      if (trailA) scene.remove(trailA);
      if (trailB) scene.remove(trailB);
      if (core) scene.remove(core);
      body?.geometry?.dispose?.();
      trailA?.geometry?.dispose?.();
      trailB?.geometry?.dispose?.();
      bodyMat?.dispose?.();
      trailAMat?.dispose?.();
      trailBMat?.dispose?.();
      core?.geometry?.dispose?.();
      coreMat?.dispose?.();
      bodyTex?.dispose?.();
      coreTex?.dispose?.();
    } catch {}
  }

  return {
    start,
    update,
    dispose,
  };
}
