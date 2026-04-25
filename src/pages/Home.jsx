import { useNavigate } from "react-router-dom";
import { site } from "../content/config.js";
import VideoHero from "../components/VideoHero/VideoHero.jsx";
import styles from "./Home.module.css";

export default function Home() {
  const navigate = useNavigate();
  const xrEnabled = site?.xr?.enabled !== false;

  return (
    <div className={styles.page}>
      <VideoHero mp4={site.heroVideo.mp4} webm={site.heroVideo.webm} poster={site.heroVideo.poster} />

      <div className={styles.center}>
        <div className={styles.eyebrow}>{site.eyebrow}</div>
        <div className={styles.title}>{site.title}</div>
        <div className={styles.tagline}>{site.tagline}</div>

        <div className={styles.ctaRow}>
          <button className={styles.cta} onClick={() => navigate("/series")} type="button">
            {site.cta}
          </button>

          {xrEnabled ? (
            <button className={styles.ctaGhost} onClick={() => navigate(site?.xr?.experiencePath || "/experience")} type="button">
              Enter VR
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}