import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildPrintSceneConfig } from "../../../features/print-ar-host/buildPrintSceneConfig.js";
import { buildExportSceneGroup } from "../../../features/print-ar-host/export/buildExportSceneGroup.js";
import AtmosphericBackdrop from "./AtmosphericBackdrop.jsx";
import { getInteractivePreviewPreset } from "./getInteractivePreviewPreset.js";
import { useInteractivePrintPreviewControls } from "./useInteractivePrintPreviewControls.js";
import "./InteractivePrintPreview3D.css";

function damp(current, target, factor) {
  return current + (target - current) * factor;
}

export default function InteractivePrintPreview3D({
  payload,
  onRuntimeStatusChange,
}) {
  const containerRef = useRef(null);
  const interactionTimeoutRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const config = useMemo(() => buildPrintSceneConfig(payload), [payload]);
  const preset = useMemo(
    () => getInteractivePreviewPreset(config),
    [config],
  );
  const { controlsRef, handlers } = useInteractivePrintPreviewControls(preset);

  useEffect(
    () => () => {
      window.clearTimeout(interactionTimeoutRef.current);
    },
    [],
  );

  const markInteractionStart = () => {
    window.clearTimeout(interactionTimeoutRef.current);
    setIsInteracting(true);
  };

  const scheduleInteractionRelease = (delay = 180) => {
    window.clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = window.setTimeout(() => {
      setIsInteracting(false);
    }, delay);
  };

  useEffect(() => {
    if (!payload || !containerRef.current) return undefined;

    let disposed = false;
    let animationFrameId = 0;
    let renderer;
    let cleanupScene;
    let resizeObserver;

    async function mountScene() {
      try {
        onRuntimeStatusChange?.("loading");

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);

        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(
          preset.camera.fov,
          width / height,
          preset.camera.near,
          preset.camera.far,
        );

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, preset.lighting.ambient);
        const keyLight = new THREE.DirectionalLight(0xffffff, preset.lighting.key);
        const fillLight = new THREE.DirectionalLight(0xffffff, preset.lighting.fill);
        const rimLight = new THREE.DirectionalLight(0xe9eef8, preset.lighting.rim);
        const lowSideLight = new THREE.DirectionalLight(
          0xffffff,
          preset.lighting.lowSide,
        );
        const topSkimLight = new THREE.DirectionalLight(
          0xf3ede3,
          preset.lighting.topSkim,
        );

        keyLight.position.set(2.8, 3.4, 4.2);
        fillLight.position.set(-2.5, 0.8, 2.6);
        rimLight.position.set(-1.6, 2.1, -3.2);
        lowSideLight.position.set(2.6, -1.2, -2.4);
        topSkimLight.position.set(0.35, 3.8, 2.4);

        scene.add(
          ambient,
          keyLight,
          fillLight,
          rimLight,
          lowSideLight,
          topSkimLight,
        );

        const stageRoot = new THREE.Group();
        scene.add(stageRoot);

        const { group, dispose } = await buildExportSceneGroup(payload, {
          exportTarget: "interactive-preview",
          textureFlipY: true,
        });
        if (disposed) {
          dispose();
          return;
        }

        const objectRoot = new THREE.Group();
        objectRoot.add(group);
        stageRoot.add(objectRoot);

        const bounds = new THREE.Box3().setFromObject(group);
        const center = bounds.getCenter(new THREE.Vector3());
        group.position.sub(center);
        group.position.y -= center.y * 0.02;

        const controls = controlsRef.current;
        controls.yaw = preset.object.restYaw;
        controls.pitch = preset.object.restPitch;
        controls.distance = preset.camera.distance;
        controls.targetYaw = preset.object.restYaw;
        controls.targetPitch = preset.object.restPitch;
        controls.targetDistance = preset.camera.distance;
        controls.isInteracting = false;
        controls.lastInteractionAt = performance.now();

        const updateCamera = () => {
          camera.position.set(
            0,
            preset.camera.focusYOffset,
            controls.distance,
          );
          camera.lookAt(0, preset.camera.focusYOffset * 0.45, 0);
        };

        const handleResize = () => {
          if (!container || !renderer) return;
          const nextWidth = Math.max(container.clientWidth, 1);
          const nextHeight = Math.max(container.clientHeight, 1);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, nextHeight);
        };

        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
        updateCamera();

        onRuntimeStatusChange?.("ready");

        const start = performance.now();

        const renderLoop = () => {
          if (disposed || !renderer) return;

          const now = performance.now();
          const elapsed = (now - start) * 0.001;
          const idleDelayReached =
            !controls.isInteracting &&
            now - controls.lastInteractionAt > preset.interaction.idleResumeDelayMs;

          if (idleDelayReached) {
            controls.targetYaw = damp(
              controls.targetYaw,
              preset.object.restYaw,
              preset.interaction.returnSpeed,
            );
            controls.targetPitch = damp(
              controls.targetPitch,
              preset.object.restPitch,
              preset.interaction.returnSpeed,
            );
            controls.targetDistance = damp(
              controls.targetDistance,
              preset.camera.distance,
              preset.interaction.returnSpeed,
            );
          }

          controls.yaw = damp(
            controls.yaw,
            controls.targetYaw,
            preset.interaction.damping,
          );
          controls.pitch = damp(
            controls.pitch,
            controls.targetPitch,
            preset.interaction.damping,
          );
          controls.distance = damp(
            controls.distance,
            controls.targetDistance,
            preset.interaction.damping,
          );

          const idleWeight =
            controls.isInteracting || !idleDelayReached
              ? 0
              : Math.min(
                  (now - controls.lastInteractionAt - preset.interaction.idleResumeDelayMs) *
                    preset.idle.fadeInSpeed *
                    0.001,
                  1,
                );

          objectRoot.rotation.x =
            controls.pitch +
            Math.sin(elapsed * preset.idle.pitchSpeed) *
              preset.idle.pitchAmplitude *
              idleWeight;
          objectRoot.rotation.y =
            controls.yaw +
            Math.sin(elapsed * preset.idle.yawSpeed) *
              preset.idle.yawAmplitude *
              idleWeight;
          objectRoot.position.y =
            Math.sin(elapsed * preset.idle.liftSpeed) *
            preset.idle.liftAmplitude *
            idleWeight;

          updateCamera();
          renderer.render(scene, camera);
          animationFrameId = window.requestAnimationFrame(renderLoop);
        };

        renderLoop();

        cleanupScene = () => {
          window.cancelAnimationFrame(animationFrameId);
          resizeObserver?.disconnect();
          dispose();
          renderer?.dispose();
          if (container) {
            container.innerHTML = "";
          }
        };
      } catch {
        onRuntimeStatusChange?.("error");
      }
    }

    void mountScene();

    return () => {
      disposed = true;
      cleanupScene?.();
      if (renderer) {
        renderer.dispose();
      }
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
    };
  }, [payload, preset, controlsRef, onRuntimeStatusChange]);

  return (
    <div
      className="print-ar-preview3d"
      onPointerDown={(event) => {
        markInteractionStart();
        handlers.onPointerDown(event);
      }}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={(event) => {
        handlers.onPointerUp(event);
        scheduleInteractionRelease();
      }}
      onPointerCancel={(event) => {
        handlers.onPointerCancel(event);
        scheduleInteractionRelease();
      }}
      onWheel={(event) => {
        markInteractionStart();
        handlers.onWheel(event);
        scheduleInteractionRelease(260);
      }}
      onDoubleClick={(event) => {
        markInteractionStart();
        handlers.onDoubleClick(event);
        scheduleInteractionRelease(260);
      }}
      aria-label="Interactive 3D preview"
      role="img"
    >
      <div className="print-ar-preview3d__backdrop">
        <AtmosphericBackdrop payload={payload} isInteracting={isInteracting} />
      </div>
      <div ref={containerRef} className="print-ar-preview3d__viewport" />
    </div>
  );
}
