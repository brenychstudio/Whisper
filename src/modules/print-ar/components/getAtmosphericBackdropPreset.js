function resolveFrameTone(payload) {
  const value = String(payload?.frame?.style || "").toLowerCase();

  if (value.includes("black")) return "black-frame";
  if (value.includes("white")) return "light-frame";
  if (value.includes("oak")) return "warm-frame";

  return "neutral-frame";
}

export function getAtmosphericBackdropPreset(payload) {
  const frameTone = resolveFrameTone(payload);
  const blackFrameBoost = frameTone === "black-frame";

  return {
    mode: "quiet-museum",
    frameTone,
    baseTop: "#141a24",
    baseMid: "#0d1218",
    baseBottom: "#07090d",
    centerGlowColor: blackFrameBoost ? "120, 143, 178" : "96, 114, 142",
    centerGlowOpacity: blackFrameBoost ? 0.28 : 0.2,
    centerGlowSize: blackFrameBoost ? "74%" : "68%",
    centerGlowYOffset: "43%",
    secondaryGlowColor: "38, 49, 64",
    secondaryGlowOpacity: 0.18,
    vignetteStrength: 0.62,
    edgeFalloff: "76%",
    driftOpacity: blackFrameBoost ? 0.11 : 0.08,
    driftBlurPx: 28,
    motionDurationS: 24,
    motionAmplitudePx: blackFrameBoost ? 16 : 12,
  };
}

