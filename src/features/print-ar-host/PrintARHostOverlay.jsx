import { useCallback, useEffect, useMemo, useState } from "react";
import GeneratedPrintScene from "./GeneratedPrintScene.jsx";
import { resolveMobileARBridge } from "./mobile-ar/resolveMobileARBridge.js";
import { launchMobileARBridge } from "./mobile-ar/launchMobileAR.js";
import { validateHostedAsset } from "./mobile-ar/validateHostedAsset.js";
import { validateHostedIosAsset } from "./mobile-ar/validateHostedIosAsset.js";
import { exportPrintSceneToGlb } from "./export/exportPrintSceneToGlb.js";
import { exportPrintSceneToUsdz } from "./export/exportPrintSceneToUsdz.js";
import { getIosPlacementGuidance } from "./mobile-ar/getIosPlacementGuidance.js";
import "./PrintARHostOverlay.css";

function formatMmToCm(value) {
  const cm = Number(value || 0) / 10;
  return `${Number.isInteger(cm) ? cm.toFixed(0) : cm.toFixed(1)} cm`;
}

function formatBytes(value) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function buildDefaultAndroidState() {
  return {
    ok: false,
    status: "missing",
    statusCode: null,
    message: "No hosted GLB attached to this variant yet.",
    sizeBytes: null,
    sizeLabel: "-",
    sizeTier: "unknown",
  };
}

function buildDefaultIosState() {
  return {
    ok: false,
    status: "missing",
    statusCode: null,
    message: "No hosted USDZ attached to this variant yet.",
    sizeBytes: null,
    bytes: null,
    sizeLabel: "-",
    sizeTier: "unknown",
    contentType: null,
    finalUrl: null,
  };
}

function formatHostedStateLabel(state) {
  if (state.status === "checking") return "Checking";
  if (state.status === "available") return "Available";
  if (state.status === "not-found") return "Missing";
  if (state.status === "error") return "Error";
  if (state.status === "ok") return "Reachable";
  if (state.status === "ok-heavy") return "Reachable (Heavy)";
  if (state.status === "too-heavy") return "Reachable (Heavy)";
  if (state.status === "missing") return "Missing";
  if (state.status === "unreachable") return "Unreachable";
  if (state.status === "invalid") return "Invalid";
  return "Not attached";
}

function formatPlatformReadinessLabel(readiness) {
  if (readiness === "ready") return "AR ready";
  if (readiness === "ready-warning") return "Ready with warning";
  if (readiness === "disabled") return "Disabled in manifest";
  if (readiness === "unreachable") return "Hosted file unreachable";
  if (readiness === "invalid") return "Hosted file invalid";
  if (readiness === "checking") return "Checking hosted file";
  if (readiness === "needs-attach") return "Asset needs attach";
  if (readiness === "needs-lighter-export") return "Needs lighter export";
  if (readiness === "unsupported-platform") return "Unsupported platform";
  if (readiness === "missing-asset" || readiness === "missing") return "Hosted asset missing";
  if (readiness === "desktop") return "Open on phone";
  return "Not ready";
}

function toneClassFromLevel(level) {
  if (level === "ready") return "print-ar-host-status--ok";
  if (level === "error") return "print-ar-host-status--error";
  if (level === "checking") return "print-ar-host-status--checking";
  return "print-ar-host-status--warn";
}

function formatPlatformStateLabel(value) {
  if (value === "both-ready") return "Android + iPhone/iPad ready";
  if (value === "android-ready-only") return "Android ready only";
  if (value === "ios-ready-only") return "iPhone/iPad ready only";
  return "Neither platform fully ready";
}

function resolveLocalGenerationStatus(isGenerating, output, error) {
  if (isGenerating) return "Generating";
  if (output) return "Ready";
  if (error) return "Failed";
  return "Idle";
}

function describeTextureOptimization(summary) {
  if (!summary) return "Texture optimization summary is not available yet.";
  if (!summary.applied) {
    return `Artwork kept at ${summary.sourceWidth}x${summary.sourceHeight}.`;
  }
  return `Artwork downscaled from ${summary.sourceWidth}x${summary.sourceHeight} to ${summary.outputWidth}x${summary.outputHeight}.`;
}

function formatSizeTierLabel(tier) {
  if (tier === "ok") return "Light / balanced";
  if (tier === "heavy") return "Heavy";
  if (tier === "hard-limit-risk") return "Very heavy";
  return "Unknown";
}

