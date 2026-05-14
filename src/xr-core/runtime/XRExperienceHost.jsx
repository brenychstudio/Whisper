// src/xr-core/runtime/XRExperienceHost.jsx
import { useEffect, useMemo, useState } from "react";
import {
  canUseDeviceOrientation,
  isImmersiveVRSupported,
  isLikelyHeadsetXRBrowser,
  isLikelyMobileViewport,
} from "./useXRSupport.js";
import { validateManifest } from "../content/validateManifest.js";

export default function XRExperienceHost({
  mode = "exhibition",
  options,
  autoStart = false,
  builderLoader,
  launchLabel,
  launchClassName,
  launchStyle,
}) {
  const [supported, setSupported] = useState(false);
  const [checked, setChecked] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [gyroCapable, setGyroCapable] = useState(false);
  const [headsetXRBrowser, setHeadsetXRBrowser] = useState(false);
  const [started, setStarted] = useState(autoStart);

  const [manifest, setManifest] = useState(null);
  const [XRRoot, setXRRoot] = useState(null);
  const [err, setErr] = useState(null);
  const [manifestErrors, setManifestErrors] = useState(null);
  const [manifestWarnings, setManifestWarnings] = useState(null);

  const height = useMemo(() => (mode === "kiosk" ? "100dvh" : "56vh"), [mode]);
  const minHeight = useMemo(() => (mode === "kiosk" ? "100dvh" : "420px"), [mode]);
  const hostClassName = `xr-experience-host xr-experience-host--${mode}`;

  useEffect(() => {
    let alive = true;
    isImmersiveVRSupported().then((ok) => {
      if (!alive) return;
      setSupported(Boolean(ok));
      setChecked(true);
    });

    setMobileViewport(isLikelyMobileViewport());
    setGyroCapable(canUseDeviceOrientation());
    setHeadsetXRBrowser(isLikelyHeadsetXRBrowser());

    const onResize = () => {
      setMobileViewport(isLikelyMobileViewport());
      setGyroCapable(canUseDeviceOrientation());
      setHeadsetXRBrowser(isLikelyHeadsetXRBrowser());
    };

    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    let alive = true;

    async function boot() {
      try {
        if (typeof builderLoader !== "function") {
          throw new Error("XR manifest builderLoader is required.");
        }

        const [builderMod, XRRootMod] = await Promise.all([
          builderLoader(),
          import("./XRRootThree.jsx"),
        ]);

        const build =
          builderMod?.buildManifest || builderMod?.buildWhisperManifest || builderMod?.default;

        if (typeof build !== "function") {
          throw new Error(
            "XR manifest builder must export a function (buildManifest | buildWhisperManifest | default)."
          );
        }

        const m = await build();
        if (!alive) return;

        const v = validateManifest(m);

setManifestWarnings(Array.isArray(v.warnings) && v.warnings.length ? v.warnings : null);

if (!v.ok) {
  setManifestErrors(v.errors);
  setErr("XR manifest validation failed.");
  return;
}

setManifest(v.manifest || m);
setXRRoot(() => XRRootMod.default);
      } catch (e) {
        if (!alive) return;
        setManifestErrors(null);
        setErr(String(e?.message || e));
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, [started, builderLoader]);

  if (!started) {
    const resolvedLaunchLabel = launchLabel ||
      (checked
        ? (mobileViewport && gyroCapable && !headsetXRBrowser
            ? "Launch mobile gyro"
            : supported
              ? "Launch (VR ready)"
              : "Launch preview")
        : "Launch");

    return (
      <button
        className={launchClassName}
        type="button"
        onClick={() => setStarted(true)}
        style={{
          border: "1px solid rgba(255,255,255,0.18)",
          background: "transparent",
          color: "rgba(255,255,255,0.86)",
          padding: "12px 14px",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          fontSize: 11,
          cursor: "pointer",
          ...launchStyle,
        }}
      >
        {resolvedLaunchLabel}
      </button>
    );
  }

  if (err) {
  const canCopy = typeof navigator !== "undefined" && navigator.clipboard?.writeText;

  const copyDiagnostics = async () => {
    const payload = {
      error: err,
      manifestErrors,
      manifestWarnings,
    };
    const txt = JSON.stringify(payload, null, 2);

    try {
      if (canCopy) await navigator.clipboard.writeText(txt);
    } catch {
      // Diagnostics copy is optional; the visible error remains on screen.
    }
  };

  return (
    <div
      style={{
        color: "rgba(255,255,255,0.80)",
        fontSize: 12,
        lineHeight: 1.6,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.35)",
        padding: 14,
        maxWidth: 760,
      }}
    >
      <div style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 10, opacity: 0.7 }}>
        XR Fail-safe
      </div>

      <div style={{ marginTop: 8 }}>
        XR init failed: <span style={{ opacity: 0.85 }}>{err}</span>
      </div>

      {(Array.isArray(manifestErrors) && manifestErrors.length) ||
      (Array.isArray(manifestWarnings) && manifestWarnings.length) ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {canCopy ? (
              <button
                type="button"
                onClick={copyDiagnostics}
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.78)",
                  padding: "8px 10px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Copy diagnostics
              </button>
            ) : null}

            <div style={{ opacity: 0.55, fontSize: 11 }}>
              Fix manifest → refresh (/immersive or /xr)
            </div>
          </div>

          {Array.isArray(manifestErrors) && manifestErrors.length ? (
            <>
              <div style={{ marginTop: 10, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Errors
              </div>
              <ul style={{ marginTop: 6, paddingLeft: 18, color: "rgba(255,255,255,0.70)" }}>
                {manifestErrors.map((x) => (
                  <li key={`e-${x}`}>{x}</li>
                ))}
              </ul>
            </>
          ) : null}

          {Array.isArray(manifestWarnings) && manifestWarnings.length ? (
            <>
              <div style={{ marginTop: 10, opacity: 0.60, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Warnings
              </div>
              <ul style={{ marginTop: 6, paddingLeft: 18, color: "rgba(255,255,255,0.55)" }}>
                {manifestWarnings.map((x) => (
                  <li key={`w-${x}`}>{x}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

  if (!XRRoot || !manifest) {
    return <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>Loading XR…</div>;
  }

  return (
    <div
      className={hostClassName}
      style={{
        position: "relative",
        width: "100%",
        height,
        minHeight,
        border: mode === "kiosk" ? "none" : "1px solid rgba(255,255,255,0.10)",
        background: mode === "kiosk" ? "#05060a" : "rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}
    >
      <XRRoot manifest={manifest} options={options} xrSupported={supported} xrChecked={checked} />

      {checked && !supported ? (
        <div
          className="xr-host-preview-badge"
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.28)",
            color: "rgba(255,255,255,0.62)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: 10,
            pointerEvents: "none",
          }}
        >
          {mobileViewport && gyroCapable && !headsetXRBrowser
            ? "Mobile gyro preview"
            : "Desktop preview"}
        </div>
      ) : null}

      <style>{`
        #VRButton{
          position:absolute;
          right:14px;
          bottom:14px;
          padding:12px 14px;
          border:1px solid rgba(255,255,255,0.18) !important;
          background:rgba(0,0,0,0.35) !important;
          color:rgba(255,255,255,0.88) !important;
          letter-spacing:0.26em;
          text-transform:uppercase;
          font-size:11px;
          border-radius:0;
        }

        .xr-host-preview-badge{
          display:none !important;
        }

        @media (max-width: 760px){
          .xr-experience-host--exhibition{
            height: clamp(560px, 78svh, 680px) !important;
            min-height: 560px !important;
          }

          .xr-experience-host--kiosk{
            height: 100svh !important;
            min-height: 100svh !important;
          }

          .xr-host-preview-badge{
            display:none !important;
          }

          .xr-interaction-rail{
            bottom:calc(126px + env(safe-area-inset-bottom, 0px)) !important;
            padding:0 12px !important;
            z-index:8 !important;
          }

          .xr-interaction-rail-inner{
            min-width:0 !important;
            width:100% !important;
            max-width:420px !important;
            padding:10px 12px !important;
            display:grid !important;
            grid-template-columns:1fr auto !important;
            align-items:center !important;
            gap:6px 10px !important;
          }

          .xr-interaction-rail-title{
            min-width:0 !important;
            grid-column:1 / -1 !important;
            font-size:9px !important;
            letter-spacing:0.18em !important;
            white-space:normal !important;
            overflow:hidden !important;
            text-overflow:ellipsis !important;
          }

          .xr-interaction-rail-caption{
            min-width:0 !important;
            white-space:normal !important;
            overflow:hidden !important;
            display:-webkit-box !important;
            -webkit-line-clamp:2 !important;
            -webkit-box-orient:vertical !important;
            font-size:11px !important;
          }

          .xr-interaction-rail-hint{
            font-size:9px !important;
            letter-spacing:0.14em !important;
          }

          .xr-interaction-rail-meter{
            display:none !important;
          }

          .xr-interaction-desktop-hint,
          .xr-interaction-vr-hint{
            display:none !important;
          }

          .xr-mobile-status{
            font-size:9px !important;
            letter-spacing:0.14em !important;
            white-space:normal !important;
            overflow-wrap:anywhere !important;
          }

          .xr-mobile-permission-button{
            font-size:10px !important;
            letter-spacing:0.18em !important;
            white-space:normal !important;
          }

          .xr-mobile-pad{
            bottom:calc(14px + env(safe-area-inset-bottom, 0px)) !important;
          }

          .xr-mobile-pad-button{
            min-width:0 !important;
            padding:0 8px !important;
            font-size:10px !important;
            letter-spacing:0.12em !important;
            white-space:nowrap !important;
          }

          #VRButton{
            right:12px;
            bottom:calc(12px + env(safe-area-inset-bottom, 0px));
            max-width:calc(100% - 24px);
            white-space:normal;
            letter-spacing:0.18em;
          }
        }
      `}</style>
    </div>
  );
}
