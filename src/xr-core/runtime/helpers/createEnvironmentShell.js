import * as THREE from "three";
import {
  makeDotTexture,
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

  groundTex = makeRadialGradientTexture(512);
  groundGlowGeo = new THREE.PlaneGeometry(160, 160);
  const groundGlow = new THREE.Mesh(
    groundGlowGeo,
    new THREE.MeshBasicMaterial({
      map: groundTex,
      transparent: true,
      opacity: 0.12,
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
    const pl = new THREE.PointLight(0xdfe7ff, 0.16, 18.0, 2.0);
    pl.position.set(x, 3.9, z);
    scene.add(pl);
    pointLights.push(pl);
  }

  const monoGeo = new THREE.PlaneGeometry(3.2, 9.5);
  const monoMat = new THREE.MeshBasicMaterial({
    color: 0x0c1017,
    transparent: true,
    opacity: 0.055,
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

  poolTex = makeRadialGradientTexture(512);
  poolGeo = new THREE.PlaneGeometry(3.4, 2.85);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.082,
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

  dustTex = makeDotTexture();
  DUST = 420;

  const dustPos = new Float32Array(DUST * 3);
  dustVel = new Float32Array(DUST * 3);

  for (let i = 0; i < DUST; i++) {
    const z = THREE.MathUtils.lerp(zStart - 1.0, zEnd + 2.0, Math.random());
    dustPos[i * 3 + 0] = (Math.random() - 0.5) * 8.8;
    dustPos[i * 3 + 1] = 0.8 + Math.random() * 3.8;
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
    opacity: 0.085,
    size: 0.034,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color: stage === "forest" ? 0xe8f3e8 : 0xe7efff,
  });

  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

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
      pools.forEach((pool) => {
        scene.remove(pool);
        pool.geometry.dispose();
        pool.material.dispose();
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
    } catch {}
  };

  return {
    groundGlow,
    haze,
    hazeMat,
    pools,
    monoliths,
    dust,
    dustMat,
    dustGeo,
    dustVel,
    DUST,
    pointLights,
    dispose,
  };
}
