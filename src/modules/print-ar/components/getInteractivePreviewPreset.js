export function getInteractivePreviewPreset(config) {
  const outerWidthMm = Number(config?.assembly?.outerWidthMm || 620);
  const outerHeightMm = Number(config?.assembly?.outerHeightMm || 860);
  const frameId = String(config?.frame?.id || "black").toLowerCase();
  const isLandscape = outerWidthMm >= outerHeightMm;
  const longerSideMm = Math.max(outerWidthMm, outerHeightMm);
  const baseDistance =
    longerSideMm >= 1000 ? 3.15 : longerSideMm >= 800 ? 2.8 : 2.45;
  const frameLighting = {
    black: {
      ambient: 0.78,
      key: 1.12,
      fill: 0.22,
      rim: 0.18,
      lowSide: 0.12,
      topSkim: 0.16,
    },
    white: {
      ambient: 0.84,
      key: 0.94,
      fill: 0.18,
      rim: 0.11,
      lowSide: 0.08,
      topSkim: 0.12,
    },
    oak: {
      ambient: 0.8,
      key: 1.0,
      fill: 0.2,
      rim: 0.13,
      lowSide: 0.1,
      topSkim: 0.14,
    },
  }[frameId] || {
    ambient: 0.8,
    key: 1.0,
    fill: 0.2,
    rim: 0.13,
    lowSide: 0.1,
    topSkim: 0.14,
  };

  return {
    camera: {
      fov: 26,
      near: 0.1,
      far: 24,
      distance: baseDistance - 0.08,
      minDistance: Math.max(baseDistance - 0.8, 1.55),
      maxDistance: baseDistance + 1.15,
      focusYOffset: isLandscape ? 0.01 : 0.02,
    },
    object: {
      restYaw: -0.34,
      restPitch: -0.06,
      minYaw: -0.66,
      maxYaw: 0.66,
      minPitch: -0.26,
      maxPitch: 0.16,
    },
    interaction: {
      rotateSpeed: 0.0052,
      wheelZoomSpeed: 0.00115,
      pinchZoomSpeed: 0.0044,
      damping: 0.12,
      returnSpeed: 0.03,
      idleResumeDelayMs: 1100,
    },
    idle: {
      yawAmplitude: 0.014,
      pitchAmplitude: 0.004,
      liftAmplitude: 0.011,
      yawSpeed: 0.4,
      pitchSpeed: 0.31,
      liftSpeed: 0.52,
      fadeInSpeed: 0.036,
    },
    lighting: {
      ambient: frameLighting.ambient,
      key: frameLighting.key,
      fill: frameLighting.fill,
      rim: frameLighting.rim,
      lowSide: frameLighting.lowSide,
      topSkim: frameLighting.topSkim,
      wallColor: "#1a2130",
      wallOpacity: 0.42,
      shadowOpacity: 0.14,
    },
  };
}
