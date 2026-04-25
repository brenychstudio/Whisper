const IOS_POLICY = {
  ready: {
    label: "USDZ ready",
    message: "USDZ ready for iPhone/iPad preview.",
    level: "ready",
    ctaLabel: "Open AR Quick Look",
    instructions: [
      "Open the preview.",
      "Tap AR if Quick Look prompts for it.",
      "Move the device slowly so the room can stabilize.",
      "Place the artwork on the wall or in the room if AR placement becomes available.",
    ],
  },
  missing: {
    label: "USDZ not attached",
    message: "USDZ not attached yet.",
    level: "warn",
    ctaLabel: "USDZ not attached yet",
    instructions: [],
  },
  disabled: {
    label: "iOS disabled",
    message: "iOS preview disabled for this asset.",
    level: "warn",
    ctaLabel: "iOS preview disabled",
    instructions: [],
  },
  unreachable: {
    label: "USDZ unreachable",
    message: "USDZ file unreachable.",
    level: "error",
    ctaLabel: "USDZ unreachable",
    instructions: [],
  },
  invalid: {
    label: "USDZ invalid",
    message: "USDZ file looks invalid for Quick Look.",
    level: "error",
    ctaLabel: "USDZ invalid",
    instructions: [],
  },
  checking: {
    label: "Checking USDZ",
    message: "Checking hosted USDZ before enabling Quick Look.",
    level: "checking",
    ctaLabel: "Checking USDZ...",
    instructions: [],
  },
};

function resolveStateFromHealth(health) {
  if (!health) return "missing";
  if (health.iosLaunchReady) return "ready";
  if (
    health.manifestDeclared &&
    (health.manifestStatus === "disabled" || !health.iosEnabled)
  ) {
    return "disabled";
  }
  if (
    !health.manifestDeclared ||
    health.manifestStatus === "missing" ||
    !health.iosDeclared
  ) {
    return "missing";
  }
  if (health.iosValidationStatus === "invalid") {
    return "invalid";
  }
  if (
    health.iosReachable === false ||
    health.iosValidationStatus === "unreachable"
  ) {
    return "unreachable";
  }
  return "checking";
}

export function getIosQuickLookPolicy(input = {}) {
  const health = input.health || null;
  const state = input.state || resolveStateFromHealth(health);
  const base = IOS_POLICY[state] || IOS_POLICY.missing;
  const quickLookMode = input.quickLookMode || health?.iosQuickLookMode || "ar";

  return {
    state,
    label: base.label,
    message: base.message,
    level: base.level,
    ctaLabel: base.ctaLabel,
    instructions: base.instructions,
    quickLookMode,
  };
}
