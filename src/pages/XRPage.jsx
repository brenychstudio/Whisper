// src/pages/XRPage.jsx
import { useMemo } from "react";
import { site } from "../content/config.js";
import XRExperienceHost from "../xr-core/runtime/XRExperienceHost.jsx";

export default function XRPage() {
  const opts = useMemo(() => site?.xr || {}, []);
  const builderLoader = useMemo(
    () => () => import("../xr-experiences/whisper/manifest/buildWhisperManifest.js"),
    []
  );

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: "#05060a" }}>
      <XRExperienceHost mode="kiosk" options={opts} builderLoader={builderLoader} autoStart />
    </div>
  );
}