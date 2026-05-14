import * as THREE from "three";

function makeGateGlowTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.5
  );
  g.addColorStop(0.0, "rgba(255,255,255,0.42)");
  g.addColorStop(0.24, "rgba(190,225,255,0.18)");
  g.addColorStop(0.54, "rgba(165,255,210,0.075)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeGateRingTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = "lighter";

  ctx.filter = `blur(${Math.max(2, size * 0.018)}px)`;
  ctx.strokeStyle = "rgba(210,255,232,0.26)";
  ctx.lineWidth = size * 0.052;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.255, size * 0.405, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.filter = `blur(${Math.max(1, size * 0.008)}px)`;
  ctx.strokeStyle = "rgba(238,255,245,0.54)";
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.255, size * 0.405, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.filter = "none";
  ctx.strokeStyle = "rgba(180,220,255,0.20)";
  ctx.lineWidth = size * 0.006;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.235, size * 0.378, 0, Math.PI * 0.08, Math.PI * 1.78);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeGateParticleTexture(size = 64) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,255,255,0.82)");
  g.addColorStop(0.34, "rgba(230,255,235,0.34)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createGateCue({
  scene,
  dir,
  hemi,
  floorMat,
  getBaseDirIntensity,
  getBaseHemiIntensity,
  getBaseFloorEmissive,
  getViewerPosition,
}) {
  let gate = null;
  let gatePos = null;
  let gateCue = 0;
  let gateReveal = 0;
  let gateRevealTarget = 0;
  let glowTex = null;
  let ringTex = null;
  let particleTex = null;

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

    glowTex = makeGateGlowTexture(384);
    ringTex = makeGateRingTexture(512);
    particleTex = makeGateParticleTexture(64);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.05, 3.55),
      new THREE.MeshBasicMaterial({
        map: glowTex || null,
        color: 0xdffff0,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    );
    plane.position.set(0, 1.5, 0);
    gateGroup.add(plane);

    const edge = new THREE.Mesh(
      new THREE.PlaneGeometry(3.05, 3.55),
      new THREE.MeshBasicMaterial({
        map: ringTex || null,
        color: 0xe8fff3,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    edge.position.set(0, 1.5, 0.004);
    gateGroup.add(edge);

    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(2.55, 3.05),
      new THREE.MeshBasicMaterial({
        map: glowTex || null,
        color: 0xcaffeb,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(0, 1.5, 0.002);
    gateGroup.add(beam);

    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.62, 96),
      new THREE.MeshBasicMaterial({
        color: 0xc8ffe2,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(0, 0.025, 0.12);
    floorRing.scale.set(1.08, 0.54, 1);
    gateGroup.add(floorRing);

    const tendrils = [];
    const tendrilMat = new THREE.MeshBasicMaterial({
      color: 0xd8ffe6,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const tendrilGeo = new THREE.PlaneGeometry(0.025, 0.82);
    for (let i = 0; i < 4; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const tendril = new THREE.Mesh(tendrilGeo, tendrilMat.clone());
      const h = i / 3;
      tendril.position.set(side * (0.68 + h * 0.26), 0.54 + h * 0.34, 0.004 + i * 0.0005);
      tendril.rotation.z = side * (0.18 + h * 0.28);
      tendril.scale.y = 0.55 + h * 0.35;
      gateGroup.add(tendril);
      tendrils.push({ mesh: tendril, seed: i * 0.9 });
    }

    const portalLight = new THREE.PointLight(0xcaffeb, 0.0, 4.2, 2.1);
    portalLight.position.set(0, 1.35, 0.42);
    gateGroup.add(portalLight);

    const particleCount = 96;
    const particlePos = new Float32Array(particleCount * 3);
    const particleSeed = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      particlePos[i * 3 + 0] = Math.cos(a) * r * 0.88;
      particlePos[i * 3 + 1] = 0.38 + Math.random() * 2.32;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
      particleSeed[i] = Math.random() * Math.PI * 2;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        map: particleTex || null,
        color: 0xdfffe9,
        transparent: true,
        opacity: 0.0,
        size: 0.062,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      })
    );
    particles.frustumCulled = false;
    gateGroup.add(particles);

    gateGroup.userData.edge = edge;
    gateGroup.userData.beam = beam;
    gateGroup.userData.plane = plane;
    gateGroup.userData.floorRing = floorRing;
    gateGroup.userData.tendrils = tendrils;
    gateGroup.userData.portalLight = portalLight;
    gateGroup.userData.particles = particles;
    gateGroup.userData.particleSeed = particleSeed;
    gateGroup.visible = false;
    gateReveal = 0;
    gateRevealTarget = 0;

    scene.add(gateGroup);
    gate = gateGroup;

    return { gate, gatePos };
  };

  const trigger = () => {
    gateCue = 1;
  };

  const show = () => {
    gateRevealTarget = 1;
    if (gate) gate.visible = true;
  };

  const hide = () => {
    gateRevealTarget = 0;
  };

  const update = (dtMs) => {
    const baseDirIntensity = getBaseDirIntensity();
    const baseHemiIntensity = getBaseHemiIntensity();
    const baseFloorEmissive = getBaseFloorEmissive();
    const dt = Math.min(0.05, Math.max(0, dtMs / 1000));

    if (gateCue > 0) {
      gateCue = Math.max(0, gateCue - dtMs / 1200);
    }

    if (!gate || (!gate.visible && gateRevealTarget <= 0)) {
      gateReveal = 0;
      dir.intensity = baseDirIntensity;
      hemi.intensity = baseHemiIntensity;
      floorMat.emissiveIntensity = baseFloorEmissive;
      return;
    }

    gateReveal += (gateRevealTarget - gateReveal) * (1 - Math.pow(0.001, dtMs / 620));
    if (gateRevealTarget <= 0 && gateReveal < 0.012) {
      gateReveal = 0;
      if (gate) gate.visible = false;
    }

    const k = gateCue;
    const reveal = THREE.MathUtils.clamp(gateReveal, 0, 1);
    let proximity = 0;
    try {
      const viewer = getViewerPosition?.();
      if (viewer && gatePos) {
        const dx = viewer.x - gatePos.x;
        const dz = viewer.z - gatePos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        proximity = THREE.MathUtils.clamp(1 - d / 3.25, 0, 1);
      }
    } catch {
      proximity = 0;
    }
    const livingPulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.0011);
    const reactive = reveal * (0.35 * proximity + 0.12 * proximity * livingPulse);

    dir.intensity = baseDirIntensity + reveal * 0.05 + 0.18 * k + reactive * 0.12;
    hemi.intensity = baseHemiIntensity + reveal * 0.035 + 0.10 * k + reactive * 0.08;
    floorMat.emissiveIntensity = baseFloorEmissive + reveal * 0.035 + 0.08 * k + reactive * 0.045;

    if (gate && gate.visible) {
      const beamMesh = gate.userData?.beam;
      const edgeMesh = gate.userData?.edge;
      const planeMesh = gate.userData?.plane;
      const floorRing = gate.userData?.floorRing;
      const tendrils = gate.userData?.tendrils || [];
      const portalLight = gate.userData?.portalLight;
      const particles = gate.userData?.particles;
      const particleSeed = gate.userData?.particleSeed;
      const t = performance.now() * 0.001;

      gate.scale.set(0.955 + reveal * 0.045, 0.92 + reveal * 0.08, 1);

      if (beamMesh?.material) {
        beamMesh.material.opacity =
          reveal * (0.12 + 0.22 * k + proximity * 0.08 + Math.sin(t * 0.72) * 0.018);
      }

      if (edgeMesh?.material) {
        edgeMesh.material.opacity =
          reveal * (0.28 + 0.32 * k + proximity * 0.11 + Math.sin(t * 1.2) * 0.035);
      }

      if (planeMesh?.material) {
        planeMesh.material.opacity = reveal * (0.06 + 0.11 * k + proximity * 0.045);
      }

      if (floorRing?.material) {
        floorRing.material.opacity = reveal * (0.16 + 0.26 * k + proximity * 0.16);
        floorRing.rotation.z += dt * (0.22 + proximity * 0.32);
      }

      if (portalLight) {
        portalLight.intensity =
          reveal * (0.24 + 0.58 * k + proximity * 0.34 + Math.sin(t * 0.95) * 0.045);
      }

      if (beamMesh) {
        const s = 1 + 0.08 * k + proximity * 0.035 + Math.sin(t * 0.9) * 0.016;
        beamMesh.scale.set(s, s, 1);
      }

      if (edgeMesh) {
        const sx = 1 + proximity * 0.025 + Math.sin(t * 0.42) * 0.012;
        const sy = 1 + proximity * 0.035 + Math.cos(t * 0.37) * 0.014;
        edgeMesh.scale.set(sx, sy, 1);
      }

      for (const item of tendrils) {
        const mesh = item.mesh;
        if (!mesh) continue;
        mesh.position.y += Math.sin(t * 0.75 + item.seed) * 0.0009;
        mesh.material.opacity =
          reveal * (0.025 + 0.045 * k + Math.sin(t * 0.8 + item.seed) * 0.012);
      }

      if (particles?.geometry?.attributes?.position && particleSeed) {
        const arr = particles.geometry.attributes.position.array;
        const particleLift = dt * (0.16 + proximity * 0.22);
        for (let i = 0; i < particleSeed.length; i += 1) {
          const seed = particleSeed[i];
          arr[i * 3 + 1] += Math.sin(t * 0.72 + seed) * (0.0018 + proximity * 0.0024) + particleLift;
          arr[i * 3 + 0] += Math.sin(t * 0.58 + seed) * (0.0022 + proximity * 0.0022);
          arr[i * 3 + 2] += Math.cos(t * 0.47 + seed) * (0.0014 + proximity * 0.0018);
          if (arr[i * 3 + 1] > 2.85) {
            const a = seed + t * 0.18;
            const r = 0.18 + Math.abs(Math.sin(seed * 1.7)) * 0.74;
            arr[i * 3 + 0] = Math.cos(a) * r;
            arr[i * 3 + 1] = 0.36;
            arr[i * 3 + 2] = (Math.sin(seed * 2.3) - 0.5) * 0.18;
          }
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.material.opacity =
          reveal * (0.18 + 0.22 * k + proximity * 0.16 + Math.sin(t * 1.1) * 0.025);
      }
    }
  };

  const dispose = () => {
    try {
      if (!gate) return;

      const plane = gate.userData?.plane;
      const edge = gate.userData?.edge;
      const beam = gate.userData?.beam;
      const floorRing = gate.userData?.floorRing;
      const tendrils = gate.userData?.tendrils || [];
      const portalLight = gate.userData?.portalLight;
      const particles = gate.userData?.particles;

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
        floorRing?.geometry?.dispose?.();
        floorRing?.material?.dispose?.();
      } catch {
        void 0;
      }

      try {
        if (portalLight) gate.remove(portalLight);
      } catch {
        void 0;
      }

      try {
        tendrils.forEach(({ mesh }) => {
          mesh?.geometry?.dispose?.();
          mesh?.material?.dispose?.();
        });
      } catch {
        void 0;
      }

      try {
        particles?.geometry?.dispose?.();
        particles?.material?.dispose?.();
      } catch {
        void 0;
      }

      try {
        glowTex?.dispose?.();
        ringTex?.dispose?.();
        particleTex?.dispose?.();
        glowTex = null;
        ringTex = null;
        particleTex = null;
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
      gateReveal = 0;
      gateRevealTarget = 0;
    } catch {
      void 0;
    }
  };

  return {
    createAt,
    trigger,
    show,
    hide,
    update,
    dispose,
    getGate: () => gate,
    getGatePos: () => gatePos,
  };
}