export default function PrintARHostOverlay({ internalMode = false }) {
  const [payload, setPayload] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState("loading");
  const [isGeneratingGlb, setIsGeneratingGlb] = useState(false);
  const [generatedGlb, setGeneratedGlb] = useState(null);
  const [glbError, setGlbError] = useState(null);
  const [isGeneratingUsdz, setIsGeneratingUsdz] = useState(false);
  const [generatedUsdz, setGeneratedUsdz] = useState(null);
  const [usdzError, setUsdzError] = useState(null);
  const [iosExportMode, setIosExportMode] = useState("balanced");
  const [androidScaleMode, setAndroidScaleMode] = useState("true-scale");
  const [hostedAssetState, setHostedAssetState] = useState(buildDefaultAndroidState);
  const [hostedIosState, setHostedIosState] = useState(buildDefaultIosState);

  const open = useCallback((nextPayload) => {
    if (!nextPayload) return null;
    setPayload(nextPayload);
    setRuntimeStatus("loading");
    setGeneratedGlb(null);
    setGlbError(null);
    setGeneratedUsdz(null);
    setUsdzError(null);
    setIsGeneratingGlb(false);
    setIsGeneratingUsdz(false);
    setIosExportMode("balanced");
    setAndroidScaleMode(nextPayload?.androidAr?.scaleMode || "true-scale");
    setHostedAssetState(buildDefaultAndroidState());
    setHostedIosState(buildDefaultIosState());
    setIsOpen(true);
    return nextPayload;
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleOpen = (event) => {
      open(event.detail);
    };

    window.addEventListener("print-ar-preview:open", handleOpen);

    window.__PRINT_AR_PREVIEW__ = {
      open,
      close,
    };

    return () => {
      window.removeEventListener("print-ar-preview:open", handleOpen);

      if (window.__PRINT_AR_PREVIEW__) {
        delete window.__PRINT_AR_PREVIEW__;
      }
    };
  }, [open, close]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };

    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  useEffect(() => {
    return () => {
      if (generatedGlb?.objectUrl) {
        URL.revokeObjectURL(generatedGlb.objectUrl);
      }
    };
  }, [generatedGlb]);

  useEffect(() => {
    return () => {
      if (generatedUsdz?.objectUrl) {
        URL.revokeObjectURL(generatedUsdz.objectUrl);
      }
    };
  }, [generatedUsdz]);

  useEffect(() => {
    let isActive = true;

    async function runValidation() {
      const url = payload?.assets?.glbUrl;

      if (!url) {
        setHostedAssetState(buildDefaultAndroidState());
        return;
      }

      setHostedAssetState({
        ok: false,
        status: "checking",
        statusCode: null,
        message: "Checking hosted GLB path...",
        sizeBytes: null,
        sizeLabel: "-",
        sizeTier: "unknown",
      });

      const result = await validateHostedAsset(url);

      if (!isActive) return;
      setHostedAssetState(result);
    }

    if (isOpen && payload) {
      void runValidation();
    }

    return () => {
      isActive = false;
    };
  }, [isOpen, payload]);

  useEffect(() => {
    let isActive = true;

    async function runIosValidation() {
      const url = payload?.assets?.iosSrc;

      if (!url) {
        setHostedIosState(buildDefaultIosState());
        return;
      }

      setHostedIosState({
        ok: false,
        status: "checking",
        statusCode: null,
        message: "Checking hosted USDZ path...",
        sizeBytes: null,
        bytes: null,
        sizeLabel: "-",
        sizeTier: "unknown",
        contentType: null,
        finalUrl: null,
      });

      const result = await validateHostedIosAsset(url);

      if (!isActive) return;
      setHostedIosState(result);
    }

    if (isOpen && payload) {
      void runIosValidation();
    }

    return () => {
      isActive = false;
    };
  }, [isOpen, payload]);

  const mobileBridge = useMemo(() => {
    if (!payload) return null;
    const androidValidation =
      hostedAssetState.status === "checking" ? null : hostedAssetState;
    const iosValidation =
      hostedIosState.status === "checking" ? null : hostedIosState;

    return resolveMobileARBridge(payload, {
      androidValidation,
      iosValidation,
    });
  }, [payload, hostedAssetState, hostedIosState]);

  const androidBridge = mobileBridge?.android || null;
  const iosBridge = mobileBridge?.ios || null;
  const health = mobileBridge?.androidHealth || null;

  const summary = useMemo(() => {
    if (!payload) return [];

    return [
      {
        label: "Paper size",
        value: `${formatMmToCm(payload.print?.widthMm)} x ${formatMmToCm(payload.print?.heightMm)}`,
      },
      {
        label: "Image area",
        value: `${formatMmToCm(payload.imageArea?.widthMm)} x ${formatMmToCm(payload.imageArea?.heightMm)}`,
      },
      {
        label: "Framed size",
        value: `${formatMmToCm(payload.outerSize?.widthMm)} x ${formatMmToCm(payload.outerSize?.heightMm)}`,
      },
      {
        label: "Frame",
        value: payload.frame?.style ?? "No frame",
      },
      {
        label: "Passe-partout",
        value: payload.mat?.style ?? "No mat",
      },
      {
        label: "Asset key",
        value: payload.assetKey ?? "-",
      },
      {
        label: "Local GLB",
        value: resolveLocalGenerationStatus(isGeneratingGlb, generatedGlb, glbError),
      },
      {
        label: "Local USDZ",
        value: resolveLocalGenerationStatus(isGeneratingUsdz, generatedUsdz, usdzError),
      },
      {
        label: "Variant readiness",
        value: formatPlatformStateLabel(health?.platformState),
      },
      {
        label: "Preview status",
        value:
          runtimeStatus === "ready"
            ? "Ready"
            : runtimeStatus === "error"
              ? "Error"
              : "Preparing",
      },
    ];
  }, [
    payload,
    runtimeStatus,
    isGeneratingGlb,
    generatedGlb,
    glbError,
    isGeneratingUsdz,
    generatedUsdz,
    usdzError,
    health,
  ]);

  const handleLaunchAndroid = useCallback(() => {
    if (!payload || !androidBridge) return;

    launchMobileARBridge(androidBridge, payload, {
      resizable: androidScaleMode === "adjustable",
      enableVerticalPlacement: true,
    });
  }, [payload, androidBridge, androidScaleMode]);

  const handleLaunchIos = useCallback(() => {
    if (!payload || !iosBridge) return;
    launchMobileARBridge(iosBridge, payload);
  }, [payload, iosBridge]);

  const handleGenerateGlb = useCallback(async () => {
    if (!payload) return;

    try {
      setIsGeneratingGlb(true);
      setGlbError(null);

      if (generatedGlb?.objectUrl) {
        URL.revokeObjectURL(generatedGlb.objectUrl);
      }

      const result = await exportPrintSceneToGlb(payload);

      setGeneratedGlb(result);
      window.__PRINT_AR_LAST_GENERATED_GLB__ = result;
    } catch (error) {
      setGlbError(
        error instanceof Error ? error.message : "GLB generation failed.",
      );
    } finally {
      setIsGeneratingGlb(false);
    }
  }, [payload, generatedGlb]);

  const handleGenerateUsdz = useCallback(async () => {
    if (!payload) return;

    try {
      setIsGeneratingUsdz(true);
      setUsdzError(null);

      if (generatedUsdz?.objectUrl) {
        URL.revokeObjectURL(generatedUsdz.objectUrl);
      }

      const result = await exportPrintSceneToUsdz(payload, {
        mode: iosExportMode,
      });

      setGeneratedUsdz(result);
      window.__PRINT_AR_LAST_GENERATED_USDZ__ = result;
    } catch (error) {
      setUsdzError(
        error instanceof Error ? error.message : "USDZ generation failed.",
      );
    } finally {
      setIsGeneratingUsdz(false);
    }
  }, [payload, generatedUsdz, iosExportMode]);

  const handleDownloadGlb = useCallback(() => {
    if (!generatedGlb?.objectUrl) return;

    const link = document.createElement("a");
    link.href = generatedGlb.objectUrl;
    link.download = generatedGlb.fileName;
    link.click();
  }, [generatedGlb]);

  const handleDownloadUsdz = useCallback(() => {
    if (!generatedUsdz?.objectUrl) return;

    const link = document.createElement("a");
    link.href = generatedUsdz.objectUrl;
    link.download = generatedUsdz.fileName;
    link.click();
  }, [generatedUsdz]);

  const handleOpenHostedAsset = useCallback(() => {
    if (!payload?.assets?.glbUrl) return;
    window.open(payload.assets.glbUrl, "_blank", "noopener,noreferrer");
  }, [payload]);

  const handleOpenHostedUsdz = useCallback(() => {
    if (!payload?.assets?.iosSrc) return;
    window.open(payload.assets.iosSrc, "_blank", "noopener,noreferrer");
  }, [payload]);

  const handleOpenWorkflow = useCallback(() => {
    if (!payload?.assetKey) return;

    window.dispatchEvent(
      new CustomEvent("print-ar-workflow:open", {
        detail: {
          source: "overlay",
          assetKey: payload.assetKey,
          printId: payload.productId || "",
        },
      }),
    );
  }, [payload]);

  const hostedSizeHint = useMemo(() => {
    if (hostedAssetState.sizeTier === "hard-limit-risk") {
      return "Too heavy for comfortable Android use. Final optimization will be required.";
    }

    if (hostedAssetState.sizeTier === "heavy") {
      return "Heavier than ideal, but acceptable for current MVP testing.";
    }

    if (hostedAssetState.sizeTier === "ok") {
      return "Good enough for current Android testing.";
    }

    return "File size is unknown from headers.";
  }, [hostedAssetState]);

  const generatedUsdzHeavy = useMemo(() => {
    const tier = generatedUsdz?.sizeTier || hostedIosState?.sizeTier;
    return tier === "heavy" || tier === "hard-limit-risk";
  }, [generatedUsdz, hostedIosState]);

  const iosPlacementTips = useMemo(
    () =>
      getIosPlacementGuidance({
        lowLight: false,
        preferObjectModeFirst: true,
        heavyAsset: generatedUsdzHeavy || iosBridge?.health?.iosTooHeavy,
        wallFirst: true,
        experimentMode: generatedUsdz?.wallFirstExperimentEnabled === true,
      }),
    [generatedUsdzHeavy, iosBridge, generatedUsdz],
  );

  if (!isOpen || !payload) return null;

  return (
    <div
      className="print-ar-host-backdrop"
      onClick={close}
      role="presentation"
    >
      <div
        className={`print-ar-host-panel ${internalMode ? "print-ar-host-panel--internal" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Print AR Preview"
      >
        <div className="print-ar-host-header">
          <div>
            <div className="print-ar-host-eyebrow">
              {internalMode ? "Print AR Preview - Internal tools" : "Print AR Preview"}
            </div>
            <h2>{payload.title}</h2>
          </div>

          <button
            type="button"
            className="print-ar-host-close"
            onClick={close}
          >
            Close
          </button>
        </div>

        <div className="print-ar-host-body">
          <div className="print-ar-host-canvas">
            <GeneratedPrintScene
              payload={payload}
              onRuntimeStatusChange={setRuntimeStatus}
            />
          </div>

          <aside className="print-ar-host-summary">
            {internalMode ? (
              <p className="print-ar-host-copy print-ar-host-copy--compact print-ar-host-copy--internal">
                Internal overlay mode is active. Generation, validation, and attach diagnostics are visible here.
              </p>
            ) : null}
            <div className="print-ar-host-eyebrow">Selected configuration</div>
            <h3>Preview summary</h3>

            <div className="print-ar-host-summary-list">
              {summary.map((item) => (
                <div key={item.label} className="print-ar-host-summary-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="print-ar-host-bridge">
              <div className="print-ar-host-eyebrow">First GLB generation path</div>

              <p className="print-ar-host-copy print-ar-host-copy--compact">
                Browser-side GLB generation stays here for fast Android testing. The generated file still needs manual placement into /public/generated/ before you attach it in the manifest.
              </p>

              <div className={`print-ar-host-status ${toneClassFromLevel(glbError ? "error" : generatedGlb ? "ready" : isGeneratingGlb ? "checking" : "warn")}`}>
                <span>Status</span>
                <strong>{resolveLocalGenerationStatus(isGeneratingGlb, generatedGlb, glbError)}</strong>
                <p>
                  {glbError
                    ? glbError
                    : generatedGlb
                      ? "Local GLB is ready to download and manually attach."
                      : "Generate one exact GLB for this variant when you need a fresh Android asset."}
                </p>
              </div>

              <button
                type="button"
                className="print-ar-host-primary print-ar-host-primary--full"
                onClick={handleGenerateGlb}
                disabled={isGeneratingGlb || isGeneratingUsdz}
                aria-disabled={isGeneratingGlb || isGeneratingUsdz}
              >
                {isGeneratingGlb ? "Generating GLB..." : "Generate GLB (MVP)"}
              </button>

              <button
                type="button"
                className="print-ar-host-secondary print-ar-host-secondary--full"
                onClick={handleDownloadGlb}
                disabled={!generatedGlb}
                aria-disabled={!generatedGlb}
              >
                Download generated GLB
              </button>

              <button
                type="button"
                className="print-ar-host-secondary print-ar-host-secondary--full print-ar-host-workflow-link"
                onClick={handleOpenWorkflow}
                disabled={!payload?.assetKey}
                aria-disabled={!payload?.assetKey}
              >
                Open multi-variant workflow
              </button>

              {generatedGlb ? (
                <div className="print-ar-host-path">
                  <span>Generated GLB</span>
                  <strong>{generatedGlb.fileName}</strong>
                  <strong>{formatBytes(generatedGlb.sizeBytes)}</strong>
                </div>
              ) : null}
            </div>

            <div className="print-ar-host-bridge">
              <div className="print-ar-host-eyebrow">First USDZ generation path</div>

              <p className="print-ar-host-copy print-ar-host-copy--compact">
                This pass creates one local USDZ for manual attach into /public/generated/. It does not auto-publish or auto-edit the manifest.
              </p>

              <div className="print-ar-host-mode-toggle">
                <button
                  type="button"
                  className={
                    iosExportMode === "balanced"
                      ? "print-ar-host-mode-button is-active"
                      : "print-ar-host-mode-button"
                  }
                  onClick={() => setIosExportMode("balanced")}
                  disabled={isGeneratingUsdz}
                >
                  Balanced
                </button>

                <button
                  type="button"
                  className={
                    iosExportMode === "wall-first-experiment"
                      ? "print-ar-host-mode-button is-active"
                      : "print-ar-host-mode-button"
                  }
                  onClick={() => setIosExportMode("wall-first-experiment")}
                  disabled={isGeneratingUsdz}
                >
                  Wall-first experiment
                </button>
              </div>

              <p className="print-ar-host-copy print-ar-host-copy--compact">
                {iosExportMode === "wall-first-experiment"
                  ? "Wall-first experiment: stronger initial orientation for Quick Look retest."
                  : "Balanced mode: calmer wall-first orientation with fewer aggressive transform assumptions."}
              </p>

              <div className={`print-ar-host-status ${toneClassFromLevel(usdzError ? "error" : generatedUsdz ? "ready" : isGeneratingUsdz ? "checking" : "warn")}`}>
                <span>Status</span>
                <strong>{resolveLocalGenerationStatus(isGeneratingUsdz, generatedUsdz, usdzError)}</strong>
                <p>
                  {usdzError
                    ? usdzError
                    : generatedUsdz
                      ? "Local USDZ is ready to download and manually attach for iPad/iPhone Quick Look testing."
                      : "Generate one exact USDZ for this variant when you want a real Quick Look asset to test."}
                </p>
              </div>

              <button
                type="button"
                className="print-ar-host-primary print-ar-host-primary--full"
                onClick={handleGenerateUsdz}
                disabled={isGeneratingUsdz || isGeneratingGlb}
                aria-disabled={isGeneratingUsdz || isGeneratingGlb}
              >
                {isGeneratingUsdz
                  ? iosExportMode === "wall-first-experiment"
                    ? "Generating experiment USDZ..."
                    : "Generating USDZ..."
                  : iosExportMode === "wall-first-experiment"
                    ? "Generate USDZ (Wall-First Experiment)"
                    : "Generate USDZ (Balanced)"}
              </button>

              <button
                type="button"
                className="print-ar-host-secondary print-ar-host-secondary--full"
                onClick={handleDownloadUsdz}
                disabled={!generatedUsdz}
                aria-disabled={!generatedUsdz}
              >
                Download generated USDZ
              </button>

              {generatedUsdz ? (
                <>
                  <div className="print-ar-host-path">
                    <span>Generated USDZ</span>
                    <strong>{generatedUsdz.fileName}</strong>
                    <strong>{formatBytes(generatedUsdz.sizeBytes)}</strong>
                  </div>

                  <div className="print-ar-host-grid">
                    <div className="print-ar-host-path">
                      <span>Export profile</span>
                      <strong>{generatedUsdz.exportProfileUsed?.label || "Balanced"}</strong>
                    </div>

                    <div className="print-ar-host-path">
                      <span>Planned hosted path</span>
                      <strong>{payload.bridgeAssets?.planned?.quickLookUsdzPath}</strong>
                    </div>
                  </div>

                  <div className="print-ar-host-path">
                    <span>Texture preparation</span>
                    <strong>{describeTextureOptimization(generatedUsdz.textureOptimization)}</strong>
                  </div>

                  <div className="print-ar-host-grid">
                    <div className="print-ar-host-path">
                      <span>Texture strategy</span>
                      <strong>{generatedUsdz.textureStrategy || "unknown"}</strong>
                    </div>

                    <div className="print-ar-host-path">
                      <span>USDZ size tier</span>
                      <strong>{formatSizeTierLabel(generatedUsdz.sizeTier)}</strong>
                    </div>
                  </div>

                  <div className="print-ar-host-grid">
                    <div className="print-ar-host-path">
                      <span>Wall placement mode</span>
                      <strong>{generatedUsdz.wallPlacement?.mode || "unknown"}</strong>
                    </div>

                    <div className="print-ar-host-path">
                      <span>Pivot normalization</span>
                      <strong>{generatedUsdz.pivotNormalization?.strategy || "unknown"}</strong>
                    </div>
                  </div>

                  <div className="print-ar-host-grid">
                    <div className="print-ar-host-path">
                      <span>Initial transform preset</span>
                      <strong>{generatedUsdz.scenePrep?.initialTransformPreset || generatedUsdz.initialTransform?.preset || "unknown"}</strong>
                    </div>

                    <div className="print-ar-host-path">
                      <span>Interaction intent</span>
                      <strong>{generatedUsdz.scenePrep?.interactionIntent || generatedUsdz.wallPlacement?.interactionIntent || "wall-art-preview"}</strong>
                    </div>
                  </div>

                  {generatedUsdz.wallFirstExperimentEnabled ? (
                    <div className="print-ar-host-tip-card print-ar-host-tip-card--experiment">
                      <span>Experiment mode</span>
                      <strong>Wall-first experiment is active for this USDZ.</strong>
                      <p>Use this build to compare whether stronger pre-rotation helps native Quick Look behave more like wall art.</p>
                    </div>
                  ) : null}

                  {generatedUsdz.qualityWarnings?.length ? (
                    <div className="print-ar-host-issues">
                      {generatedUsdz.qualityWarnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  ) : null}

                  {generatedUsdz.qualityNotes?.length ? (
                    <div className="print-ar-host-path">
                      <span>Export quality notes</span>
                      {generatedUsdz.qualityNotes.map((note) => (
                        <strong key={note}>{note}</strong>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="print-ar-host-bridge">
              <div className="print-ar-host-eyebrow">Primary Android readiness</div>

              <div className={`print-ar-host-status ${toneClassFromLevel(androidBridge?.health?.level)}`}>
                <span>Status</span>
                <strong>{formatPlatformReadinessLabel(androidBridge?.readiness)}</strong>
                <p>{androidBridge?.message || hostedAssetState.message}</p>
              </div>

              <p className="print-ar-host-copy print-ar-host-copy--compact">
                Android Scene Viewer is the primary supported wall-preview path in this module. Launch stays locked to the exact hosted GLB variant only when readiness is real.
              </p>

              <div className="print-ar-host-path">
                <span>Variant asset key</span>
                <strong>{payload.assetKey}</strong>
              </div>

              <div className="print-ar-host-path">
                <span>Manifest status</span>
                <strong>{payload.bridgeAssets?.manifestStatus || "missing"}</strong>
              </div>

              {payload.assets?.glbUrl ? (
                <div className="print-ar-host-path">
                  <span>Hosted GLB path</span>
                  <strong>{payload.assets.glbUrl}</strong>
                </div>
              ) : null}

              <div className={`print-ar-host-size-card ${
                hostedAssetState.sizeTier === "hard-limit-risk"
                  ? "print-ar-host-size-card--danger"
                  : hostedAssetState.sizeTier === "heavy"
                    ? "print-ar-host-size-card--warn"
                    : "print-ar-host-size-card--ok"
              }`}>
                <span>Hosted asset size</span>
                <strong>{hostedAssetState.sizeLabel}</strong>
                <p>{hostedSizeHint}</p>
              </div>

              {androidBridge?.health?.issues?.length ? (
                <div className="print-ar-host-issues">
                  {androidBridge.health.issues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="print-ar-host-secondary print-ar-host-secondary--full"
                onClick={handleOpenHostedAsset}
                disabled={!payload.assets?.glbUrl}
                aria-disabled={!payload.assets?.glbUrl}
              >
                Open hosted GLB file
              </button>
            </div>

            <div className="print-ar-host-bridge">
              <div className="print-ar-host-eyebrow">Primary Android launch</div>

              <div className="print-ar-host-summary-row">
                <span>Current device</span>
                <strong>{mobileBridge?.platformLabel ?? "Unknown"}</strong>
              </div>

              <div className="print-ar-host-summary-row">
                <span>Android AR mode</span>
                <strong>{androidBridge?.mode ?? "Unknown"}</strong>
              </div>

              <div className="print-ar-host-summary-row">
                <span>Android readiness</span>
                <strong>{formatPlatformReadinessLabel(androidBridge?.readiness)}</strong>
              </div>

              <div className="print-ar-host-scale-toggle">
                <button
                  type="button"
                  className={
                    androidScaleMode === "true-scale"
                      ? "print-ar-host-scale-button is-active"
                      : "print-ar-host-scale-button"
                  }
                  onClick={() => setAndroidScaleMode("true-scale")}
                >
                  True scale
                </button>

                <button
                  type="button"
                  className={
                    androidScaleMode === "adjustable"
                      ? "print-ar-host-scale-button is-active"
                      : "print-ar-host-scale-button"
                  }
                  onClick={() => setAndroidScaleMode("adjustable")}
                >
                  Adjustable
                </button>
              </div>

              <p className="print-ar-host-copy print-ar-host-copy--compact">
                {androidScaleMode === "true-scale"
                  ? "True scale locks resizing in Scene Viewer so the print starts closer to real physical dimensions."
                  : "Adjustable leaves resizing enabled for easier placement during testing."}
              </p>

              <div className="print-ar-host-steps">
                <div className="print-ar-host-step">
                  <span>1</span>
                  <p>Open only the exact print variant whose hosted GLB is attached and reachable.</p>
                </div>
                <div className="print-ar-host-step">
                  <span>2</span>
                  <p>Point the phone at the wall and move slowly until Scene Viewer finds a stable surface.</p>
                </div>
                <div className="print-ar-host-step">
                  <span>3</span>
                  <p>Use True scale for realistic size checking, or Adjustable when you want easier manual placement.</p>
                </div>
              </div>

              <button
                type="button"
                className="print-ar-host-primary print-ar-host-primary--full"
                onClick={handleLaunchAndroid}
                disabled={mobileBridge?.platform !== "android" || !androidBridge?.canAttemptLaunch}
                aria-disabled={mobileBridge?.platform !== "android" || !androidBridge?.canAttemptLaunch}
              >
                {mobileBridge?.platform !== "android"
                  ? "Open on Android to launch"
                  : androidBridge?.canLaunchAttached
                    ? androidScaleMode === "true-scale"
                      ? "Open AR in true scale"
                      : "Open AR with resize enabled"
                    : androidBridge?.readiness === "disabled"
                      ? "Android asset disabled in manifest"
                      : androidBridge?.readiness === "needs-attach"
                        ? "Android asset still needs attach"
                      : androidBridge?.readiness === "unreachable"
                        ? "Hosted GLB unreachable"
                        : androidBridge?.readiness === "invalid"
                          ? "Hosted GLB invalid"
                        : androidBridge?.readiness === "checking"
                          ? "Checking hosted GLB..."
                          : "AR asset not ready yet"}
              </button>
            </div>

            <div className="print-ar-host-bridge">
              <div className="print-ar-host-eyebrow">iPhone / iPad fallback</div>

              <div className={`print-ar-host-status ${toneClassFromLevel(iosBridge?.policy?.level)}`}>
                <span>Status</span>
                <strong>{iosBridge?.policy?.label || formatHostedStateLabel(hostedIosState)}</strong>
                <p>{iosBridge?.message || hostedIosState.message}</p>
              </div>

              {iosBridge?.health?.iosLaunchReady ? (
                <p className="print-ar-host-copy print-ar-host-copy--compact print-ar-host-copy--experimental">
                  iPhone/iPad remains a secondary fallback path here. Quick Look may still vary by light, wall texture, and device state.
                </p>
              ) : null}

              <div className="print-ar-host-tip-card">
                <span>Wall-first intent</span>
                <strong>This iOS export is tuned for wall-facing placement first.</strong>
                <p>Object mode is mainly for inspection, not the final wall-preview target.</p>
              </div>

              {payload.bridgeAssets?.planned?.quickLookUsdzPath ? (
                <div className="print-ar-host-path">
                  <span>Expected USDZ path</span>
                  <strong>{payload.bridgeAssets.planned.quickLookUsdzPath}</strong>
                </div>
              ) : null}

              {payload.assets?.iosSrc ? (
                <div className="print-ar-host-path">
                  <span>Attached USDZ path</span>
                  <strong>{payload.assets.iosSrc}</strong>
                </div>
              ) : null}

              <div className="print-ar-host-grid">
                <div className="print-ar-host-path">
                  <span>Quick Look mode</span>
                  <strong>{iosBridge?.quickLookMode === "object" ? "Object preview" : "AR preview"}</strong>
                </div>

                <div className="print-ar-host-path">
                  <span>iOS readiness</span>
                  <strong>{formatPlatformReadinessLabel(iosBridge?.readiness)}</strong>
                </div>
              </div>

              {hostedIosState.contentType ? (
                <div className="print-ar-host-grid">
                  <div className="print-ar-host-path">
                    <span>Response MIME</span>
                    <strong>{hostedIosState.contentType}</strong>
                  </div>

                  <div className="print-ar-host-path">
                    <span>Hosted USDZ size</span>
                    <strong>{hostedIosState.sizeLabel}</strong>
                  </div>
                </div>
              ) : null}

              {hostedIosState.sizeTier ? (
                <div className="print-ar-host-path">
                  <span>Hosted USDZ size tier</span>
                  <strong>{formatSizeTierLabel(hostedIosState.sizeTier)}</strong>
                </div>
              ) : null}

              {hostedIosState.finalUrl ? (
                <div className="print-ar-host-path">
                  <span>Final URL checked</span>
                  <strong>{hostedIosState.finalUrl}</strong>
                </div>
              ) : null}

              {iosBridge?.health?.iosIssues?.length ? (
                <div className="print-ar-host-issues">
                  {iosBridge.health.iosIssues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              ) : null}

              {iosBridge?.policy?.instructions?.length ? (
                <div className="print-ar-host-instructions">
                  <div className="print-ar-host-eyebrow">First iPad test</div>
                  {iosBridge.policy.instructions.map((instruction, index) => (
                    <div key={instruction} className="print-ar-host-step">
                      <span>{index + 1}</span>
                      <p>{instruction}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {iosPlacementTips.length ? (
                <div className="print-ar-host-instructions">
                  <div className="print-ar-host-eyebrow">Placement tips</div>
                  {iosPlacementTips.map((instruction, index) => (
                    <div key={instruction} className="print-ar-host-step">
                      <span>{index + 1}</span>
                      <p>{instruction}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="print-ar-host-secondary print-ar-host-secondary--full"
                onClick={handleOpenHostedUsdz}
                disabled={!payload.assets?.iosSrc}
                aria-disabled={!payload.assets?.iosSrc}
              >
                Open hosted USDZ file
              </button>

              <button
                type="button"
                className="print-ar-host-primary print-ar-host-primary--full"
                onClick={handleLaunchIos}
                disabled={mobileBridge?.platform !== "ios" || !iosBridge?.canAttemptLaunch}
                aria-disabled={mobileBridge?.platform !== "ios" || !iosBridge?.canAttemptLaunch}
              >
                {mobileBridge?.platform !== "ios"
                  ? "Open on iPhone/iPad to launch"
                  : iosBridge?.policy?.ctaLabel || "Open AR Quick Look"}
              </button>

              <p className="print-ar-host-copy print-ar-host-copy--compact">
                Quick Look is preserved as a fallback. USDZ hosting is still manual: download it, move it into /public/generated/, update the manifest, then validate on the device.
              </p>
            </div>

            <p className="print-ar-host-copy">
              Paper size includes the white print borders. The artwork is fitted inside the sheet without cropping.
            </p>

            <div className="print-ar-host-actions">
              <button
                type="button"
                className="print-ar-host-secondary"
                onClick={close}
              >
                Back
              </button>

              <a
                className="print-ar-host-primary"
                href={payload.cta?.url || "#"}
              >
                {payload.cta?.label || "Purchase"}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
