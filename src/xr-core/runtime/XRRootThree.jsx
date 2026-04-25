// src/xr-core/runtime/XRRootThree.jsx
// WHISPER XR V1 extraction baseline:
// scene locked, helpers extracted incrementally, safe runtime state
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { createWhisperFinaleController } from "../../xr-experiences/whisper/finale/WhisperFinaleController.js";
import {
  makeDotTexture,
  makeRadialGradientTexture,
  makeVerticalHazeTexture,
} from "./helpers/xrTextureHelpers.js";
import { createAmbientAudioSystem } from "./helpers/createAmbientAudioSystem.js";
import { createCollectorPanel } from "./helpers/createCollectorPanel.js";
import { createGateCue } from "./helpers/createGateCue.js";
import { createLocomotionShell } from "./helpers/createLocomotionShell.js";
import { createEnvironmentShell } from "./helpers/createEnvironmentShell.js";
import { createInteractionShell } from "./helpers/createInteractionShell.js";
import { createHandPresenceSystem } from "./hands/createHandPresenceSystem.js";
import { createHandVisualProxySystem } from "./hands/createHandVisualProxySystem.js";
import { createHandGestureSelectSystem } from "./hands/createHandGestureSelectSystem.js";
import { createHandContactReadinessSystem } from "./hands/createHandContactReadinessSystem.js";
import { createHandLocomotionBridge } from "./hands/createHandLocomotionBridge.js";
// WHISPER XR V1 extraction baseline:
// scene locked, helpers extracted incrementally, safe runtime state

const clamp01 = (x) => Math.max(0, Math.min(1, x));
function getScreenAngleDeg() {
  if (typeof window === "undefined") return 0;
  return Number(window.screen?.orientation?.angle ?? window.orientation ?? 0) || 0;
}

function applyStableGyroLook(camera, alphaDeg, betaDeg, gammaDeg, alphaOffsetDeg = 0) {
  const screenAngle = getScreenAngleDeg();

  const yawDeg = -(alphaDeg - alphaOffsetDeg);

  let pitchDeg = 0;

  if (Math.abs(screenAngle) === 90) {
    // landscape
    pitchDeg = screenAngle === 90 ? -gammaDeg : gammaDeg;
  } else {
    // portrait fallback
    pitchDeg = betaDeg - 90;
  }

  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(pitchDeg, -80, 80));

  camera.rotation.order = "YXZ";
  camera.rotation.set(pitch, yaw, 0);
}

