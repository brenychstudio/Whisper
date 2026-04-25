// src/pages/ExperiencePage.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { site } from "../content/config.js";
import XRExperienceHost from "../xr-core/runtime/XRExperienceHost.jsx";

export default function ExperiencePage() {
  const navigate = useNavigate();

  const opts = useMemo(() => site?.xr || {}, []);
  const builderLoader = useMemo(
    () => () => import("../xr-experiences/whisper/manifest/buildWhisperManifest.js"),
    []
  );

  return (
    <div
      style={{
        width: "min(92vw, 980px)",
        margin: "0 auto",
        padding: "calc(var(--header-h) + 44px) 0 110px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        WHISPER XR
      </div>

      <h1
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(34px, 4.4vw, 58px)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        Experience Entry
      </h1>

      <p
        style={{
          marginTop: 16,
          maxWidth: "72ch",
          lineHeight: 1.85,
          color: "rgba(255,255,255,0.68)",
          fontSize: 14,
        }}
      >
        Exhibition mode: desktop preview + VR entry (Quest-first).
      </p>

      <div style={{ marginTop: 18 }}>
        <XRExperienceHost
          mode="exhibition"
          options={opts}
          builderLoader={builderLoader}
          autoStart={false}
        />
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => navigate("/xr")}
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "transparent",
            color: "rgba(255,255,255,0.70)",
            padding: "12px 14px",
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Open kiosk
        </button>

        <button
          type="button"
          onClick={() => navigate("/series")}
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "transparent",
            color: "rgba(255,255,255,0.70)",
            padding: "12px 14px",
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Explore series
        </button>
      </div>
    </div>
  );
}