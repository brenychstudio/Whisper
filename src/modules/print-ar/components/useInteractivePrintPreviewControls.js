import { useMemo, useRef } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function useInteractivePrintPreviewControls(preset) {
  const controlsRef = useRef({
    yaw: preset.object.restYaw,
    pitch: preset.object.restPitch,
    distance: preset.camera.distance,
    targetYaw: preset.object.restYaw,
    targetPitch: preset.object.restPitch,
    targetDistance: preset.camera.distance,
    isInteracting: false,
    lastInteractionAt: 0,
  });
  const pointersRef = useRef(new Map());
  const pinchDistanceRef = useRef(null);

  const clampTargets = () => {
    const controls = controlsRef.current;
    controls.targetYaw = clamp(
      controls.targetYaw,
      preset.object.minYaw,
      preset.object.maxYaw,
    );
    controls.targetPitch = clamp(
      controls.targetPitch,
      preset.object.minPitch,
      preset.object.maxPitch,
    );
    controls.targetDistance = clamp(
      controls.targetDistance,
      preset.camera.minDistance,
      preset.camera.maxDistance,
    );
  };

  const handlers = useMemo(
    () => ({
      onPointerDown(event) {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });

        controlsRef.current.isInteracting = true;
        controlsRef.current.lastInteractionAt = performance.now();

        if (pointersRef.current.size < 2) {
          pinchDistanceRef.current = null;
        }
      },
      onPointerMove(event) {
        const prevPoint = pointersRef.current.get(event.pointerId);
        if (!prevPoint) return;

        const nextPoint = {
          x: event.clientX,
          y: event.clientY,
        };
        pointersRef.current.set(event.pointerId, nextPoint);

        const controls = controlsRef.current;
        controls.lastInteractionAt = performance.now();

        if (pointersRef.current.size === 1) {
          const dx = nextPoint.x - prevPoint.x;
          const dy = nextPoint.y - prevPoint.y;

          controls.targetYaw += dx * preset.interaction.rotateSpeed;
          controls.targetPitch += dy * preset.interaction.rotateSpeed;
          clampTargets();
          return;
        }

        if (pointersRef.current.size >= 2) {
          const points = Array.from(pointersRef.current.values()).slice(0, 2);
          const distance = Math.hypot(
            points[0].x - points[1].x,
            points[0].y - points[1].y,
          );

          if (pinchDistanceRef.current != null) {
            const delta = distance - pinchDistanceRef.current;
            controls.targetDistance -= delta * preset.interaction.pinchZoomSpeed;
            clampTargets();
          }

          pinchDistanceRef.current = distance;
        }
      },
      onPointerUp(event) {
        pointersRef.current.delete(event.pointerId);
        event.currentTarget.releasePointerCapture?.(event.pointerId);

        if (pointersRef.current.size < 2) {
          pinchDistanceRef.current = null;
        }

        if (pointersRef.current.size === 0) {
          controlsRef.current.isInteracting = false;
          controlsRef.current.lastInteractionAt = performance.now();
        }
      },
      onPointerCancel(event) {
        pointersRef.current.delete(event.pointerId);
        pinchDistanceRef.current = null;
        if (pointersRef.current.size === 0) {
          controlsRef.current.isInteracting = false;
          controlsRef.current.lastInteractionAt = performance.now();
        }
      },
      onWheel(event) {
        event.preventDefault();
        const controls = controlsRef.current;
        controls.targetDistance +=
          event.deltaY * preset.interaction.wheelZoomSpeed;
        controls.lastInteractionAt = performance.now();
        clampTargets();
      },
      onDoubleClick() {
        const controls = controlsRef.current;
        controls.targetYaw = preset.object.restYaw;
        controls.targetPitch = preset.object.restPitch;
        controls.targetDistance = preset.camera.distance;
        controls.lastInteractionAt = performance.now();
        clampTargets();
      },
    }),
    [preset],
  );

  return {
    controlsRef,
    handlers,
  };
}
