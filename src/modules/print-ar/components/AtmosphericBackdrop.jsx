import { useMemo } from "react";
import { getAtmosphericBackdropPreset } from "./getAtmosphericBackdropPreset.js";
import "./AtmosphericBackdrop.css";

export default function AtmosphericBackdrop({ payload, isInteracting = false }) {
  const preset = useMemo(() => getAtmosphericBackdropPreset(payload), [payload]);

  return (
    <div
      className={`atmospheric-backdrop${
        isInteracting ? " atmospheric-backdrop--interactive" : ""
      }`}
      data-backdrop-mode={preset.mode}
      style={{
        "--atmosphere-base-top": preset.baseTop,
        "--atmosphere-base-mid": preset.baseMid,
        "--atmosphere-base-bottom": preset.baseBottom,
        "--atmosphere-center-glow-color": preset.centerGlowColor,
        "--atmosphere-center-glow-opacity": preset.centerGlowOpacity,
        "--atmosphere-center-glow-size": preset.centerGlowSize,
        "--atmosphere-center-glow-y": preset.centerGlowYOffset,
        "--atmosphere-secondary-glow-color": preset.secondaryGlowColor,
        "--atmosphere-secondary-glow-opacity": preset.secondaryGlowOpacity,
        "--atmosphere-vignette-strength": preset.vignetteStrength,
        "--atmosphere-edge-falloff": preset.edgeFalloff,
        "--atmosphere-drift-opacity": preset.driftOpacity,
        "--atmosphere-drift-blur": `${preset.driftBlurPx}px`,
        "--atmosphere-motion-duration": `${preset.motionDurationS}s`,
        "--atmosphere-motion-amplitude": `${preset.motionAmplitudePx}px`,
      }}
      aria-hidden="true"
    >
      <div className="atmospheric-backdrop__field" />
      <div className="atmospheric-backdrop__drift" />
      <div className="atmospheric-backdrop__vignette" />
    </div>
  );
}

