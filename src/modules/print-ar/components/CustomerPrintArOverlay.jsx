import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveMobileARBridge } from "../../../features/print-ar-host/mobile-ar/resolveMobileARBridge.js";
import { launchMobileARBridge } from "../../../features/print-ar-host/mobile-ar/launchMobileAR.js";
import { validateHostedAsset } from "../../../features/print-ar-host/mobile-ar/validateHostedAsset.js";
import { validateHostedIosAsset } from "../../../features/print-ar-host/mobile-ar/validateHostedIosAsset.js";
import {
  applyFramePresetToPayload,
} from "../buildPrintArPayload.js";
import { FRAME_PRESETS } from "../framePresets.js";
import InteractivePrintPreview3D from "./InteractivePrintPreview3D.jsx";
import { getCustomerPreviewState } from "../getCustomerPreviewState.js";
import "./CustomerPrintArOverlay.css";

function formatMmToCm(value) {
  const cm = Number(value || 0) / 10;
  return `${Number.isInteger(cm) ? cm.toFixed(0) : cm.toFixed(1)} cm`;
}

function buildDefaultAndroidState() {
  return {
    ok: false,
    status: "missing",
    sizeBytes: null,
    sizeLabel: "-",
    sizeTier: "unknown",
  };
}

function buildDefaultIosState() {
  return {
    ok: false,
    status: "missing",
    sizeBytes: null,
    sizeLabel: "-",
    sizeTier: "unknown",
    contentType: null,
    finalUrl: null,
  };
}