export default function XRRootThree({ manifest, options, xrSupported, xrChecked }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
let warmupVideos = () => {};
let playVideoStage = (_pid) => {};
let pauseAllVideoStages = () => {};
let ambientAudio = null;
let gateCueHelper = null;
let mobileHud = null;
let mobileStatus = null;
let mobilePermissionBtn = null;
let mobilePad = null;
let mobileCleanupFns = [];

    // ===== Config =====
    const maxDpr = options?.quality?.maxDpr ?? 1.6;
    const gazeHoldMs = options?.timings?.gazeHoldMs ?? 1400;
    const videoGazeHoldMs = options?.timings?.videoGazeHoldMs ?? 4200;
    const videoMinWatchMs = options?.timings?.videoMinWatchMs ?? 2400;
    const stagingHalfLifeMs = options?.timings?.stagingHalfLifeMs ?? 240;

    // Sea-zone living Aquasouls (ambient) — optional, Quest-safe.
    const seaSoulsCfg = options?.seaSouls || {};
    const seaSoulsEnabled = seaSoulsCfg?.enabled !== false; // default ON
    const seaSoulsCount = Math.max(0, Math.floor(seaSoulsCfg?.count ?? 64));
    const seaSoulsBigCount = Math.max(0, Math.floor(seaSoulsCfg?.bigCount ?? 18));
    const seaSoulsBaseOpacity = seaSoulsCfg?.opacity ?? 0.11;
    const seaSoulsTrailOpacity = seaSoulsCfg?.trailOpacity ?? 0.045;
    const seaSoulsSize = seaSoulsCfg?.size ?? 0.085;
    const seaSoulsBigSize = seaSoulsCfg?.bigSize ?? 0.15;
    const seaSoulsSpeed = seaSoulsCfg?.speed ?? 1.0;
    const seaSoulsProxRadius = seaSoulsCfg?.proximityRadius ?? 1.6;

    // Finale (installation act) — optional, Quest-safe.
    const finaleCfg = options?.finale || {};
    const finaleEnabled = finaleCfg?.enabled === true;
    const finaleSoulsCount = Math.max(8, Math.min(144, finaleCfg?.soulsCount ?? 24));
    const finaleSoulsSpawnR = finaleCfg?.soulsSpawnR ?? 6.8;            // how far souls start (meters)
    const finaleSoulsSpawnRJitter = finaleCfg?.soulsSpawnRJitter ?? 3.8; // extra radius random
    const finaleSoulsAttract = finaleCfg?.soulsAttract ?? 0.42;          // pull towards portal
    const finaleSoulsSwirl = finaleCfg?.soulsSwirl ?? 0.95;              // vortex strength
    const finaleSoulsDamp = finaleCfg?.soulsDamp ?? 0.976;               // damping (lower = faster)
    const finaleSoulsRise = finaleCfg?.soulsRise ?? 0.22;                // upward bias
    const finaleSoulsOpacity = finaleCfg?.soulsOpacity ?? 0.72;          // target opacity
    const finalePortalDistance = finaleCfg?.portalDistance ?? 1.2;
    const finalePortalAheadM = finaleCfg?.portalAheadM ?? 3.8;
    const finaleFormingMinMs = finaleCfg?.formingMinMs ?? 3200;
    const finaleTransitionMs = finaleCfg?.transitionMs ?? 1400;
    const finaleCodeRain = finaleCfg?.codeRain ?? "streaks";
    const finaleRainCount = Math.max(24, Math.min(120, finaleCfg?.rainCount ?? 64));
    const finaleRainHeight = finaleCfg?.rainHeight ?? 4.8;
    const finaleRainRadius = finaleCfg?.rainRadius ?? 1.6;

    const spacing = options?.layout?.spacing ?? 2.35;

    const frameMargin = options?.layout?.frameMargin ?? 1.03;
    const frameOpacity = options?.layout?.frameOpacity ?? 0.16;

    const mouseLookSpeed = options?.timings?.mouseLookSpeed ?? 0.35;

    const waveDurationMs = options?.timings?.waveDurationMs ?? 900;
    const pollenBurstCount = options?.timings?.pollenBurstCount ?? 26;

    const corridorOn = options?.layout?.corridor !== false; // default ON
    const collectorPanelMs = options?.timings?.collectorPanelMs ?? 12000;
    const handStyle = options?.hands || {
      color: 0xdfe7ea,
      opacity: 0.22,
      roughness: 0.12,
      metalness: 0.0,
    };

    const mobileGyroCfg = options?.mobileGyro || {};
    const mobileGyroEnabled = mobileGyroCfg?.enabled !== false;
    const mobileMoveSpeed = mobileGyroCfg?.moveSpeed ?? 1.18;
    const mobileStrafeSpeed = mobileGyroCfg?.strafeSpeed ?? 0.92;
    const mobileHudFade = mobileGyroCfg?.hudFade ?? 0.92;

    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const hasDeviceOrientation =
      typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    const needsOrientationPermission =
      typeof window !== "undefined" &&
      typeof window.DeviceOrientationEvent?.requestPermission === "function";

    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isHeadsetXRBrowser = /OculusBrowser|Quest/i.test(ua);

    const isMobileGyroCandidate =
      mobileGyroEnabled &&
      isCoarsePointer &&
      hasDeviceOrientation &&
      !isHeadsetXRBrowser;

    const snapTurnDeg = options?.locomotion?.snapTurnDeg ?? 30;
    const snapCooldownMs = options?.locomotion?.snapCooldownMs ?? 320;
    const vrInstructionsMs = options?.timings?.vrInstructionsMs ?? 8000;

    // Directed cinematics (curve)
    const curveAmp = options?.layout?.curveAmp ?? (corridorOn ? 0.45 : 0.85);
    const curveFreq = options?.layout?.curveFreq ?? 0.42;
    const curveX = (i) => curveAmp * Math.sin(i * curveFreq);

    // ===== Renderer =====
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    // VR Button (Quest only)
    let vrBtn = null;
    if (xrSupported) {
      const xrSessionInit = {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking"],
      };

      vrBtn = VRButton.createButton(renderer, xrSessionInit);
      vrBtn.id = "VRButton";
      host.appendChild(vrBtn);
      renderer.xr.addEventListener("sessionstart", () => {
  warmupVideos();
  ambientAudio?.start();
});
renderer.xr.addEventListener("sessionend", () => {
  pauseAllVideoStages();
});
    }

    // ===== Content ordering (beats-first) =====
    const artworks = Array.isArray(manifest?.artworks) ? manifest.artworks : [];
    const byPrintId = new Map(artworks.map((a) => [a.printId, a]));
    const beats = Array.isArray(manifest?.beats) ? manifest.beats : [];

    const beatsOrdered = beats
      .map((b) => (b?.artworkPrintId ? byPrintId.get(b.artworkPrintId) : null))
      .filter(Boolean);

    const works = (beatsOrdered.length ? beatsOrdered : artworks).slice(0, 14);
    const stage = works?.[0]?.zoneId || "sea";

    // ===== Scene =====
    const scene = new THREE.Scene();
    const envColor =
      corridorOn
        ? 0xf2f6f7
        : stage === "forest"
          ? 0x030806
          : 0x03060b;
    scene.background = new THREE.Color(envColor);
    scene.fog = new THREE.Fog(envColor, corridorOn ? 2.0 : 10.5, corridorOn ? 22.0 : 84.0);

    // ===== Camera + Rig =====
    const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.05, 80);
    camera.position.set(0, 1.6, 0);

    const rig = new THREE.Group();
    rig.position.set(0, 0, 3.6);
    rig.add(camera);
    scene.add(rig);

    const handPresence = createHandPresenceSystem({
      renderer,
      scene,
      rigParent: rig,
    });

    ambientAudio = createAmbientAudioSystem({
      camera,
      getMood: () => mood,
      seaUrl: "/audio/sea-1.mp3",
      forestUrl: "/audio/forest-1.mp3",
      seaBaseVolume: 0.22,
      forestBaseVolume: 0.18,
    });
    ambientAudio.init();

    // ===== Desktop mouse look / Mobile gyro =====
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = mouseLookSpeed;

    host.style.position = "relative";

    const hint = document.createElement("div");
    hint.style.position = "absolute";
    hint.style.left = "14px";
    hint.style.top = "14px";
    hint.style.padding = "10px 12px";
    hint.style.border = "1px solid rgba(255,255,255,0.12)";
    hint.style.background = "rgba(0,0,0,0.28)";
    hint.style.color = "rgba(255,255,255,0.62)";
    hint.style.letterSpacing = "0.18em";
    hint.style.textTransform = "uppercase";
    hint.style.fontSize = "10px";
    hint.style.pointerEvents = "none";
    hint.textContent = isMobileGyroCandidate
      ? "Mobile gyro preview • allow motion"
      : "Click to look • Esc to release";
    host.appendChild(hint);

    let gyroActive = false;
    let gyroPermissionGranted = !needsOrientationPermission;
    let gyroAlphaOffset = null;
    let gyroListening = false;
    const mobileMoveState = { forward: 0, strafe: 0 };

    const onCanvasClick = () => {
      if (renderer.xr.isPresenting || isMobileGyroCandidate) return;
      warmupVideos();
      ambientAudio?.start();
      controls.lock();
    };
    renderer.domElement.addEventListener("click", onCanvasClick);

    controls.addEventListener("lock", () => {
      hint.style.opacity = "0";
    });
    controls.addEventListener("unlock", () => {
      hint.style.opacity = "1";
    });

    const setMobileStatusText = (value) => {
      if (mobileStatus) mobileStatus.textContent = value;
    };

    const setMobileHudVisible = (value) => {
      if (!mobileHud) return;
      mobileHud.style.opacity = value ? String(mobileHudFade) : "0";
      mobileHud.style.pointerEvents = value ? "auto" : "none";
    };

    const onDeviceOrientation = (event) => {
      const alphaDeg = Number(event.alpha);
      const betaDeg = Number(event.beta);
      const gammaDeg = Number(event.gamma);
      if (![alphaDeg, betaDeg, gammaDeg].every(Number.isFinite)) return;

      if (gyroAlphaOffset == null) {
        gyroAlphaOffset = alphaDeg;
      }

      applyStableGyroLook(camera, alphaDeg, betaDeg, gammaDeg, gyroAlphaOffset);
      gyroActive = true;
    };

    const enableMobileGyro = async () => {
      if (!isMobileGyroCandidate || gyroListening) return true;
      try {
        if (needsOrientationPermission) {
          const result = await window.DeviceOrientationEvent.requestPermission();
          gyroPermissionGranted = result === "granted";
          if (!gyroPermissionGranted) {
            setMobileStatusText("Motion access denied");
            return false;
          }
        }

        window.addEventListener("deviceorientation", onDeviceOrientation, true);
        gyroListening = true;
        mobileCleanupFns.push(() =>
          window.removeEventListener("deviceorientation", onDeviceOrientation, true)
        );

        warmupVideos();
        ambientAudio?.start();
        setMobileStatusText("Gyro active");
        setMobileHudVisible(true);
        if (mobilePermissionBtn) mobilePermissionBtn.style.display = "none";
        hint.style.opacity = "0";
        return true;
      } catch {
        setMobileStatusText("Motion unavailable");
        return false;
      }
    };

    const makePadButton = (label, onStart, onEnd, extra = {}) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      Object.assign(btn.style, {
        width: extra.w || "58px",
        height: extra.h || "42px",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.28)",
        color: "rgba(255,255,255,0.82)",
        fontSize: "11px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        touchAction: "none",
      });

      const start = (e) => {
        e.preventDefault();
        onStart?.();
      };
      const end = (e) => {
        e.preventDefault();
        onEnd?.();
      };

      btn.addEventListener("touchstart", start, { passive: false });
      btn.addEventListener("touchend", end, { passive: false });
      btn.addEventListener("touchcancel", end, { passive: false });
      btn.addEventListener("pointerdown", start);
      btn.addEventListener("pointerup", end);
      btn.addEventListener("pointerleave", end);

      mobileCleanupFns.push(() => {
        btn.removeEventListener("touchstart", start);
        btn.removeEventListener("touchend", end);
        btn.removeEventListener("touchcancel", end);
        btn.removeEventListener("pointerdown", start);
        btn.removeEventListener("pointerup", end);
        btn.removeEventListener("pointerleave", end);
      });

      return btn;
    };

    if (isMobileGyroCandidate) {
      mobileHud = document.createElement("div");
      Object.assign(mobileHud.style, {
        position: "absolute",
        inset: "0",
        zIndex: "4",
        opacity: "0",
        pointerEvents: "none",
        transition: "opacity 180ms ease",
      });

      mobileStatus = document.createElement("div");
      Object.assign(mobileStatus.style, {
        position: "absolute",
        left: "14px",
        top: "14px",
        padding: "10px 12px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.28)",
        color: "rgba(255,255,255,0.68)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontSize: "10px",
      });
      mobileStatus.textContent = needsOrientationPermission
        ? "Allow motion to enter"
        : "Tap begin for gyro";
      mobileHud.appendChild(mobileStatus);

      mobilePermissionBtn = document.createElement("button");
      mobilePermissionBtn.type = "button";
      mobilePermissionBtn.textContent = needsOrientationPermission
        ? "Enable motion"
        : "Begin mobile gyro";
      Object.assign(mobilePermissionBtn.style, {
        position: "absolute",
        left: "14px",
        top: "58px",
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(0,0,0,0.34)",
        color: "rgba(255,255,255,0.88)",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontSize: "11px",
        touchAction: "manipulation",
      });

      const onPermissionClick = async (e) => {
        e.preventDefault();
        await enableMobileGyro();
      };
      mobilePermissionBtn.addEventListener("click", onPermissionClick);
      mobileCleanupFns.push(() =>
        mobilePermissionBtn?.removeEventListener("click", onPermissionClick)
      );
      mobileHud.appendChild(mobilePermissionBtn);

      mobilePad = document.createElement("div");
      Object.assign(mobilePad.style, {
        position: "absolute",
        left: "14px",
        right: "14px",
        bottom: "14px",
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto 1fr",
        gap: "8px",
        alignItems: "end",
      });

      const leftBtn = makePadButton(
        "Left",
        () => {
          mobileMoveState.strafe = -1;
        },
        () => {
          if (mobileMoveState.strafe < 0) mobileMoveState.strafe = 0;
        }
      );

      const fwdBtn = makePadButton(
        "Forward",
        () => {
          mobileMoveState.forward = 1;
        },
        () => {
          if (mobileMoveState.forward > 0) mobileMoveState.forward = 0;
        },
        { w: "72px" }
      );

      const rightBtn = makePadButton(
        "Right",
        () => {
          mobileMoveState.strafe = 1;
        },
        () => {
          if (mobileMoveState.strafe > 0) mobileMoveState.strafe = 0;
        }
      );

      const backBtn = makePadButton(
        "Back",
        () => {
          mobileMoveState.forward = -1;
        },
        () => {
          if (mobileMoveState.forward < 0) mobileMoveState.forward = 0;
        },
        { w: "72px" }
      );

      const centerCol = document.createElement("div");
      centerCol.style.display = "grid";
      centerCol.style.gap = "8px";
      centerCol.appendChild(fwdBtn);
      centerCol.appendChild(backBtn);

      mobilePad.appendChild(document.createElement("div"));
      mobilePad.appendChild(leftBtn);
      mobilePad.appendChild(centerCol);
      mobilePad.appendChild(rightBtn);
      mobilePad.appendChild(document.createElement("div"));

      mobileHud.appendChild(mobilePad);
      host.appendChild(mobileHud);
      setMobileHudVisible(true);

      if (!needsOrientationPermission) {
        enableMobileGyro();
      }
    }

    // ===== VR instructions panel (3D, first seconds in VR) =====
    const instrCanvas = document.createElement("canvas");
    instrCanvas.width = 1024;
    instrCanvas.height = 384;

    const instrCtx = instrCanvas.getContext("2d");
    if (instrCtx) {
      instrCtx.clearRect(0, 0, instrCanvas.width, instrCanvas.height);

      instrCtx.fillStyle = "rgba(0,0,0,0.26)";
      instrCtx.fillRect(0, 0, instrCanvas.width, instrCanvas.height);

      instrCtx.strokeStyle = "rgba(255,255,255,0.10)";
      instrCtx.lineWidth = 2;
      instrCtx.strokeRect(2, 2, instrCanvas.width - 4, instrCanvas.height - 4);

      instrCtx.fillStyle = "rgba(255,255,255,0.86)";
      instrCtx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      instrCtx.fillText("WHISPER XR", 44, 74);

      instrCtx.fillStyle = "rgba(255,255,255,0.64)";
      instrCtx.font = "18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      instrCtx.fillText("Teleport: point at floor + Trigger", 44, 138);
      instrCtx.fillText("Follow the beacon ring", 44, 176);
      instrCtx.fillText("Gaze-hold on highlighted artwork to advance", 44, 214);
      instrCtx.fillText("Finale: scan QR to collect", 44, 252);

      instrCtx.fillStyle = "rgba(255,255,255,0.50)";
      instrCtx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      instrCtx.fillText("Comfort: snap-turn on right stick", 44, 310);
    }

    const instrTex = new THREE.CanvasTexture(instrCanvas);
    instrTex.colorSpace = THREE.SRGBColorSpace;
    instrTex.minFilter = THREE.LinearFilter;
    instrTex.magFilter = THREE.LinearFilter;

    const instrMat = new THREE.MeshBasicMaterial({
      map: instrTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const instrPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), instrMat);
    instrPlane.position.set(0, -0.1, -1.15);

    const instrGroup = new THREE.Group();
    instrGroup.visible = false;
    instrGroup.add(instrPlane);
    camera.add(instrGroup);

    let instrUntil = 0;

    const showVRInstructions = () => {
      instrGroup.visible = true;
      instrPlane.material.opacity = 0.95;
      instrUntil = performance.now() + vrInstructionsMs;
    };

    const updateVRInstructions = (tNow) => {
      if (!instrGroup.visible) return;
      const remain = instrUntil - tNow;
      if (remain <= 0) {
        instrGroup.visible = false;
        return;
      }
      const fade = clamp01(remain / 900);
      instrPlane.material.opacity = 0.95 * fade;
    };

    renderer.xr.addEventListener("sessionstart", () => {
      try {
        controls.unlock();
      } catch {}
      showVRInstructions();
    });

    // ===== Lights =====
    const ambient = new THREE.AmbientLight(0xffffff, corridorOn ? 0.44 : 0.41);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x9bbcff, 0x05060a, corridorOn ? 0.0 : 0.12);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, corridorOn ? 0.62 : 0.54);
    dir.position.set(2.8, 5.9, 1.6);
    scene.add(dir);

    // ===== Floor (teleportable) =====
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b10,
      roughness: 0.86,
      metalness: 0.08,
      emissive: new THREE.Color(
        corridorOn
          ? 0x000000
          : stage === "forest"
            ? 0x07110b
            : 0x07101a
      ),
      emissiveIntensity: corridorOn ? 0.0 : 0.075,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "floor";
    scene.add(floor);

    const baseDirIntensity = dir.intensity;
    const baseHemiIntensity = hemi.intensity;
    const baseFloorEmissive = floorMat.emissiveIntensity;

gateCueHelper = createGateCue({
  scene,
  dir,
  hemi,
  floorMat,
  getBaseDirIntensity: () => baseDirIntensity,
  getBaseHemiIntensity: () => baseHemiIntensity,
  getBaseFloorEmissive: () => baseFloorEmissive,
});

// ===== Zone mood (SEA <-> FOREST) =====
const seaBg = new THREE.Color(0x05060a);
const forestBg = new THREE.Color(0x030807);

