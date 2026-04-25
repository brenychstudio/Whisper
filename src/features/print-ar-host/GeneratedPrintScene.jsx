import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPrintSceneConfig } from "./buildPrintSceneConfig.js";
import { buildExportSceneGroup } from "./export/buildExportSceneGroup.js";
import { useThreeRuntimeLoader } from "./useThreeRuntimeLoader.js";

export default function GeneratedPrintScene({
  payload,
  onRuntimeStatusChange,
}) {
  const containerRef = useRef(null);
  const runtime = useThreeRuntimeLoader(Boolean(payload));
  const config = useMemo(() => buildPrintSceneConfig(payload), [payload]);

  useEffect(() => {
    if (!runtime.isLoaded || !containerRef.current || !payload) return undefined;

    let isDisposed = false;
    let animationFrameId = 0;
    let resizeObserver;
    let cleanupFn;

    async function mountScene() {
      try {
        onRuntimeStatusChange?.("loading");

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        const previewAppearance = config.appearance?.preview || {};

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(
          previewAppearance.backgroundColor || "#0f141d",
        );

        const camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 100);
        camera.position.set(0, 0.015, 5.05);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
        renderer.setSize(width, height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping =
          previewAppearance.rendererToneMapping === "neutral"
            ? THREE.NeutralToneMapping
            : THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = previewAppearance.rendererExposure ?? 1;
        container.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(
          0xffffff,
          previewAppearance.ambientIntensity ?? 0.95,
        );
        const keyLight = new THREE.DirectionalLight(
          0xffffff,
          previewAppearance.keyIntensity ?? 0.64,
        );
        const fillLight = new THREE.DirectionalLight(
          0xffffff,
          previewAppearance.fillIntensity ?? 0.12,
        );
        const rimLight = new THREE.DirectionalLight(
          0xe9eef8,
          previewAppearance.rimIntensity ?? 0.06,
        );

        keyLight.position.set(2.4, 3.1, 4.0);
        fillLight.position.set(-2.2, 1.0, 2.8);
        rimLight.position.set(-1.8, 2.3, -3.0);
        scene.add(ambient, keyLight, fillLight, rimLight);

        const wallGeometry = new THREE.PlaneGeometry(12, 8);
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: previewAppearance.wallColor || "#1a2130",
          roughness: 1,
          metalness: 0,
          transparent: true,
          opacity: previewAppearance.wallOpacity ?? 0.42,
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(0, 0, -0.06);
        scene.add(wall);

        const objectRoot = new THREE.Group();
        scene.add(objectRoot);

        const { group, dispose } = await buildExportSceneGroup(payload, {
          exportTarget: "generated-preview",
          textureFlipY: true,
        });
        if (isDisposed) {
          dispose();
          wallGeometry.dispose();
          wallMaterial.dispose();
          return;
        }

        const bounds = new THREE.Box3().setFromObject(group);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        group.position.sub(center);
        objectRoot.add(group);

        const shadowGeometry = new THREE.PlaneGeometry(
          Math.max(size.x * 1.03, 0.35),
          Math.max(size.y * 1.03, 0.35),
        );
        const shadowMaterial = new THREE.MeshBasicMaterial({
          color: "#000000",
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowPlane.position.set(0, -0.004, bounds.min.z - center.z - 0.016);
        objectRoot.add(shadowPlane);

        const baseRotationX = -0.05;
        const baseRotationY = 0.1;
        const basePositionY = -0.012;

        objectRoot.rotation.x = baseRotationX;
        objectRoot.rotation.y = baseRotationY;
        objectRoot.position.y = basePositionY;

        const handleResize = () => {
          const nextWidth = Math.max(container.clientWidth, 1);
          const nextHeight = Math.max(container.clientHeight, 1);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, nextHeight);
        };

        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        onRuntimeStatusChange?.("ready");

        const start = performance.now();
        const renderLoop = () => {
          if (isDisposed) return;

          const t = (performance.now() - start) * 0.001;
          objectRoot.rotation.x = baseRotationX + Math.sin(t * 0.42) * 0.0012;
          objectRoot.rotation.y = baseRotationY + Math.sin(t * 0.36) * 0.0032;
          objectRoot.position.y = basePositionY + Math.sin(t * 0.54) * 0.003;

          renderer.render(scene, camera);
          animationFrameId = window.requestAnimationFrame(renderLoop);
        };

        renderLoop();

        cleanupFn = () => {
          resizeObserver?.disconnect();
          window.cancelAnimationFrame(animationFrameId);
          shadowGeometry.dispose();
          shadowMaterial.dispose();
          wallGeometry.dispose();
          wallMaterial.dispose();
          dispose();
          renderer.dispose();
          container.innerHTML = "";
        };
      } catch {
        onRuntimeStatusChange?.("error");
      }
    }

    void mountScene();

    return () => {
      isDisposed = true;
      cleanupFn?.();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [config, runtime.isLoaded, payload, onRuntimeStatusChange]);

  if (runtime.isLoading) {
    return (
      <div className="print-ar-host-scene print-ar-host-scene--state">
        <div className="print-ar-host-note">Loading preview runtime...</div>
      </div>
    );
  }

  if (runtime.error) {
    return (
      <div className="print-ar-host-scene print-ar-host-scene--state">
        <div className="print-ar-host-note print-ar-host-note--error">
          Runtime preview failed to load.
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="print-ar-host-scene" />;
}
