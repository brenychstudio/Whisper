import * as THREE from "three";
import QRCode from "qrcode";

export function createCollectorPanel({
  scene,
  sharePathForId,
  absShareUrlForId,
  collectorPanelMs = 12000,
}) {
  const collectorGroup = new THREE.Group();
  collectorGroup.visible = false;
  scene.add(collectorGroup);

  const collectorPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.56),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  collectorPlane.position.set(0, 1.48, 0);
  collectorGroup.add(collectorPlane);

  const collectorBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.62),
    new THREE.MeshBasicMaterial({
      color: 0x0d1020,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  collectorBg.position.set(0, 1.48, -0.001);
  collectorGroup.add(collectorBg);

  let collectorPid = "";
  let collectorAt = 0;
  let collectorTex = null;
  let collectorHover = false;

  const interactiveMeshes = [collectorPlane, collectorBg];

  const buildCollectorTexture = async (pid) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "rgba(6,8,14,0.96)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    const qrData = absShareUrlForId(pid);
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, qrData, {
      width: 252,
      margin: 0,
      color: { dark: "#f3f6ff", light: "#0a0d16" },
    });

    ctx.drawImage(qrCanvas, 44, 132, 252, 252);

    const x0 = 340;

    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Collect", x0, 78);

    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.font = "15px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Scan on phone", x0, 126);

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.fillText(sharePathForId(pid), x0, 162);

    ctx.fillStyle = "rgba(255,255,255,0.46)";
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("VR: point at panel + Trigger", x0, 214);
    ctx.fillText("Desktop: press C to copy, O to open", x0, 238);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  const show = async (pid, at) => {
    collectorPid = pid;
    collectorAt = at || performance.now();
    collectorHover = false;

    const p = at || { x: 0, z: 0 };
    const x = typeof p.x === "number" ? p.x : 0;
    const z = typeof p.z === "number" ? p.z : 0;

    collectorGroup.position.set(x, 0, z + 0.15);
    collectorGroup.visible = true;
    collectorGroup.scale.set(0.97, 0.97, 1);
    collectorPlane.material.opacity = 0.0;
    collectorBg.material.opacity = 0.0;

    try {
      if (collectorTex) collectorTex.dispose();
    } catch {
      void 0;
    }

    collectorTex = await buildCollectorTexture(pid);
    if (collectorTex) {
      collectorPlane.material.map = collectorTex;
      collectorPlane.material.needsUpdate = true;
    }
  };

  const hide = () => {
    collectorGroup.visible = false;
    collectorHover = false;
    collectorPid = "";
  };

  const open = () => {
    if (!collectorPid) return;
    const url = absShareUrlForId(collectorPid);
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      void 0;
    }
  };

  const copy = async () => {
    if (!collectorPid) return;
    const url = absShareUrlForId(collectorPid);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      void 0;
    }
  };

  const updatePanel = () => {
    if (!collectorGroup.visible) return;

    collectorPlane.material.opacity += (1.0 - collectorPlane.material.opacity) * 0.12;
    collectorBg.material.opacity += (0.24 - collectorBg.material.opacity) * 0.12;

    const sx = collectorGroup.scale.x + (1.0 - collectorGroup.scale.x) * 0.10;
    const sy = collectorGroup.scale.y + (1.0 - collectorGroup.scale.y) * 0.10;
    collectorGroup.scale.set(sx, sy, 1);

    if (collectorPanelMs > 0 && performance.now() - collectorAt > collectorPanelMs) {
      hide();
    }
  };

  const updateHover = (hovering) => {
    collectorHover = !!hovering;

    collectorBg.material.opacity += ((collectorHover ? 0.34 : 0.24) - collectorBg.material.opacity) * 0.16;
    collectorPlane.material.opacity += ((collectorHover ? 1.0 : 0.94) - collectorPlane.material.opacity) * 0.16;
  };

  const dispose = () => {
    try {
      if (collectorTex) collectorTex.dispose();
    } catch {
      void 0;
    }

    try {
      collectorPlane.material.map = null;
    } catch {
      void 0;
    }

    try {
      collectorPlane.geometry.dispose();
      collectorPlane.material.dispose();
    } catch {
      void 0;
    }

    try {
      collectorBg.geometry.dispose();
      collectorBg.material.dispose();
    } catch {
      void 0;
    }

    try {
      scene.remove(collectorGroup);
    } catch {
      void 0;
    }
  };

  return {
    group: collectorGroup,
    plane: collectorPlane,
    bg: collectorBg,
    interactiveMeshes,
    show,
    hide,
    open,
    copy,
    updatePanel,
    updateHover,
    dispose,
    getPid: () => collectorPid,
    isVisible: () => collectorGroup.visible,
  };
}