const seaKey = new THREE.Color(0x9bbcff);
const forestKey = new THREE.Color(0xb8ffe0);

const seaHemi = new THREE.Color(0x6ea8ff);
const forestHemi = new THREE.Color(0x9cffbf);

const _bgCol = new THREE.Color();
const _keyCol = new THREE.Color();   // <-- ВАЖЛИВО: const, не "Const"
const _hemiCol = new THREE.Color();
const _dustCol = new THREE.Color();

let mood = 0; // 0=sea, 1=forest
let moodTarget = 0;
let pendingMoodTarget = null;

const setMoodTargetByZone = (zoneId) => {
  moodTarget = zoneId === "forest" ? 1 : 0;
};

const updateMood = (dtMs) => {
  const k = 1 - Math.pow(0.001, dtMs / 1000);
  mood += (moodTarget - mood) * k;

  _bgCol.lerpColors(seaBg, forestBg, mood);
  scene.background.copy(_bgCol);
  if (scene.fog) scene.fog.color.copy(_bgCol);

  _keyCol.lerpColors(seaKey, forestKey, mood);
  dir.color.copy(_keyCol);

  _hemiCol.lerpColors(seaHemi, forestHemi, mood);
  hemi.color.copy(_hemiCol);

  if (dustMat) {
    _dustCol.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xdfffee), mood);
    dustMat.color.copy(_dustCol);
  }
};

    if (stage === "forest") {
      scene.background = new THREE.Color(0x030807);
    }

    const zStart = 6;
    const zEnd = -((works.length - 1) * spacing) - 10;
    const pathLen = zStart - zEnd;
    const midZ = (zStart + zEnd) * 0.5;

    const hazeBaseOpacity = 0.055;
    let dustGeo = null;
    let dustMat = null;
    let dustVel = null;
    let DUST = 0;
    let hazeMat = null;

    // ===== Sea-only ambient Aquasouls (refs) =====
    let seaSoulsTex = null;

    let seaSoulsGeo = null;
    let seaSoulsTrailGeo = null;
    let seaSoulsBigGeo = null;

    let seaSoulsMat = null;
    let seaSoulsTrailMat = null;
    let seaSoulsBigMat = null;

    let seaSoulsPoints = null;
    let seaSoulsTrailPoints = null;
    let seaSoulsBigPoints = null;

    let seaSoulsPos = null;
    let seaSoulsVel = null;
    let seaSoulsSeed = null;
    let seaSoulsTrailPos = null;

    let seaSoulsBigPos = null;
    let seaSoulsBigVel = null;
    let seaSoulsBigSeed = null;

    let SEA_SOULS = 0;
    let SEA_SOULS_BIG = 0;

    let seaZMin = 0;
    let seaZMax = 0;


    // ===== Environment: corridor OR open space =====
    let shellMat = null;
    let leftWallGeo = null;
    let rightWallGeo = null;
    let ceilGeo = null;
    let backGeo = null;
    let environmentShell = null;

    if (corridorOn) {
      const corridor = new THREE.Group();
      scene.add(corridor);

      shellMat = new THREE.MeshStandardMaterial({
        color: 0x07080d,
        roughness: 1,
        metalness: 0,
        emissive: new THREE.Color(0x05060a),
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide,
      });

      const wallH = 3.6;
      const wallX = 3.35;

      leftWallGeo = new THREE.PlaneGeometry(pathLen, wallH);
      rightWallGeo = new THREE.PlaneGeometry(pathLen, wallH);
      ceilGeo = new THREE.PlaneGeometry(wallX * 2, pathLen);
      backGeo = new THREE.PlaneGeometry(wallX * 2, wallH);

      const leftWall = new THREE.Mesh(leftWallGeo, shellMat);
      leftWall.position.set(-wallX, wallH / 2, midZ);
      leftWall.rotation.y = Math.PI / 2;
      corridor.add(leftWall);

      const rightWall = new THREE.Mesh(rightWallGeo, shellMat);
      rightWall.position.set(wallX, wallH / 2, midZ);
      rightWall.rotation.y = -Math.PI / 2;
      corridor.add(rightWall);

      const ceiling = new THREE.Mesh(ceilGeo, shellMat);
      ceiling.position.set(0, wallH + 0.2, midZ);
      ceiling.rotation.x = Math.PI / 2;
      corridor.add(ceiling);

      const back = new THREE.Mesh(backGeo, shellMat);
      back.position.set(0, wallH / 2, zEnd - 0.6);
      back.rotation.y = Math.PI;
      corridor.add(back);

      const poolCount = Math.min(5, Math.max(2, Math.ceil(works.length / 3)));
      for (let i = 0; i < poolCount; i++) {
        const p = i / (poolCount - 1 || 1);
        const z = THREE.MathUtils.lerp(zStart - 1.2, zEnd + 2.0, p);
        const pl = new THREE.PointLight(0xffffff, 0.22, 10.0, 2.0);
        pl.position.set(0, wallH + 0.05, z);
        corridor.add(pl);
      }
    } else {
      environmentShell = createEnvironmentShell({
        scene,
        stage,
        works,
        spacing,
        zStart,
        zEnd,
        midZ,
        curveX,
        hazeBaseOpacity,
      });

      const {
        hazeMat: _hazeMat,
        dustMat: _dustMat,
        dustGeo: _dustGeo,
        dustVel: _dustVel,
        DUST: _DUST,
      } = environmentShell;

      hazeMat = _hazeMat;
      dustMat = _dustMat;
      dustGeo = _dustGeo;
      dustVel = _dustVel;
      DUST = _DUST;

      // ---- Sea-only ambient Aquasouls (drift across Sea zone) ----
      if (seaSoulsEnabled) {
        seaSoulsTex = makeDotTexture();

        SEA_SOULS = Math.max(0, Math.min(128, seaSoulsCount));
        SEA_SOULS_BIG = Math.max(0, Math.min(64, seaSoulsBigCount));

        const firstForestIdx = works.findIndex((w) => w?.zoneId === "forest");
        const seaCount = firstForestIdx >= 0 ? firstForestIdx : works.length;

        seaZMax = zStart - 0.8;
        seaZMin = -(Math.max(0, seaCount - 1) * spacing) - 5.0;

        // main layer
        seaSoulsPos = new Float32Array(SEA_SOULS * 3);
        seaSoulsVel = new Float32Array(SEA_SOULS * 3);
        seaSoulsSeed = new Float32Array(SEA_SOULS);
        seaSoulsTrailPos = new Float32Array(SEA_SOULS * 3);

        for (let i = 0; i < SEA_SOULS; i++) {
          const z = THREE.MathUtils.lerp(seaZMax, seaZMin, Math.random());
          const idxF = (zStart - z) / Math.max(0.0001, spacing);
          const cx2 = curveX(idxF);

          seaSoulsPos[i * 3 + 0] = cx2 + (Math.random() - 0.5) * 3.2;
          seaSoulsPos[i * 3 + 1] = 1.1 + Math.random() * 2.2;
          seaSoulsPos[i * 3 + 2] = z;

          seaSoulsVel[i * 3 + 0] = (Math.random() - 0.5) * 0.16;
          seaSoulsVel[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
          seaSoulsVel[i * 3 + 2] = (Math.random() - 0.5) * 0.14;

          seaSoulsSeed[i] = Math.random() * Math.PI * 2;
        }

        seaSoulsGeo = new THREE.BufferGeometry();
        seaSoulsGeo.setAttribute("position", new THREE.BufferAttribute(seaSoulsPos, 3));

        seaSoulsTrailGeo = new THREE.BufferGeometry();
        seaSoulsTrailGeo.setAttribute("position", new THREE.BufferAttribute(seaSoulsTrailPos, 3));

        seaSoulsMat = new THREE.PointsMaterial({
          map: seaSoulsTex || null,
          transparent: true,
          opacity: 0.0,
          size: seaSoulsSize,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          color: 0xbfe6ff,
        });

        seaSoulsTrailMat = new THREE.PointsMaterial({
          map: seaSoulsTex || null,
          transparent: true,
          opacity: 0.0,
          size: seaSoulsSize * 1.85,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          color: 0xbfe6ff,
        });

        seaSoulsTrailPoints = new THREE.Points(seaSoulsTrailGeo, seaSoulsTrailMat);
        seaSoulsTrailPoints.frustumCulled = false;
        scene.add(seaSoulsTrailPoints);

        seaSoulsPoints = new THREE.Points(seaSoulsGeo, seaSoulsMat);
        seaSoulsPoints.frustumCulled = false;
        scene.add(seaSoulsPoints);

        // big accent layer (few larger wisps)
        if (SEA_SOULS_BIG > 0) {
          seaSoulsBigPos = new Float32Array(SEA_SOULS_BIG * 3);
          seaSoulsBigVel = new Float32Array(SEA_SOULS_BIG * 3);
          seaSoulsBigSeed = new Float32Array(SEA_SOULS_BIG);

          for (let i = 0; i < SEA_SOULS_BIG; i++) {
            const z = THREE.MathUtils.lerp(seaZMax, seaZMin, Math.random());
            const idxF = (zStart - z) / Math.max(0.0001, spacing);
            const cx2 = curveX(idxF);

            seaSoulsBigPos[i * 3 + 0] = cx2 + (Math.random() - 0.5) * 4.4;
            seaSoulsBigPos[i * 3 + 1] = 1.2 + Math.random() * 2.6;
            seaSoulsBigPos[i * 3 + 2] = z;

            seaSoulsBigVel[i * 3 + 0] = (Math.random() - 0.5) * 0.10;
            seaSoulsBigVel[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
            seaSoulsBigVel[i * 3 + 2] = (Math.random() - 0.5) * 0.09;

            seaSoulsBigSeed[i] = Math.random() * Math.PI * 2;
          }

          seaSoulsBigGeo = new THREE.BufferGeometry();
          seaSoulsBigGeo.setAttribute("position", new THREE.BufferAttribute(seaSoulsBigPos, 3));

          seaSoulsBigMat = new THREE.PointsMaterial({
            map: seaSoulsTex || null,
            transparent: true,
            opacity: 0.0,
            size: seaSoulsBigSize,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            color: 0xbfe6ff,
          });

          seaSoulsBigPoints = new THREE.Points(seaSoulsBigGeo, seaSoulsBigMat);
          seaSoulsBigPoints.frustumCulled = false;
          scene.add(seaSoulsBigPoints);
        }
      }

    }

    // ===== Frames + Art planes =====
    const loader = new THREE.TextureLoader();

    const group = new THREE.Group();
    scene.add(group);

    const frameMatBase = new THREE.MeshStandardMaterial({
      color: 0x0c0d14,
      roughness: 0.82,
      metalness: 0.03,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
      transparent: true,
      opacity: frameOpacity,
    });
    const placeholderMatBase = new THREE.MeshBasicMaterial({
  color: 0x111318,
  transparent: true,
  opacity: 1,
});

    const artMeshes = [];
    const frameMeshes = [];
    const anchorByPrintId = new Map();
    const indexByPrintId = new Map();
const videoStageByPrintId = new Map();
const stageGlowTex = makeRadialGradientTexture(512);

const stageGlowMatBase = new THREE.MeshBasicMaterial({
  map: stageGlowTex || null,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  color: 0xaecbff,
});
        works.forEach((a, i) => {
      const left = i % 2 === 0;
      const cx = curveX(i);
      const isVideoStage = a?.kind === "video" || !!a?.videoSrc;

      const laneX = options?.layout?.laneX ?? 1.15;
      const portalScale = options?.layout?.portalScale ?? 1.62;
      const stageOffsetXSea = options?.layout?.stageOffsetXSea ?? 0;
      const stageOffsetXForest = options?.layout?.stageOffsetXForest ?? 0;

      const frameMat = frameMatBase.clone();
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 1.12), frameMat);

      // For video stage: centered + no yaw. Otherwise: left/right lanes + gentle yaw.
      const stageOffsetX = a?.zoneId === "sea" ? stageOffsetXSea : stageOffsetXForest;
      const x = isVideoStage ? stageOffsetX : (left ? -laneX : laneX) + cx;
      frame.position.set(x, 1.55, -(i * spacing));
      frame.rotation.y = isVideoStage ? 0 : left ? 0.12 : -0.12;
      frame.userData = { printId: a.printId, zoneId: a.zoneId, caption: a.caption || "" };
      group.add(frame);

      const artGeo = new THREE.PlaneGeometry(1.32, 0.93);
      const art = new THREE.Mesh(artGeo, placeholderMatBase.clone());
      art.position.copy(frame.position);
      art.position.z += 0.01;
      art.rotation.copy(frame.rotation);
      art.userData = { printId: a.printId, zoneId: a.zoneId, caption: a.caption || "" };
      group.add(art);

      // IMPORTANT: register ALL items (including video stage) for gaze + staging
      artMeshes.push(art);
      frameMeshes.push(frame);
      indexByPrintId.set(a.printId, i);

      // Anchor used for beacons/journey logic
      anchorByPrintId.set(
        a.printId,
        new THREE.Vector3(isVideoStage ? 0 : cx, 0, frame.position.z + (isVideoStage ? 1.55 : 1.35))
      );

      if (isVideoStage) {
        // Scale up the whole “portal” (height-driven; width adapts to poster/video aspect)
        frame.scale.set(portalScale, portalScale, 1);
        art.scale.set(portalScale, portalScale, 1);

        // Glow plane behind
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.75), stageGlowMatBase.clone());
        glow.position.copy(art.position);
        glow.position.z -= 0.02;
        glow.userData = { ...(glow.userData || {}), printId: a.printId, kind: "video_glow" };
        glow.raycast = () => null; // prevent stealing gaze hits
        group.add(glow);

        const applyPortalAspect = (aspect) => {
          if (!Number.isFinite(aspect) || aspect <= 0) return;

          const baseW = art.geometry?.parameters?.width ?? 1.35;
          const baseH = art.geometry?.parameters?.height ?? 0.95;

          const frameBaseW = frame.geometry?.parameters?.width ?? 1.52;
          const frameBaseH = frame.geometry?.parameters?.height ?? 1.08;

          const glowBaseW = glow.geometry?.parameters?.width ?? 3.1;
          const glowBaseH = glow.geometry?.parameters?.height ?? 1.75;

          // height is fixed by portalScale (art.scale.y)
          const scaleY = art.scale.y;
          const desiredH = baseH * scaleY;
          const desiredW = desiredH * aspect;

          // match art width to desiredW
          art.scale.x = desiredW / baseW;

          // frame wraps the art
          frame.scale.x = (desiredW / frameBaseW) * frameMargin;
          frame.scale.y = (desiredH / frameBaseH) * frameMargin;

          // glow follows portal size
          glow.scale.x = (desiredW / glowBaseW) * 1.06;
          glow.scale.y = (desiredH / glowBaseH) * 1.06;
        };

        // Video setup
        const video = document.createElement("video");
        video.src = a.videoSrc;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");

        // When metadata is ready -> use REAL video aspect (fix squashed playback)
        video.addEventListener(
          "loadedmetadata",
          () => {
            const vw = video.videoWidth || 0;
            const vh = video.videoHeight || 0;
            if (vw > 0 && vh > 0) applyPortalAspect(vw / vh);
          },
          { once: true }
        );

        const vtex = new THREE.VideoTexture(video);
        vtex.colorSpace = THREE.SRGBColorSpace;
        vtex.minFilter = THREE.LinearFilter;
        vtex.magFilter = THREE.LinearFilter;
        vtex.generateMipmaps = false;

        // Poster first (prevents black frame before play)
        const posterSrc = a.poster || a.src;
        loader.load(
          posterSrc,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;

            art.material.dispose?.();
            art.material = new THREE.MeshBasicMaterial({
              map: tex,
              color: new THREE.Color(0.98, 0.98, 0.98),
              toneMapped: false,
              transparent: true,
              opacity: 1,
            });

            // Poster aspect while waiting for video metadata
            const pw = tex.image?.width || 16;
            const ph = tex.image?.height || 9;
            applyPortalAspect(pw / ph);
          },
          undefined,
          () => {}
        );

        videoStageByPrintId.set(a.printId, {
          pid: a.printId,
          video,
          tex: vtex,
          mesh: art,
          glow,
          playing: false,
          lastTry: 0,
        });

        // Ensure gaze / beat targeting works on video stage
        art.userData = { ...(art.userData || {}), printId: a.printId, kind: "video" };
        frame.userData = { ...(frame.userData || {}), printId: a.printId, kind: "video" };

        return; // skip normal image loader
      }

      loader.load(
        a.src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;

          art.material.dispose?.();
          art.material = new THREE.MeshBasicMaterial({
            map: tex,
            color: new THREE.Color(0.98, 0.98, 0.98),
            toneMapped: false,
            transparent: true,
            opacity: 1,
          });

          const iw = tex.image?.width || 1;
          const ih = tex.image?.height || 1;
          const aspect = iw / ih;

          const baseW = 1.35;
          const baseH = 0.95;

          const desiredH = baseH;
          const desiredW = desiredH * aspect;

          art.scale.set(desiredW / baseW, desiredH / baseH, 1);

          const frameBaseW = 1.52;
          const frameBaseH = 1.08;
          frame.scale.set(
            (desiredW / frameBaseW) * frameMargin,
            (desiredH / frameBaseH) * frameMargin,
            1
          );
        },
        undefined,
        () => {}
      );
    });



    // ===== Video helpers (stage-driven, Quest-friendly) =====
    warmupVideos = () => {
      for (const node of videoStageByPrintId.values()) {
        try {
          const p = node.video.play();
          if (p?.then) {
            p.then(() => {
              node.video.pause();
              node.video.currentTime = 0;
            }).catch(() => {});
          }
        } catch {}
      }
    };

    playVideoStage = (pid) => {
      const node = pid ? videoStageByPrintId.get(pid) : null;
      if (!node) return;

      const now = performance.now();
      if (node.playing) return;
      if (now - (node.lastTry || 0) < 600) return; // throttle retries
      node.lastTry = now;

      try {
        const m = node.mesh?.material;
        if (m && m.map !== node.tex) {
          m.map = node.tex;
          m.needsUpdate = true;
        }

        const p = node.video.play();
        if (p?.then) p.then(() => (node.playing = true)).catch(() => {});
      } catch {}
    };

    pauseAllVideoStages = () => {
      for (const node of videoStageByPrintId.values()) {
        try {
          node.video.pause();
          node.playing = false;
        } catch {}
      }
    };

    const updateVideoStages = (dtMs, tNow) => {
      // play only when the CURRENT beat is a video stage
      const activePid = journey.mode === "beats" ? currentBeatPrintId() : null;

      for (const [pid, node] of videoStageByPrintId) {
        const active = !!activePid && pid === activePid;

        if (active) {
          playVideoStage(pid);
        } else {
          try {
            node.video.pause();
            node.playing = false;
          } catch {}
        }

        const m = node.glow?.material;
        if (m) {
          const target = active ? 0.24 : 0.0;
          const k = 1 - Math.pow(0.5, dtMs / 240);
          m.opacity += (target - m.opacity) * k;

          if (active) {
            m.opacity = Math.max(0, m.opacity + 0.015 * Math.sin(tNow * 0.003));
          }
        }
      }
    };

    // ===== SEA -> FOREST gate =====

    const zoneChangeIdx = (() => {
      for (let i = 1; i < works.length; i++) {
        if (works[i - 1]?.zoneId && works[i]?.zoneId && works[i - 1].zoneId !== works[i].zoneId) {
          return i;
        }
      }
      return -1;
    })();

    if (zoneChangeIdx > 0) {
      const prev = works[zoneChangeIdx - 1];
      const next = works[zoneChangeIdx];
      const prevA = prev?.printId ? anchorByPrintId.get(prev.printId) : null;
      const nextA = next?.printId ? anchorByPrintId.get(next.printId) : null;

      if (prevA && nextA) {
        const z = (prevA.z + nextA.z) * 0.5;
        const x = (prevA.x + nextA.x) * 0.5;
        gateCueHelper.createAt({ x, z });
      }
    }

    // ===== Guidance beacon =====
    const beacon = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 32),
      new THREE.MeshBasicMaterial({
        color: 0x9bbcff,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.set(0, 0.01, 2.0);
    scene.add(beacon);

    // ===== Beacon trail =====
    const trailCount = 6;
    const trailGeo = new THREE.RingGeometry(0.06, 0.085, 32);
    const trail = [];
    for (let i = 0; i < trailCount; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: 0x9bbcff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const r = new THREE.Mesh(trailGeo, m);
      r.rotation.x = -Math.PI / 2;
      scene.add(r);
      trail.push(r);
    }

    const _trailFrom = new THREE.Vector3();
    const _trailTo = new THREE.Vector3();
    const _trailP = new THREE.Vector3();

    const updateBeaconTrail = (tNow) => {
      _trailFrom.set(rig.position.x, 0.01, rig.position.z);
      _trailTo.set(beacon.position.x, 0.01, beacon.position.z);

      for (let i = 0; i < trail.length; i++) {
        const k = (i + 1) / (trail.length + 1);
        _trailP.copy(_trailFrom).lerp(_trailTo, k);

        const pulse = 0.55 + 0.45 * Math.sin(tNow * 0.002 + i * 0.9);
        trail[i].position.set(_trailP.x, 0.012, _trailP.z);
        trail[i].material.opacity = 0.10 * pulse;

        const s = 1 + 0.35 * pulse;
        trail[i].scale.set(s, s, 1);
      }
    };

    // ===== Whisper effects =====
    const seaWave = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 40),
      new THREE.MeshBasicMaterial({
        color: 0x9bbcff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    seaWave.rotation.x = -Math.PI / 2;
    seaWave.visible = false;
    scene.add(seaWave);

    let waveT = 0;
    let waveOn = false;

    const pollenTex = makeDotTexture();
    const MAX_POLLEN = 220;
    const pollenPos = new Float32Array(MAX_POLLEN * 3);
    const pollenVel = new Float32Array(MAX_POLLEN * 3);
    const pollenLife = new Float32Array(MAX_POLLEN);

    for (let i = 0; i < MAX_POLLEN; i++) {
      pollenPos[i * 3 + 0] = 0;
      pollenPos[i * 3 + 1] = -999;
      pollenPos[i * 3 + 2] = 0;
      pollenLife[i] = 0;
    }

    const pollenGeo = new THREE.BufferGeometry();
    pollenGeo.setAttribute("position", new THREE.BufferAttribute(pollenPos, 3));

    const pollenMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.045,
      map: pollenTex || null,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    const pollen = new THREE.Points(pollenGeo, pollenMat);
    pollen.frustumCulled = false;
    scene.add(pollen);

    const spawnPollen = (at, count) => {
      const c = Math.max(1, Math.min(count, 60));
      for (let k = 0; k < c; k++) {
        let idx = -1;
        for (let i = 0; i < MAX_POLLEN; i++) {
          if (pollenLife[i] <= 0) {
            idx = i;
            break;
          }
        }
        if (idx < 0) break;

        const px = at.x + (Math.random() - 0.5) * 0.55;
        const py = 1.05 + Math.random() * 0.65;
        const pz = at.z + (Math.random() - 0.5) * 0.55;

        pollenPos[idx * 3 + 0] = px;
        pollenPos[idx * 3 + 1] = py;
        pollenPos[idx * 3 + 2] = pz;

        pollenVel[idx * 3 + 0] = (Math.random() - 0.5) * 0.06;
        pollenVel[idx * 3 + 1] = 0.1 + Math.random() * 0.16;
        pollenVel[idx * 3 + 2] = (Math.random() - 0.5) * 0.06;

        pollenLife[idx] = 0.9 + Math.random() * 0.8;
      }
      pollenGeo.attributes.position.needsUpdate = true;
    };

    const triggerWhisper = (zoneId, atVec3) => {
      if (zoneId === "sea") {
        seaWave.position.set(atVec3.x, 0.012, atVec3.z);
        seaWave.scale.set(1, 1, 1);
        seaWave.material.opacity = 0.0;
        seaWave.visible = true;
        waveT = 0;
        waveOn = true;
      } else if (zoneId === "forest") {
        spawnPollen(atVec3, pollenBurstCount);
      }
    };

    // ===== Interaction UI shell =====
    const interactionShell = createInteractionShell({
      mount: document.body,
    });
    const { setRail, setMeterProgress } = interactionShell;

    let collectorPanel = null;

    const sharePathForId = (pid) => {
      const base = String(manifest?.collect?.shareBasePath || "/p/");
      const slash = base.endsWith("/") ? base : `${base}/`;
      return `${slash}${encodeURIComponent(pid)}/`;
    };

    const absShareUrlForId = (pid) => {
      const p = sharePathForId(pid);
      const origin = window.location.origin || "";
      return `${origin}${p.startsWith("/") ? "" : "/"}${p}`;
    };

    collectorPanel = createCollectorPanel({
      scene,
      sharePathForId,
      absShareUrlForId,
      collectorPanelMs,
    });

    const locomotionShell = createLocomotionShell({
      scene,
      renderer,
      camera,
      rig,
      floor,
      snapTurnDeg,
      snapCooldownMs,
      markerColor: 0xdfe7ea,
      onCollectorSelect: ({ controller, interactRay, tempMatrix, tmpV, interactiveMeshes }) => {
        if (!collectorPanel?.isVisible?.()) return false;

        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const origin = tmpV.setFromMatrixPosition(controller.matrixWorld).clone();
        const dirv = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();

        interactRay.set(origin, dirv);
        const hits = interactRay.intersectObjects(interactiveMeshes, false);
        const hit = hits[0]?.object;

        if (hit) {
          collectorPanel.open();
          return true;
        }

        return false;
      },
    });
    locomotionShell.interactiveMeshes.push(...collectorPanel.interactiveMeshes);

    const handVisual = createHandVisualProxySystem({
      handPresence,
      controllers: locomotionShell.controllers,
      style: handStyle,
    });

    const handGesture = createHandGestureSelectSystem({
      handPresence,
    });

    const handContactReadiness = createHandContactReadinessSystem({
      handPresence,
      gestureSystem: handGesture,
    });

    const handLocomotionBridge = createHandLocomotionBridge({
      scene,
      rig,
      handPresence,
      controllers: locomotionShell.controllers,
      floorObjects: [floor],
    });

    // ===== Gaze + Directed Journey =====
    const gazeRay = new THREE.Raycaster();
    const gazeOrigin = new THREE.Vector3();
    const gazeDir = new THREE.Vector3();

    let focusedPrintId = null;
    let focusMs = 0;
    let focusArmed = true;

    const beatList = beatsOrdered.length ? beatsOrdered : works;
    let beatIndex = 0;
    let isTransitioning = false;
    let gatePulse = 0;
    let gatePulseTarget = 0;
    let gateSwitchTimer = null;
    let gateReleaseTimer = null;

    const journey = { mode: "beats", gateToIndex: -1 };
    const gatePulsePeak = 0.08;
    const gatePulseSwitchDelayMs = 180;
    const gatePulseReleaseMs = 220;

    const clearTransitionTimers = () => {
      if (gateSwitchTimer) {
        window.clearTimeout(gateSwitchTimer);
        gateSwitchTimer = null;
      }
      if (gateReleaseTimer) {
        window.clearTimeout(gateReleaseTimer);
        gateReleaseTimer = null;
      }
    };

    const queueBeatIndexChange = (nextIdx, afterSwitch) => {
      if (isTransitioning) return false;

      clearTransitionTimers();
      isTransitioning = true;
      gatePulseTarget = gatePulsePeak;

      gateSwitchTimer = window.setTimeout(() => {
        beatIndex = nextIdx;
        afterSwitch?.();

        gateReleaseTimer = window.setTimeout(() => {
          gatePulseTarget = 0;
          isTransitioning = false;
          gateReleaseTimer = null;
        }, gatePulseReleaseMs);

        gateSwitchTimer = null;
      }, gatePulseSwitchDelayMs);

      return true;
    };

    const currentBeat = () => beatList[beatIndex] || null;
    // Init mood from first beat/first work
setMoodTargetByZone((currentBeat()?.zoneId) || (works?.[0]?.zoneId) || "sea");
mood = moodTarget;
    const currentBeatPrintId = () => currentBeat()?.printId || null;

    const setBeaconToPrintId = (pid) => {
      const a = pid ? anchorByPrintId.get(pid) : null;
      if (!a) return;
      beacon.position.set(a.x, 0.01, a.z);
    };

    const setBeaconToGate = () => {
      const gatePos = gateCueHelper?.getGatePos?.();
      if (!gatePos) return;
      beacon.position.set(gatePos.x, 0.01, gatePos.z);
    };

    const setBeaconToPoint = (p) => {
      if (!p) return;
      beacon.position.set(p.x, 0.01, p.z);
    };

    setBeaconToPrintId(currentBeatPrintId());


    // ===== Sea-zone living Aquasouls (ambient, Sea-only) =====
    let seaSoulsMix = 0;
    let seaSoulsPulse = 0;

    const updateSeaSouls = (dtMs, tNow) => {
      if (!seaSoulsEnabled) return;
      if (!seaSoulsPoints || !seaSoulsMat || !seaSoulsTrailMat) return;

      const dt = dtMs / 1000;

      // Active only in Sea (fade out when mood goes Forest or Finale begins)
      const seaTarget = finaleMode === "off" && mood < 0.55 ? 1 : 0;
      const kMix = 1 - Math.pow(0.5, dtMs / 360);
      seaSoulsMix += (seaTarget - seaSoulsMix) * kMix;

      // subtle proximity "breath" near current beat anchor (Sea only)
      let pulseTarget = 0;
      try {
        const pid = currentBeatPrintId?.() ? currentBeatPrintId() : null;
        const beat = currentBeat?.() || null;
        if (pid && beat?.zoneId === "sea") {
          const at = anchorByPrintId.get(pid);
          if (at) {
            const dx = rig.position.x - at.x;
            const dz = rig.position.z - at.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < seaSoulsProxRadius) {
              pulseTarget = 1 - d / seaSoulsProxRadius;
            }
          }
        }
      } catch {}

      const kPulse = 1 - Math.pow(0.5, dtMs / 180);
      seaSoulsPulse += (pulseTarget - seaSoulsPulse) * kPulse;

      const opMul = seaSoulsMix * (0.72 + 0.28 * seaSoulsPulse);
      seaSoulsMat.opacity = seaSoulsBaseOpacity * opMul;
      seaSoulsTrailMat.opacity = seaSoulsTrailOpacity * opMul;
      if (seaSoulsBigMat) seaSoulsBigMat.opacity = (seaSoulsBaseOpacity * 0.55) * opMul;

      const visible = opMul > 0.004;
      seaSoulsPoints.visible = visible;
      seaSoulsTrailPoints.visible = visible;
      if (seaSoulsBigPoints) seaSoulsBigPoints.visible = visible;

      if (!visible) return;

      const speed = seaSoulsSpeed;

      // update main layer
      if (seaSoulsPos && seaSoulsVel && seaSoulsSeed) {
        for (let i = 0; i < SEA_SOULS; i++) {
          let x = seaSoulsPos[i * 3 + 0];
          let y = seaSoulsPos[i * 3 + 1];
          let z = seaSoulsPos[i * 3 + 2];

          let vx = seaSoulsVel[i * 3 + 0];
          let vy = seaSoulsVel[i * 3 + 1];
          let vz = seaSoulsVel[i * 3 + 2];

          const seed = seaSoulsSeed[i];

          // centerline attraction (content-driven curve)
          const idxF = (zStart - z) / Math.max(0.0001, spacing);
          const tx = curveX(idxF);
          vx += (tx - x) * (0.18 * dt) * speed;
          vy += (1.75 - y) * (0.10 * dt) * speed;

          // subtle helical drift along Z (premium "alive" feel)
          const swirl = 0.20 * Math.sin(tNow * 0.0014 + seed);
          vz += (tx - x) * (0.28 * dt) * swirl * speed;

          // calm noise (deterministic)
          vx += 0.06 * Math.sin(tNow * 0.0011 + seed * 3.1) * dt * speed;
          vy += 0.03 * Math.sin(tNow * 0.0013 + seed * 2.2) * dt * speed;
          vz += 0.06 * Math.cos(tNow * 0.0010 + seed * 2.7) * dt * speed;

          // proximity response: gently lean toward user
          if (seaSoulsPulse > 0.01) {
            vx += (rig.position.x - x) * (0.05 * dt) * seaSoulsPulse * speed;
            vz += (rig.position.z - z) * (0.05 * dt) * seaSoulsPulse * speed;
          }

          // damping
          const damp = 0.985;
          vx *= damp;
          vy *= damp;
          vz *= damp;

          x += vx * dt;
          y += vy * dt;
          z += vz * dt;

          // wrap along Sea Z-range
          if (z < seaZMin) z = seaZMax;
          if (z > seaZMax) z = seaZMin;

          // soft bounds
          if (x < -8) x = -8;
          if (x > 8) x = 8;
          if (y < 0.85) y = 0.85;
          if (y > 4.1) y = 4.1;

          seaSoulsPos[i * 3 + 0] = x;
          seaSoulsPos[i * 3 + 1] = y;
          seaSoulsPos[i * 3 + 2] = z;

          seaSoulsVel[i * 3 + 0] = vx;
          seaSoulsVel[i * 3 + 1] = vy;
          seaSoulsVel[i * 3 + 2] = vz;

          // trail (afterimage)
          const lag = 0.65;
          seaSoulsTrailPos[i * 3 + 0] = x - vx * lag;
          seaSoulsTrailPos[i * 3 + 1] = y - vy * lag;
          seaSoulsTrailPos[i * 3 + 2] = z - vz * lag;
        }

        seaSoulsGeo?.attributes?.position && (seaSoulsGeo.attributes.position.needsUpdate = true);
        seaSoulsTrailGeo?.attributes?.position && (seaSoulsTrailGeo.attributes.position.needsUpdate = true);
      }

      // update big layer (slower + wider)
      if (SEA_SOULS_BIG > 0 && seaSoulsBigPos && seaSoulsBigVel && seaSoulsBigSeed) {
        for (let i = 0; i < SEA_SOULS_BIG; i++) {
          let x = seaSoulsBigPos[i * 3 + 0];
          let y = seaSoulsBigPos[i * 3 + 1];
          let z = seaSoulsBigPos[i * 3 + 2];

          let vx = seaSoulsBigVel[i * 3 + 0];
          let vy = seaSoulsBigVel[i * 3 + 1];
          let vz = seaSoulsBigVel[i * 3 + 2];

          const seed = seaSoulsBigSeed[i];

          const idxF = (zStart - z) / Math.max(0.0001, spacing);
          const tx = curveX(idxF);

          vx += (tx - x) * (0.10 * dt) * speed;
          vy += (1.9 - y) * (0.06 * dt) * speed;
          vz += 0.05 * Math.cos(tNow * 0.0009 + seed * 2.3) * dt * speed;

          if (seaSoulsPulse > 0.01) {
            vx += (rig.position.x - x) * (0.03 * dt) * seaSoulsPulse * speed;
            vz += (rig.position.z - z) * (0.03 * dt) * seaSoulsPulse * speed;
          }

          const damp = 0.988;
          vx *= damp;
          vy *= damp;
          vz *= damp;

          x += vx * dt;
          y += vy * dt;
          z += vz * dt;

          if (z < seaZMin) z = seaZMax;
          if (z > seaZMax) z = seaZMin;

          seaSoulsBigPos[i * 3 + 0] = x;
          seaSoulsBigPos[i * 3 + 1] = y;
          seaSoulsBigPos[i * 3 + 2] = z;

          seaSoulsBigVel[i * 3 + 0] = vx;
          seaSoulsBigVel[i * 3 + 1] = vy;
          seaSoulsBigVel[i * 3 + 2] = vz;
        }

        seaSoulsBigGeo?.attributes?.position && (seaSoulsBigGeo.attributes.position.needsUpdate = true);
      }
    };

    // ===== Finale act (Aquasouls -> White dimension -> Data rain) =====
    let finaleMode = "off"; // off | forming | transition | white
    let finaleMix = 0;
    let finaleTargetMix = 0;
    let finalePid = null;

    const finalePortalPos = new THREE.Vector3();
    const finaleCenter = new THREE.Vector3();

    let soulsMain = null;
    let soulsTrail1 = null;
    let soulsTrail2 = null;
    let soulsVel = null;
    let soulsPos = null;
    let soulsSize = null;
    let soulsHue = null;
    let soulsOrbitAngle = null;
    let soulsOrbitRadius = null;
    let soulsLift = null;
    let soulsDrift = null;
    let soulsTex = null;
    let soulsMatMain = null;
    let soulsMatT1 = null;
    let soulsMatT2 = null;
    let soulsCore = null;
    let soulsCoreMat = null;
    let finaleStartedAt = 0;
    const finaleViewDir = new THREE.Vector3(0, 0, 1);

    let rainPoints = null;
    let rainGeo = null;
    let rainMat = null;
    let rainVel = null;
    let rainTex = null;

    const _tmp = new THREE.Vector3();
    const _tmp2 = new THREE.Vector3();
    const _tmpCol = new THREE.Color();

    const makeStreakTexture = (w = 64, h = 256) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, w, h);

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "rgba(255,255,255,0.00)");
      g.addColorStop(0.15, "rgba(255,255,255,0.08)");
      g.addColorStop(0.55, "rgba(255,255,255,0.22)");
      g.addColorStop(0.85, "rgba(255,255,255,0.08)");
      g.addColorStop(1.0, "rgba(255,255,255,0.00)");

      ctx.fillStyle = g;
      ctx.fillRect(w * 0.44, 0, w * 0.12, h);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    };

    const ensureFinaleAssets = () => {
      if (soulsMain && rainPoints) return;

      // Aquasouls (premium wisps) — instanced sprites + lightweight afterimage trails
      const SOULS = finaleSoulsCount;

      soulsVel = new Float32Array(SOULS * 3);
      soulsPos = new Float32Array(SOULS * 3);
      soulsSize = new Float32Array(SOULS);
      soulsHue = new Float32Array(SOULS);
      soulsOrbitAngle = new Float32Array(SOULS);
      soulsOrbitRadius = new Float32Array(SOULS);
      soulsLift = new Float32Array(SOULS);
      soulsDrift = new Float32Array(SOULS);

      soulsTex = makeRadialGradientTexture(256);

      const matBase = {
        map: soulsTex || null,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        toneMapped: false,
        color: 0xffffff,
      };

      soulsMatMain = new THREE.MeshBasicMaterial({ ...matBase, opacity: 0.0 });
      soulsMatT1 = new THREE.MeshBasicMaterial({ ...matBase, opacity: 0.0 });
      soulsMatT2 = new THREE.MeshBasicMaterial({ ...matBase, opacity: 0.0 });

      const g = new THREE.PlaneGeometry(1, 1);
      soulsMain = new THREE.InstancedMesh(g, soulsMatMain, SOULS);
      soulsTrail1 = new THREE.InstancedMesh(g, soulsMatT1, SOULS);
      soulsTrail2 = new THREE.InstancedMesh(g, soulsMatT2, SOULS);

      soulsMain.frustumCulled = false;
      soulsTrail1.frustumCulled = false;
      soulsTrail2.frustumCulled = false;

      soulsMain.visible = false;
      soulsTrail1.visible = false;
      soulsTrail2.visible = false;

      soulsMain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      soulsTrail1.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      soulsTrail2.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      scene.add(soulsTrail2);
      scene.add(soulsTrail1);
      scene.add(soulsMain);

      soulsCoreMat = new THREE.MeshBasicMaterial({
        map: soulsTex || null,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
        toneMapped: false,
      });
      soulsCore = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), soulsCoreMat);
      soulsCore.frustumCulled = false;
      soulsCore.visible = false;
      scene.add(soulsCore);

      // Data rain (streaks)
      const N = finaleRainCount;
      rainGeo = new THREE.BufferGeometry();
      rainVel = new Float32Array(N);

      const p2 = new Float32Array(N * 3);
      rainGeo.setAttribute("position", new THREE.BufferAttribute(p2, 3));

      rainTex = makeStreakTexture(64, 256);

      rainMat = new THREE.PointsMaterial({
        size: 0.42,
        map: rainTex || null,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
      });

      rainPoints = new THREE.Points(rainGeo, rainMat);
      rainPoints.frustumCulled = false;
      rainPoints.visible = false;
      scene.add(rainPoints);
    };

    const seedSouls = (center) => {
      ensureFinaleAssets();
      if (
        !soulsPos ||
        !soulsVel ||
        !soulsMain ||
        !soulsTrail1 ||
        !soulsTrail2 ||
        !soulsOrbitAngle ||
        !soulsOrbitRadius ||
        !soulsLift ||
        !soulsDrift
      ) {
        return;
      }

      finaleCenter.copy(center);

      const viewX = finaleViewDir.x;
      const viewZ = finaleViewDir.z;
      const perpX = -viewZ;
      const perpZ = viewX;

      const spawnRBase = Math.min(5.2, finaleSoulsSpawnR);
      const spawnRJitter = Math.min(3.2, finaleSoulsSpawnRJitter);

      for (let i = 0; i < finaleSoulsCount; i++) {
        const spread = (Math.random() - 0.5) * Math.PI * 1.45;
        const r = spawnRBase + Math.random() * spawnRJitter;
        const y = 0.55 + Math.random() * 2.25;

        const dirX = viewX * Math.cos(spread) + perpX * Math.sin(spread);
        const dirZ = viewZ * Math.cos(spread) + perpZ * Math.sin(spread);

        soulsPos[i * 3 + 0] = center.x + dirX * r;
        soulsPos[i * 3 + 1] = y;
        soulsPos[i * 3 + 2] = center.z + dirZ * r;

        soulsVel[i * 3 + 0] = (Math.random() - 0.5) * 0.06;
        soulsVel[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
        soulsVel[i * 3 + 2] = (Math.random() - 0.5) * 0.06;

        const u = Math.random();
        soulsSize[i] = 0.105 + (0.255 - 0.105) * Math.pow(u, 1.6);
        soulsHue[i] = 0.46 + Math.random() * 0.62;

        soulsOrbitAngle[i] = Math.random() * Math.PI * 2;
        soulsOrbitRadius[i] = 1.05 + Math.random() * 1.95;
        soulsLift[i] = -0.2 + Math.random() * 0.95;
        soulsDrift[i] = 0.65 + Math.random() * 0.9;
      }

      const c = new THREE.Color(0x9bbcff);
      for (let i = 0; i < finaleSoulsCount; i++) {
        const k = soulsHue[i];
        const cc = c.clone().multiplyScalar(k);
        soulsMain.setColorAt(i, cc);
        soulsTrail1.setColorAt(i, cc.clone().multiplyScalar(0.62));
        soulsTrail2.setColorAt(i, cc.clone().multiplyScalar(0.30));
      }

      soulsMain.instanceColor.needsUpdate = true;
      soulsTrail1.instanceColor.needsUpdate = true;
      soulsTrail2.instanceColor.needsUpdate = true;

      soulsMain.visible = true;
      soulsTrail1.visible = true;
      soulsTrail2.visible = true;
      if (soulsCore) soulsCore.visible = true;

      soulsMatMain.opacity = 0.0;
      soulsMatT1.opacity = 0.0;
      soulsMatT2.opacity = 0.0;
      if (soulsCoreMat) soulsCoreMat.opacity = 0.0;
    };

    const seedRain = () => {
      ensureFinaleAssets();
      if (!rainGeo || !rainVel || !rainMat || !rainPoints) return;

      const pos = rainGeo.attributes.position.array;

      for (let i = 0; i < finaleRainCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * finaleRainRadius;

        pos[i * 3 + 0] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.random() * finaleRainHeight;
        pos[i * 3 + 2] = Math.sin(a) * r;

        rainVel[i] = 0.8 + Math.random() * 1.6; // m/s downward
      }

      rainGeo.attributes.position.needsUpdate = true;

      rainPoints.visible = true;
      rainMat.opacity = 0.0;
    };

    const whisperFinaleController = createWhisperFinaleController({
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
      collectorGroup: collectorPanel.group,
      showCollector: (pid, at) => collectorPanel.show(pid, at),
      setBeaconToPoint,
      finaleConfig: options?.finale || {},
    });

    const startFinale = (pid) => {
      whisperFinaleController.start(pid);
    };

    const updateFinale = (dtMs, tNow) => {
      whisperFinaleController.update(dtMs, tNow);
    };

setMoodTargetByZone((currentBeat()?.zoneId) || (works?.[0]?.zoneId) || "sea");
mood = moodTarget;
    const advanceBeat = (triggerZoneId, triggerAt, triggeredPid) => {
      if (triggerZoneId && triggerAt) triggerWhisper(triggerZoneId, triggerAt);

      const nextIdx = beatIndex + 1;

      if (nextIdx >= beatList.length) {
        if (triggeredPid) {
          const lastIdx = indexByPrintId.get(triggeredPid);
          const lastFrame = typeof lastIdx === "number" ? frameMeshes[lastIdx] : null;

          if (lastFrame?.material) {
            lastFrame.material.emissive = new THREE.Color(0xb8d3ff);
            lastFrame.material.emissiveIntensity = 0.12;
          }

          window.setTimeout(() => {
            try {
              if (lastFrame?.material) {
                lastFrame.material.emissiveIntensity = 0.0;
              }
            } catch {}
          }, 900);

          if (finaleEnabled) {
            window.setTimeout(() => {
              startFinale(triggeredPid);
            }, 180);
          } else {
            const at =
              triggerAt ||
              anchorByPrintId.get(triggeredPid) ||
              new THREE.Vector3(0, 0, rig.position.z);
            collectorPanel.show(triggeredPid, at);
          }
        }
        return;
      }

      const cur = beatList[beatIndex];
      const next = beatList[nextIdx];

      const gate = gateCueHelper?.getGate?.();
      const gatePos = gateCueHelper?.getGatePos?.();
      if (cur?.zoneId && next?.zoneId && cur.zoneId !== next.zoneId && gate && gatePos) {
        journey.mode = "gate";
        journey.gateToIndex = nextIdx;
        gate.visible = true;
        gateCueHelper?.trigger();
        setBeaconToGate();
        pendingMoodTarget = next?.zoneId || null;
        return;
      }

      queueBeatIndexChange(nextIdx, () => {
        setBeaconToPrintId(currentBeatPrintId());
      });
    };

    const collectFocused = async (action) => {
      if (!focusedPrintId) return;
      const url = absShareUrlForId(focusedPrintId);

      if (action === "copy") {
        try {
          await navigator.clipboard?.writeText(url);
        } catch {}
      }

      if (action === "open") {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch {
          window.location.assign(url);
        }
      }
    };

    const updateGaze = (dtMs) => {
      const camForRay = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;

      gazeOrigin.setFromMatrixPosition(camForRay.matrixWorld);
      gazeDir.set(0, 0, -1).transformDirection(camForRay.matrixWorld).normalize();
      gazeRay.set(gazeOrigin, gazeDir);

      const hits = gazeRay.intersectObjects(artMeshes, false);
      const hit = hits[0]?.object || null;

      const pid = hit?.userData?.printId || null;
      const cap = hit?.userData?.caption || "";
      const zid = hit?.userData?.zoneId || null;

      if (pid && pid === focusedPrintId) {
        focusMs += dtMs;
      } else {
        focusedPrintId = pid;
        focusMs = 0;
        focusArmed = true;
      }

      if (pid) {
        setRail({
          pid,
          caption: cap ? `${cap}  ·  ${sharePathForId(pid)}` : sharePathForId(pid),
          visible: true,
          hintOpacity: 1,
        });
      } else {
        setRail({
          visible: false,
        });
      }

      const beatPid = currentBeatPrintId();
      const isBeatTarget = journey.mode === "beats" && pid && beatPid && pid === beatPid;

      const isVideoBeat = isBeatTarget && (hit?.userData?.kind === "video" || String(pid || "").endsWith("-stage"));
      const holdMs = isVideoBeat ? videoGazeHoldMs : gazeHoldMs;
      const delayMs = isVideoBeat ? videoMinWatchMs : 0;
      const p = isBeatTarget ? clamp01(Math.max(0, focusMs - delayMs) / Math.max(1, holdMs)) : 0;
      setMeterProgress(p);

      // micro gaze-confirmation cue on the active frame
      const beatIdx = beatPid ? indexByPrintId.get(beatPid) : -1;
      if (typeof beatIdx === "number" && beatIdx >= 0) {
        const frame = frameMeshes[beatIdx];
        const mat = frame?.material;
        if (mat) {
          const cue = isBeatTarget ? p : 0;
          const targetEmissive = 0.035 + cue * 0.065; // max ~0.10, very subtle
          const curEmissive =
            typeof mat.emissiveIntensity === "number" ? mat.emissiveIntensity : 0;

          mat.emissive = new THREE.Color(0x8fb7ff);
          mat.emissiveIntensity = curEmissive + (targetEmissive - curEmissive) * 0.18;
        }
      }

      if (isBeatTarget && p >= 1 && focusArmed) {
        focusArmed = false;

        const idx = indexByPrintId.get(pid);
        const frame = typeof idx === "number" ? frameMeshes[idx] : null;
        if (frame?.material) {
          frame.material.emissive = new THREE.Color(0x6ea8ff);
          frame.material.emissiveIntensity = 0.22;
          window.setTimeout(() => {
            try {
              frame.material.emissiveIntensity = 0;
            } catch {}
          }, 220);
        }

        const at = anchorByPrintId.get(pid) || new THREE.Vector3(0, 0, rig.position.z);
        advanceBeat(zid, at, pid);
      }
    };

    const updateGate = () => {
      const gatePos = gateCueHelper?.getGatePos?.();
      if (journey.mode !== "gate" || !gatePos) return;

      const dx = rig.position.x - gatePos.x;
      const dz = rig.position.z - gatePos.z;
      const d = Math.sqrt(dx * dx + dz * dz);

      if (d < 1.0) {
        const nextIdx =
          typeof journey.gateToIndex === "number" && journey.gateToIndex >= 0
            ? journey.gateToIndex
            : -1;

        if (nextIdx < 0 || isTransitioning) return;

        queueBeatIndexChange(nextIdx, () => {
          journey.gateToIndex = -1;
          journey.mode = "beats";

          if (pendingMoodTarget) {
            setMoodTargetByZone(pendingMoodTarget);
            pendingMoodTarget = null;
          }
          const gate = gateCueHelper?.getGate?.();
          if (gate) gate.visible = false;

          gateCueHelper?.trigger();
          setBeaconToPrintId(currentBeatPrintId());

          const cb = currentBeat();
          const pid = cb?.printId;
          const at = pid ? anchorByPrintId.get(pid) : null;
          if (cb?.zoneId && at) triggerWhisper(cb.zoneId, at);
        });
      }
    };

    const updateMobileGyroMove = (dtSec) => {
      if (!isMobileGyroCandidate || renderer.xr.isPresenting || !gyroPermissionGranted) return;
      if (!gyroActive || (!mobileMoveState.forward && !mobileMoveState.strafe)) return;

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 0.0001) return;
      forward.normalize();

      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();

      const move = new THREE.Vector3();
      move.addScaledVector(forward, mobileMoveState.forward * mobileMoveSpeed);
      move.addScaledVector(right, mobileMoveState.strafe * mobileStrafeSpeed);

      const len = move.length();
      if (len <= 0.0001) return;

      if (len > Math.max(mobileMoveSpeed, mobileStrafeSpeed)) {
        move.multiplyScalar(1 / len);
        move.multiplyScalar(Math.max(mobileMoveSpeed, mobileStrafeSpeed));
      }

      move.multiplyScalar(dtSec);
      rig.position.add(move);
    };

    const updateProximityGlow = () => {
      let bestIdx = -1;
      let bestD = 999;

      for (let i = 0; i < works.length; i++) {
        const pid = works[i]?.printId;
        if (!pid) continue;
        const a = anchorByPrintId.get(pid);
        if (!a) continue;
        const dx = rig.position.x - a.x;
        const dz = rig.position.z - a.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }

      const beatPid = currentBeatPrintId();
      const beatIdx = beatPid ? indexByPrintId.get(beatPid) : -1;

      for (let i = 0; i < frameMeshes.length; i++) {
        const m = frameMeshes[i]?.material;
        if (!m) continue;

        const proxGlow = i === bestIdx ? clamp01((2.2 - bestD) / 2.2) * 0.045 : 0;
        const beatGlow = i === beatIdx ? 0.035 : 0;

        const target = Math.max(proxGlow, beatGlow);
        m.emissive = new THREE.Color(0x8fb7ff);
        m.emissiveIntensity += (target - m.emissiveIntensity) * 0.14;
      }
    };

