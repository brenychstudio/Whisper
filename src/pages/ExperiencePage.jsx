// src/pages/ExperiencePage.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { site } from "../content/config.js";
import XRExperienceHost from "../xr-core/runtime/XRExperienceHost.jsx";
import styles from "./ExperiencePage.module.css";

export default function ExperiencePage() {
  const navigate = useNavigate();

  const opts = useMemo(() => site?.xr || {}, []);
  const builderLoader = useMemo(
    () => () => import("../xr-experiences/whisper/manifest/buildWhisperManifest.js"),
    []
  );

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>WHISPER IMMERSIVE</div>

          <h1 className={styles.h1}>Immersive Exhibition</h1>

          <p className={styles.p}>
            A spatial passage through sea, forest, and memory. Enter the exhibition in fullscreen, or open a quiet desktop preview before crossing the threshold.
          </p>

          <div className={styles.actions}>
            <button
              className={`${styles.action} ${styles.actionPrimary}`}
              type="button"
              onClick={() => navigate(site?.xr?.kioskPath || "/xr")}
            >
              Enter exhibition
            </button>

            <button
              className={styles.action}
              type="button"
              onClick={() => navigate("/series")}
            >
              Explore series
            </button>
          </div>

          <div className={styles.meta} aria-label="Immersive formats">
            <span>Desktop preview</span>
            <span>Quest ready</span>
            <span>Spatial archive</span>
          </div>
        </div>

        <div className={styles.portal} aria-label="Desktop exhibition preview">
          <div className={styles.portalHeader}>
            <span>Preview field</span>
            <span>WHISPER XR</span>
          </div>

          <div className={styles.host}>
            <XRExperienceHost
              mode="exhibition"
              options={opts}
              builderLoader={builderLoader}
              autoStart={false}
              launchLabel="Desktop preview"
              launchClassName={styles.previewButton}
              launchStyle={{
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.78)",
                minHeight: 42,
                padding: "0 16px",
              }}
            />
          </div>

          <div className={styles.portalFooter}>
            <span>Sea / Forest sequence</span>
            <span>Memory corridor</span>
          </div>
        </div>
      </div>
    </section>
  );
}
