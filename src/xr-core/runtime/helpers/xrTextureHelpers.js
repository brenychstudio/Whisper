import * as THREE from "three";

export function makeDotTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeSoulTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  halo.addColorStop(0.0, "rgba(255,255,255,1.0)");
  halo.addColorStop(0.12, "rgba(255,255,255,0.92)");
  halo.addColorStop(0.28, "rgba(220,242,255,0.46)");
  halo.addColorStop(0.58, "rgba(120,190,255,0.14)");
  halo.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.18);
  core.addColorStop(0.0, "rgba(255,255,255,1.0)");
  core.addColorStop(0.48, "rgba(255,255,255,0.75)");
  core.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.42;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.16, size * 0.055, -0.52, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeSilvanTexture(size = 160) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  ctx.clearRect(0, 0, size, size);

  const body = ctx.createRadialGradient(cx, size * 0.58, 0, cx, size * 0.58, size * 0.42);
  body.addColorStop(0.0, "rgba(255,255,255,0.88)");
  body.addColorStop(0.16, "rgba(235,255,220,0.5)");
  body.addColorStop(0.42, "rgba(155,225,150,0.16)");
  body.addColorStop(0.76, "rgba(95,165,115,0.04)");
  body.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = "lighter";

  const stem = ctx.createLinearGradient(0, size * 0.08, 0, size * 0.96);
  stem.addColorStop(0.0, "rgba(255,255,255,0.0)");
  stem.addColorStop(0.22, "rgba(235,255,226,0.32)");
  stem.addColorStop(0.52, "rgba(255,255,255,0.46)");
  stem.addColorStop(0.78, "rgba(188,255,190,0.18)");
  stem.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.strokeStyle = stem;
  ctx.lineWidth = size * 0.018;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.04, size * 0.16);
  ctx.bezierCurveTo(cx - size * 0.15, size * 0.34, cx + size * 0.12, size * 0.58, cx - size * 0.03, size * 0.9);
  ctx.stroke();

  ctx.lineWidth = size * 0.008;
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.12, size * 0.26);
  ctx.bezierCurveTo(cx + size * 0.12, size * 0.42, cx - size * 0.2, size * 0.62, cx + size * 0.08, size * 0.82);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeRadialGradientTexture(size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.06,
    size / 2,
    size / 2,
    size * 0.62
  );
  g.addColorStop(0.0, "rgba(255,255,255,0.16)");
  g.addColorStop(0.22, "rgba(255,255,255,0.09)");
  g.addColorStop(0.48, "rgba(255,255,255,0.035)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeVerticalHazeTexture(w = 256, h = 1024) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, "rgba(255,255,255,0.0)");
  g.addColorStop(0.18, "rgba(255,255,255,0.045)");
  g.addColorStop(0.42, "rgba(255,255,255,0.09)");
  g.addColorStop(0.68, "rgba(255,255,255,0.075)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function makeLinearGlowTexture(w = 512, h = 128) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  const gx = ctx.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0.0, "rgba(255,255,255,0.0)");
  gx.addColorStop(0.22, "rgba(255,255,255,0.08)");
  gx.addColorStop(0.5, "rgba(255,255,255,0.18)");
  gx.addColorStop(0.78, "rgba(255,255,255,0.08)");
  gx.addColorStop(1.0, "rgba(255,255,255,0.0)");

  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0.0, "rgba(255,255,255,0.0)");
  gy.addColorStop(0.5, "rgba(255,255,255,1.0)");
  gy.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