// ===== Cinematic staging (reduces emptiness) =====
const updateCinematicStaging = (dtMs) => {
  // guards: if arrays aren't ready yet – do nothing
  if (!Array.isArray(works) || works.length === 0) return;
  if (!Array.isArray(artMeshes) || artMeshes.length === 0) return;
  if (!Array.isArray(frameMeshes) || frameMeshes.length === 0) return;

  const baseFrameOpacity = Number.isFinite(frameOpacity) ? frameOpacity : 0.16;
  const bi = Number.isFinite(beatIndex) ? beatIndex : 0;

  const gateIdx =
    journey && journey.mode === "gate" && Number.isFinite(journey.gateToIndex)
      ? journey.gateToIndex
      : bi;

  const focusIdx = journey && journey.mode === "gate" ? Math.max(0, gateIdx - 1) : bi;

  const focusedIdx =
    focusedPrintId && indexByPrintId.has(focusedPrintId)
      ? indexByPrintId.get(focusedPrintId)
      : -1;

  // preview тільки для НАСТУПНОЇ роботи, якщо на неї дивляться
  const previewIdx =
    focusedIdx === bi + 1 ? focusedIdx : -1;

  // half-life smoothing (prevents harsh pop)
  const k = 1 - Math.pow(0.5, (dtMs || 16) / Math.max(1, stagingHalfLifeMs));

  for (let i = 0; i < works.length; i++) {
    const d = i - focusIdx;

    // base narrative visibility
    let targetA = 0.0;

    if (d === 0) targetA = 1.0;        // active
    else if (d === -1) targetA = 1.0;  // previous stays alive until next is confirmed
    else if (d === 1) targetA = 0.72;  // next is clearly present
    else if (d === 2) targetA = 0.46;  // farther next remains readable
    else if (d === 3) targetA = 0.28;  // distant future still visible
    else targetA = 0.0;

    // preview awakening only for the NEXT work while gaze-hold is happening
    if (previewIdx === i) {
      const previewP = clamp01(focusMs / Math.max(1, gazeHoldMs));
      targetA = Math.max(targetA, 0.72 + previewP * 0.20); // up to ~0.92
    }

    targetA = Math.max(0, Math.min(1, targetA));

    const art = artMeshes[i];
    if (art) {
      const m = art.material;
      if (m) {
        m.transparent = true;
        const cur = typeof m.opacity === "number" ? m.opacity : targetA;
        m.opacity = cur + (targetA - cur) * k;
        const visible = m.opacity > 0.02 || targetA > 0.02;
        art.visible = visible;
      } else {
        art.visible = targetA > 0.02;
      }
    }

    const frame = frameMeshes[i];
    if (frame) {
      const m = frame.material;
      const targetF = baseFrameOpacity * (0.35 + 0.65 * targetA);
      if (m) {
        m.transparent = true;
        const cur = typeof m.opacity === "number" ? m.opacity : targetF;
        m.opacity = cur + (targetF - cur) * k;
        const visible = m.opacity > baseFrameOpacity * 0.02 || targetA > 0.02;
        frame.visible = visible;
      } else {
        frame.visible = targetA > 0.02;
      }
    }
  }
};

    const updateEffects = (dtMs, tNow) => {
      if (waveOn) {
        waveT += dtMs;
        const p = clamp01(waveT / waveDurationMs);
        const s = 1 + p * 5.4;
        seaWave.scale.set(s, s, 1);
        seaWave.material.opacity = (1 - p) * 0.26;
        if (p >= 1) {
          seaWave.material.opacity = 0;
          seaWave.visible = false;
          waveOn = false;
        }
      }

      const dt = dtMs / 1000;
      let any = false;
      for (let i = 0; i < MAX_POLLEN; i++) {
        if (pollenLife[i] <= 0) continue;
        any = true;

        pollenLife[i] -= dt;
        if (pollenLife[i] <= 0) {
          pollenPos[i * 3 + 1] = -999;
          continue;
        }

        pollenPos[i * 3 + 0] += pollenVel[i * 3 + 0] * dt;
        pollenPos[i * 3 + 1] += pollenVel[i * 3 + 1] * dt;
        pollenPos[i * 3 + 2] += pollenVel[i * 3 + 2] * dt;

        pollenVel[i * 3 + 0] *= 0.985;
        pollenVel[i * 3 + 1] *= 0.99;
        pollenVel[i * 3 + 2] *= 0.985;
      }

      if (any) {
        pollenGeo.attributes.position.needsUpdate = true;
        pollenMat.opacity = 0.18 + 0.06 * Math.sin(tNow * 0.0012);
      } else {
        pollenMat.opacity = 0.0;
      }
    };

    const updateTransitionPulse = (dtMs) => {
      const k = 1 - Math.pow(0.5, (dtMs || 16) / 90);
      gatePulse += (gatePulseTarget - gatePulse) * k;

      const sceneDarken = 1 - gatePulse;
      renderer.domElement.style.filter =
        gatePulse > 0.001 ? `brightness(${sceneDarken.toFixed(3)})` : "";

      if (hazeMat) {
        const breath = clamp01(gatePulse / Math.max(0.001, gatePulsePeak));
        hazeMat.opacity = hazeBaseOpacity * (1 + breath * 0.34);
      }
    };

    const updateDust = (dtMs, tNow) => {
      if (!dustGeo || !dustVel || !dustMat || DUST <= 0) return;

      const dt = dtMs / 1000;
      const pos = dustGeo.attributes.position.array;

      for (let i = 0; i < DUST; i++) {
        pos[i * 3 + 0] += dustVel[i * 3 + 0] * dt;
        pos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;

        if (pos[i * 3 + 0] > 4.0) pos[i * 3 + 0] = -4.0;
        if (pos[i * 3 + 0] < -4.0) pos[i * 3 + 0] = 4.0;
        if (pos[i * 3 + 1] > 4.1) pos[i * 3 + 1] = 1.0;
        if (pos[i * 3 + 1] < 0.9) pos[i * 3 + 1] = 4.0;
      }

      dustGeo.attributes.position.needsUpdate = true;
      const breath = clamp01(gatePulse / Math.max(0.001, gatePulsePeak));
      dustMat.opacity = (0.085 + 0.018 * Math.sin(tNow * 0.0012)) * (1 + breath * 0.18);
    };

    // ===== Share keybinds (desktop) =====
    const onKeyDownCollect = async (e) => {
      const k = e.key.toLowerCase();

      if (k === "c") {
        if (collectorPanel?.isVisible?.()) {
          await collectorPanel.copy();
        } else {
          await collectFocused("copy");
        }
      }

      if (k === "o") {
        if (collectorPanel?.isVisible?.()) {
          collectorPanel.open();
        } else {
          await collectFocused("open");
        }
      }
    };
    window.addEventListener("keydown", onKeyDownCollect);

    // ===== Resize =====
    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    // ===== Animation loop =====