export default function CustomerPrintArOverlay() {
  const [payload, setPayload] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState("loading");
  const [hostedAssetState, setHostedAssetState] = useState(buildDefaultAndroidState);
  const [hostedIosState, setHostedIosState] = useState(buildDefaultIosState);
  const [selectedFramePresetId, setSelectedFramePresetId] = useState("black");

  const open = useCallback((nextPayload) => {
    if (!nextPayload) return null;
    setPayload(nextPayload);
    setSelectedFramePresetId(String(nextPayload?.frame?.id || "black"));
    setRuntimeStatus("loading");
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
    window.__PRINT_AR_PREVIEW__ = { open, close };

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
    let isActive = true;

    async function runValidation() {
      const url = payload?.assets?.glbUrl;
      if (!url) {
        setHostedAssetState(buildDefaultAndroidState());
        return;
      }

      setHostedAssetState((prev) => ({ ...prev, status: "checking" }));
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

    async function runValidation() {
      const url = payload?.assets?.iosSrc;
      if (!url) {
        setHostedIosState(buildDefaultIosState());
        return;
      }

      setHostedIosState((prev) => ({ ...prev, status: "checking" }));
      const result = await validateHostedIosAsset(url);
      if (!isActive) return;
      setHostedIosState(result);
    }

    if (isOpen && payload) {
      void runValidation();
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

  const customerState = useMemo(
    () =>
      getCustomerPreviewState({
        mobileBridge,
        runtimeStatus,
        selectedFrameLabel: payload?.frame?.label || payload?.frame?.style || "",
      }),
    [mobileBridge, runtimeStatus, payload],
  );

  const summary = useMemo(() => {
    if (!payload) return [];

    return [
      {
        label: "Paper size",
        value: `${formatMmToCm(payload.print?.widthMm)} x ${formatMmToCm(payload.print?.heightMm)}`,
      },
      {
        label: "Framed size",
        value: `${formatMmToCm(payload.outerSize?.widthMm)} x ${formatMmToCm(payload.outerSize?.heightMm)}`,
      },
      {
        label: "Frame",
        value: payload.frame?.label || payload.frame?.style || "No frame",
      },
      {
        label: "Passe-partout",
        value: payload.mat?.style ?? "No mat",
      },
    ];
  }, [payload]);

  const launchAndroid = useCallback(() => {
    if (!payload || !mobileBridge?.android) return;
    launchMobileARBridge(mobileBridge.android, payload, {
      resizable: false,
      enableVerticalPlacement: true,
    });
  }, [payload, mobileBridge]);

  const launchIos = useCallback(() => {
    if (!payload || !mobileBridge?.ios) return;
    launchMobileARBridge(mobileBridge.ios, payload);
  }, [payload, mobileBridge]);

  if (!isOpen || !payload) return null;

  const framePresetOptions = payload.framePresetOptions || FRAME_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    uiLabel: preset.uiLabel,
  }));

  return (
    <div
      className="customer-print-ar-backdrop"
      onClick={close}
      role="presentation"
    >
      <div
        className="customer-print-ar-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Print AR Preview"
      >
        <div className="customer-print-ar-header">
          <div>
            <div className="customer-print-ar-eyebrow">Print Preview</div>
            <h2>{payload.title}</h2>
          </div>

          <button
            type="button"
            className="customer-print-ar-btn customer-print-ar-btn--ghost"
            onClick={close}
          >
            Close
          </button>
        </div>

        <div className="customer-print-ar-body">
          <div className="customer-print-ar-canvas">
            <InteractivePrintPreview3D
              payload={payload}
              onRuntimeStatusChange={setRuntimeStatus}
            />
          </div>

          <aside className="customer-print-ar-summary">
            <div className="customer-print-ar-frame-picker">
              <div className="customer-print-ar-frame-picker__label">Frame finish</div>
              <div className="customer-print-ar-frame-picker__controls">
                {framePresetOptions.map((preset) => {
                  const isActive = selectedFramePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`customer-print-ar-frame-pill${isActive ? " customer-print-ar-frame-pill--active" : ""}`}
                      aria-pressed={isActive}
                      onClick={() => {
                        if (isActive) return;
                        setSelectedFramePresetId(preset.id);
                        setRuntimeStatus("loading");
                        setPayload((prev) => applyFramePresetToPayload(prev, preset.id));
                      }}
                    >
                      {preset.uiLabel || preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="customer-print-ar-summary-list">
              {summary.map((item) => (
                <div key={item.label} className="customer-print-ar-summary-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className={`customer-print-ar-state customer-print-ar-state--${customerState.previewStatus}`}>
              <strong>{customerState.hasPreview ? "Preview ready" : "Preview unavailable"}</strong>
              <p>{customerState.customerMessage}</p>
            </div>

            {customerState.primaryAction === "android" ? (
              <button
                type="button"
                className="customer-print-ar-btn customer-print-ar-btn--primary customer-print-ar-btn--full"
                onClick={launchAndroid}
                disabled={mobileBridge?.platform !== "android" || !mobileBridge?.android?.canAttemptLaunch}
                aria-disabled={mobileBridge?.platform !== "android" || !mobileBridge?.android?.canAttemptLaunch}
              >
                {mobileBridge?.platform === "android" && mobileBridge?.android?.canAttemptLaunch
                  ? "Open preview on Android"
                  : "Open on Android phone"}
              </button>
            ) : null}

            {customerState.primaryAction === "ios" ? (
              <button
                type="button"
                className="customer-print-ar-btn customer-print-ar-btn--primary customer-print-ar-btn--full"
                onClick={launchIos}
                disabled={mobileBridge?.platform !== "ios" || !mobileBridge?.ios?.canAttemptLaunch}
                aria-disabled={mobileBridge?.platform !== "ios" || !mobileBridge?.ios?.canAttemptLaunch}
              >
                {mobileBridge?.platform === "ios" && mobileBridge?.ios?.canAttemptLaunch
                  ? "Open preview on iPhone/iPad"
                  : "Open on iPhone/iPad"}
              </button>
            ) : null}

            {customerState.secondaryAction === "ios" ? (
              <button
                type="button"
                className="customer-print-ar-btn customer-print-ar-btn--secondary customer-print-ar-btn--full"
                onClick={launchIos}
                disabled={mobileBridge?.platform !== "ios" || !mobileBridge?.ios?.canAttemptLaunch}
                aria-disabled={mobileBridge?.platform !== "ios" || !mobileBridge?.ios?.canAttemptLaunch}
              >
                iPhone/iPad fallback
              </button>
            ) : null}

            {!customerState.hasPreview ? (
              <p className="customer-print-ar-note">
                Preview is not available for this exact variant yet.
              </p>
            ) : (
              <p className="customer-print-ar-note">
                Android is the primary wall-preview path. iPhone/iPad uses Quick Look fallback.
              </p>
            )}

            <div className="customer-print-ar-actions">
              <button
                type="button"
                className="customer-print-ar-btn customer-print-ar-btn--ghost"
                onClick={close}
              >
                Back
              </button>

              <a
                className="customer-print-ar-btn customer-print-ar-btn--primary"
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
