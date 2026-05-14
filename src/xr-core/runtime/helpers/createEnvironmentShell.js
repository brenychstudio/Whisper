import * as THREE from "three";
import {
  makeDotTexture,
  makeLinearGlowTexture,
  makeRadialGradientTexture,
  makeVerticalHazeTexture,
} from "./xrTextureHelpers.js";

export function createEnvironmentShell({
  scene,
  stage,
  works,
  spacing,
  zStart,
  zEnd,
  midZ,
  curveX,
  hazeBaseOpacity = 0.055,
}) {
  let groundTex = null;
  let hazeTex = null;
  let poolTex = null;
  let dustTex = null;
  let seamTex = null;

  let groundGlowGeo = null;
  let hazeGeo = null;
  let poolGeo = null;

  let dustGeo = null;
  let dustMat = null;
  let dustVel = null;
  let DUST = 0;
  let hazeMat = null;

  const pointLights = [];
  const monoliths = [];
  const pools = [];
  const veils = [];
  const seams = [];
  const thresholds = [];
  const driftLines = [];

  groundTex = makeRadialGradientTexture(512);
  groundGlowGeo = new THREE.PlaneGeometry(160, 160);
  const groundGlow = new THREE.Mesh(
    groundGlowGeo,
    new THREE.MeshBasicMaterial({
      map: groundTex,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.y = 0.006;
  scene.add(groundGlow);

  hazeTex = makeVerticalHazeTexture(256, 1024);
  hazeGeo = new THREE.CylinderGeometry(72, 72, 24, 64, 1, true);
  hazeMat = new THREE.MeshBasicMaterial({
    map: hazeTex,
    transparent: true,
    opacity: hazeBaseOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const haze = new THREE.Mesh(hazeGeo, hazeMat);
  if (stage === "sea") {
    haze.material.color.set("#0b1f2a");
  }
  if (stage === "forest") {
    haze.material.color.set("#0f1a12");
  }
  haze.position.set(0, 8.8, midZ - 0.4);
  scene.add(haze);

  const poolCount = Math.min(6, Math.max(3, Math.ceil(works.length / 3)));
  for (let i = 0; i < poolCount; i++) {
    const p = i / (poolCount - 1 || 1);
    const z = THREE.MathUtils.lerp(zStart - 1.0, zEnd + 2.0, p);
    const idx = p * Math.max(1, works.length - 1);
    const x = curveX(idx);
    const zone = works[Math.min(works.length - 1, Math.max(0, Math.round(idx)))]?.zoneId;
    const pl = new THREE.PointLight(zone === "forest" ? 0xc8ffe2 : 0xdfe7ff, 0.32, 24.0, 2.0);
    pl.position.set(x, 3.65, z);
    scene.add(pl);
    pointLights.push(pl);
  }

  const monoGeo = new THREE.PlaneGeometry(3.2, 9.5);
  const monoMat = new THREE.MeshBasicMaterial({
    color: 0x0c1017,
    transparent: true,
    opacity: 0.085,
    depthWrite: false,
    fog: true,
  });

  const monoData = [
    { x: -7.8, y: 4.8, z: zStart - 4.0, ry: 0.12, sx: 1.0, sy: 1.0 },
    { x: 7.4, y: 4.6, z: zStart - 8.5, ry: -0.16, sx: 1.2, sy: 1.05 },
    { x: -8.6, y: 5.0, z: midZ - 2.0, ry: 0.08, sx: 0.95, sy: 1.2 },
    { x: 8.2, y: 4.7, z: midZ - 6.0, ry: -0.10, sx: 1.1, sy: 1.0 },
    { x: -7.2, y: 4.9, z: zEnd + 3.0, ry: 0.16, sx: 1.15, sy: 1.15 },
    { x: 7.8, y: 4.5, z: zEnd - 1.5, ry: -0.08, sx: 0.9, sy: 1.0 },
  ];

  for (const m of monoData) {
    const mono = new THREE.Mesh(monoGeo, monoMat.clone());
    mono.position.set(m.x, m.y, m.z);
    mono.rotation.y = m.ry;
    mono.scale.set(m.sx, m.sy, 1);
    scene.add(mono);
    mono.position.y += Math.random() * 0.6;
    mono.rotation.y += (Math.random() - 0.5) * 0.2;
    monoliths.push(mono);
  }

  const veilGeo = new THREE.PlaneGeometry(5.8, 5.2);
  const veilMat = new THREE.MeshBasicMaterial({
    color: stage === "forest" ? 0x102018 : 0x0b1724,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });

  for (let i = 0; i < works.length; i += 2) {
    const z = -(i * spacing) - 0.45;
    const x = curveX(i) + (i % 4 === 0 ? -2.75 : 2.75);
    const veil = new THREE.Mesh(veilGeo, veilMat.clone());
    veil.position.set(x, 2.8, z);
    veil.rotation.y = i % 4 === 0 ? 0.35 : -0.35;
    veil.scale.set(0.9 + Math.random() * 0.35, 0.88 + Math.random() * 0.28, 1);
    scene.add(veil);
    veils.push(veil);
  }

  poolTex = makeRadialGradientTexture(512);
  poolGeo = new THREE.PlaneGeometry(3.4, 2.85);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  for (let i = 0; i < works.length; i++) {
    const x = curveX(i);
    const z = -(i * spacing) + 1.35;
    const pool = new THREE.Mesh(poolGeo, poolMat.clone());
    pool.rotation.x = -Math.PI / 2;
    pool.rotation.z = 0.22;
    pool.position.set(x, 0.004, z);
    scene.add(pool);
    pools.push(pool);
  }

  seamTex = makeLinearGlowTexture(512, 96);
  const seamGeo = new THREE.PlaneGeometry(4.8, 0.42);
  const seamMat = new THREE.MeshBasicMaterial({
    map: seamTex || null,
    color: stage === "forest" ? 0xc5ffe0 : 0xdbe8ff,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  for (let i = 0; i < works.length; i++) {
    const z = -(i * spacing) + 0.96;
    const x = curveX(i);
    const seam = new THREE.Mesh(seamGeo, seamMat.clone());
    seam.rotation.x = -Math.PI / 2;
    seam.rotation.z = 0.02 + Math.sin(i * 1.7) * 0.08;
    seam.position.set(x, 0.011, z);
    seam.scale.set(0.72 + (i % 3) * 0.12, 0.8, 1);
    scene.add(seam);
    seams.push(seam);
  }

  const thresholdColor = stage === "forest" ? 0xbfffd7 : 0xd7e7ff;
  const thresholdMat = new THREE.MeshBasicMaterial({
    map: seamTex || null,
    color: thresholdColor,
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const thresholdSideGeo = new THREE.PlaneGeometry(0.16, 2.95);
  const thresholdTopGeo = new THREE.PlaneGeometry(4.85, 0.18);

  for (let i = 0; i < works.length; i++) {
    const x = curveX(i);
    const z = -(i * spacing) + 0.18;
    const width = 2.25 + (i % 2) * 0.35;
    const y = 1.72;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.sin(i * 1.2) * 0.035;

    const left = new THREE.Mesh(thresholdSideGeo, thresholdMat.clone());
    left.position.set(-width, y, 0);
    left.scale.y = 0.9 + (i % 3) * 0.08;
    group.add(left);

    const right = new THREE.Mesh(thresholdSideGeo, thresholdMat.clone());
    right.position.set(width, y, 0);
    right.scale.y = 0.9 + ((i + 1) % 3) * 0.08;
    group.add(right);

    const top = new THREE.Mesh(thresholdTopGeo, thresholdMat.clone());
    top.position.set(0, 3.12, 0);
    top.scale.x = width / 2.25;
    group.add(top);

    scene.add(group);
    thresholds.push({ group, left, right, top, seed: i * 0.73 });
  }

  const driftMat = new THREE.MeshBasicMaterial({
    map: seamTex || null,
    color: stage === "forest" ? 0xdfffe8 : 0xe4efff,
    transparent: true,
    opacity: 0.028,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const driftGeo = new THREE.PlaneGeometry(2.8, 0.11);
  const driftCount = Math.min(18, Math.max(8, works.length * 2));

  for (let i = 0; i < driftCount; i++) {
    const p = i / Math.max(1, driftCount - 1);
    const z = THREE.MathUtils.lerp(zStart - 1.5, zEnd + 2.5, p);
    const idx = p * Math.max(1, works.length - 1);
    const line = new THREE.Mesh(driftGeo, driftMat.clone());
    line.position.set(
      curveX(idx) + (Math.random() - 0.5) * 7.6,
      2.1 + Math.random() * 2.2,
      z
    );
    line.rotation.set(
      (Math.random() - 0.5) * 0.32,
      (Math.random() - 0.5) * 0.56,
      (Math.random() - 0.5) * 0.9
    );
    line.scale.x = 0.62 + Math.random() * 0.85;
    scene.add(line);
    driftLines.push({ line, seed: Math.random() * Math.PI * 2 });
  }

  dustTex = makeDotTexture();
  DUST = 560;

  const dustPos = new Float32Array(DUST * 3);
  dustVel = new Float32Array(DUST * 3);

  for (let i = 0; i < DUST; i++) {
    const z = THREE.MathUtils.lerp(zStart - 1.0, zEnd + 2.0, Math.random());
    dustPos[i * 3 + 0] = (Math.random() - 0.5) * 10.4;
    dustPos[i * 3 + 1] = 0.55 + Math.random() * 4.4;
    dustPos[i * 3 + 2] = z;

    dustVel[i * 3 + 0] = (Math.random() - 0.5) * 0.018;
    dustVel[i * 3 + 1] = (Math.random() - 0.5) * 0.012;
    dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.018;
  }

  dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));

  dustMat = new THREE.PointsMaterial({
    map: dustTex || null,
    transparent: true,
    opacity: 0.13,
    size: 0.03,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color: stage === "forest" ? 0xe8f3e8 : 0xe7efff,
  });

  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  const update = (dtMs = 16, tNow = performance.now(), mood = stage === "forest" ? 1 : 0) => {
    const t = tNow * 0.001;
    const dt = Math.min(0.05, Math.max(0, dtMs / 1000));

    groundGlow.material.opacity = 0.21 + Math.sin(t * 0.34) * 0.032;
    hazeMat.opacity = hazeBaseOpacity * (1.28 + Math.sin(t * 0.18) * 0.18);

    for (let i = 0; i < pools.length; i += 1) {
      const pool = pools[i];
      pool.rotation.z += dt * (0.012 + (i % 3) * 0.002);
      pool.material.opacity = 0.14 + Math.sin(t * 0.42 + i * 0.7) * 0.035;
    }

    for (let i = 0; i < seams.length; i += 1) {
      const seam = seams[i];
      seam.material.opacity = 0.11 + Math.sin(t * 0.55 + i * 0.9) * 0.05;
    }

    for (let i = 0; i < thresholds.length; i += 1) {
      const threshold = thresholds[i];
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.34 + threshold.seed);
      const opacity = 0.018 + pulse * 0.045;
      threshold.group.position.y = Math.sin(t * 0.18 + threshold.seed) * 0.015;
      threshold.left.material.opacity = opacity;
      threshold.right.material.opacity = opacity * 0.86;
      threshold.top.material.opacity = opacity * 0.42;
    }

    for (let i = 0; i < driftLines.length; i += 1) {
      const item = driftLines[i];
      item.line.position.y += Math.sin(t * 0.22 + item.seed) * 0.0007;
      item.line.position.x += Math.sin(t * 0.15 + item.seed) * 0.0008;
      item.line.material.opacity = 0.012 + Math.sin(t * 0.31 + item.seed) * 0.01;
    }

    for (let i = 0; i < veils.length; i += 1) {
      const veil = veils[i];
      veil.position.y += Math.sin(t * 0.18 + i) * 0.0008;
      veil.material.opacity = 0.06 + Math.sin(t * 0.23 + i * 1.4) * 0.024;
    }

    for (let i = 0; i < pointLights.length; i += 1) {
      const light = pointLights[i];
      light.intensity = 0.27 + Math.sin(t * 0.36 + i * 1.15) * 0.075 + mood * 0.035;
    }
  };

  const dispose = () => {
    try {
      scene.remove(groundGlow);
      groundGlow.geometry.dispose();
      groundGlow.material.dispose();
    } catch {}

    try {
      scene.remove(haze);
      haze.geometry.dispose();
      haze.material.dispose();
    } catch {}

    try {
      pointLights.forEach((pl) => scene.remove(pl));
    } catch {}

    try {
      monoliths.forEach((mono) => {
        scene.remove(mono);
        mono.geometry.dispose();
        mono.material.dispose();
      });
    } catch {}

    try {
      veils.forEach((veil) => {
        scene.remove(veil);
        veil.geometry.dispose();
        veil.material.dispose();
      });
    } catch {}

    try {
      pools.forEach((pool) => {
        scene.remove(pool);
        pool.geometry.dispose();
        pool.material.dispose();
      });
    } catch {}

    try {
      seams.forEach((seam) => {
        scene.remove(seam);
        seam.geometry.dispose();
        seam.material.dispose();
      });
    } catch {}

    try {
      thresholds.forEach(({ group }) => {
        group.traverse((child) => {
          if (child?.isMesh) {
            child.geometry?.dispose?.();
            child.material?.dispose?.();
          }
        });
        scene.remove(group);
      });
    } catch {}

    try {
      driftLines.forEach(({ line }) => {
        scene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
      });
    } catch {}

    try {
      scene.remove(dust);
      dust.geometry.dispose();
      dust.material.dispose();
    } catch {}

    try {
      groundTex?.dispose?.();
      hazeTex?.dispose?.();
      poolTex?.dispose?.();
      dustTex?.dispose?.();
      seamTex?.dispose?.();
    } catch {}
  };

  return {
    groundGlow,
    haze,
    hazeMat,
    pools,
    monoliths,
    veils,
    seams,
    thresholds,
    driftLines,
    dust,
    dustMat,
    dustGeo,
    dustVel,
    DUST,
    pointLights,
    update,
    dispose,
  };
}