let prevT = performance.now();

renderer.setAnimationLoop((t) => {
  const dtMs = Math.min(48, Math.max(0, t - prevT));
  prevT = t;

  handVisual?.update();
  handGesture?.update();
  handContactReadiness?.update();
  handLocomotionBridge?.update();

  const handsTracked = handPresence?.isAnyHandTracked?.() ?? false;

  if (!handsTracked) {
    locomotionShell.updateTeleport();
    locomotionShell.updateSnapTurn(t);
  } else {
    // Hide fallback native teleport visuals when hand navigation is active,
    // so no detached stray lines remain in the scene.
    locomotionShell.hideTeleportVisuals?.();
  }

  if (!isMobileGyroCandidate) {
    locomotionShell.updateDesktopMove(dtMs / 1000);
  }
  updateMobileGyroMove(dtMs / 1000);

  updateGaze(dtMs);
  updateGate();
  gateCueHelper?.update(dtMs);
  updateVideoStages(dtMs, t);
  updateTransitionPulse(dtMs);

  // Cinematic staging (safe call)
  try {
    updateCinematicStaging(dtMs);
  } catch (e) {
    console.error("updateCinematicStaging error:", e);
  }

  // Zone mood (safe) — only if you actually have updateMood
  if (typeof updateMood === "function") {
    try {
      updateMood(dtMs);
    } catch (e) {
      console.error("updateMood error:", e);
    }
  }
  ambientAudio?.update();

  updateSeaSouls(dtMs, t);

  updateFinale(dtMs, t);

  updateProximityGlow();

  updateEffects(dtMs, t);
  updateDust(dtMs, t);

  collectorPanel?.updatePanel();

  let isCollectorHovering = false;
  if (collectorPanel?.isVisible() && renderer.xr.isPresenting) {
    const hoverTempMatrix = new THREE.Matrix4();
    const hoverTmpV = new THREE.Vector3();
    const hoverInteractRay = new THREE.Raycaster();

    for (const c of locomotionShell.controllers) {
      hoverTempMatrix.identity().extractRotation(c.matrixWorld);
      const origin = hoverTmpV.setFromMatrixPosition(c.matrixWorld).clone();
      const dirv = new THREE.Vector3(0, 0, -1).applyMatrix4(hoverTempMatrix).normalize();

      hoverInteractRay.set(origin, dirv);
      const hits = hoverInteractRay.intersectObjects(locomotionShell.interactiveMeshes, false);
      const hit = hits[0]?.object;

      if (hit && collectorPanel?.interactiveMeshes.includes(hit)) {
        isCollectorHovering = true;
        break;
      }
    }
  }
  collectorPanel?.updateHover(isCollectorHovering);
  updateVRInstructions(t);

  updateBeaconTrail(t);
  const beatPid = currentBeatPrintId();
  const isLastBeat = beatPid && beatIndex === beatList.length - 1;
  const beaconBoost = isLastBeat ? 0.10 : 0.0;
  beacon.material.opacity = 0.45 + beaconBoost + 0.18 * Math.sin(t * 0.002);

  renderer.render(scene, camera);
});

    return () => {
      ro.disconnect();
      clearTransitionTimers();
      renderer.setAnimationLoop(null);
      renderer.domElement.style.filter = "";

      window.removeEventListener("keydown", onKeyDownCollect);

      try {
        renderer.domElement.removeEventListener("click", onCanvasClick);
      } catch {}

      try {
        for (const fn of mobileCleanupFns) {
          try {
            fn?.();
          } catch {}
        }
      } catch {}

      try {
        mobileHud?.remove();
      } catch {}

      try {
        hint.remove();
      } catch {}

      try {
        interactionShell?.dispose();
      } catch {}

      try {
        handLocomotionBridge?.dispose();
      } catch {}

      try {
        handVisual?.dispose();
      } catch {}

      try {
        handPresence?.dispose();
      } catch {}

      try {
        instrTex?.dispose?.();
        instrMat?.dispose?.();
      } catch {}

      try {
        environmentShell?.dispose();
      } catch {}

      // Sea-only ambient Aquasouls cleanup
      try {
        seaSoulsTex?.dispose?.();
        seaSoulsGeo?.dispose?.();
        seaSoulsTrailGeo?.dispose?.();
        seaSoulsBigGeo?.dispose?.();

        seaSoulsMat?.dispose?.();
        seaSoulsTrailMat?.dispose?.();
        seaSoulsBigMat?.dispose?.();
      } catch {}

      // corridor cleanup (if used)
      try {
        shellMat?.dispose?.();
        leftWallGeo?.dispose?.();
        rightWallGeo?.dispose?.();
        ceilGeo?.dispose?.();
        backGeo?.dispose?.();
      } catch {}

      // trail cleanup
      try {
        trailGeo?.dispose?.();
        for (const r of trail) {
          r.material?.dispose?.();
        }
      } catch {}

      try {
        beacon.geometry.dispose();
        beacon.material.dispose();
      } catch {}

      try {
        seaWave.geometry.dispose();
        seaWave.material.dispose();
      } catch {}

      try {
        pollenGeo.dispose();
        pollenMat.dispose();
        pollenTex?.dispose?.();
      } catch {}

      try {
        collectorPanel?.dispose();
      } catch {}

      try {
        floor.geometry.dispose();
        floorMat.dispose();
      } catch {}

      try {
        vrBtn?.remove();
      } catch {}

      try {
        renderer.domElement.remove();
      } catch {}


      // Finale assets cleanup
      try {
        // souls
        soulsMain?.geometry?.dispose?.();
        soulsTrail1?.geometry?.dispose?.();
        soulsTrail2?.geometry?.dispose?.();
        soulsMatMain?.dispose?.();
        soulsMatT1?.dispose?.();
        soulsMatT2?.dispose?.();
        soulsCoreMat?.dispose?.();
        soulsTex?.dispose?.();

        if (soulsMain) scene.remove(soulsMain);
        if (soulsCore) scene.remove(soulsCore);
        if (soulsTrail1) scene.remove(soulsTrail1);
        if (soulsTrail2) scene.remove(soulsTrail2);

        // rain
        if (rainPoints) scene.remove(rainPoints);
        rainTex?.dispose?.();
        rainMat?.dispose?.();
        rainGeo?.dispose?.();
      } catch {}
      try {
        whisperFinaleController?.dispose?.();
      } catch {}
      try {
        ambientAudio?.dispose();
      } catch {}
      try {
        locomotionShell?.dispose();
      } catch {}
      try {
        gateCueHelper?.dispose();
      } catch {}
      try {
        renderer.dispose();
      } catch {}
    };
  }, [manifest, options, xrSupported, xrChecked]);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}
