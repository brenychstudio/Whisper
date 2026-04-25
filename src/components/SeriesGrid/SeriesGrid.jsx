import { useNavigate } from "react-router-dom";
import styles from "./SeriesGrid.module.css";

export default function SeriesGrid({ series }) {
  const navigate = useNavigate();

  return (
    <div className={styles.grid}>
      {series.map((s) => (
        <button
          key={s.key}
          className={styles.tile}
          type="button"
          onClick={() => navigate(`/series/${s.key}`)}
        >
          <img
            className={styles.cover}
            src={s.cover}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
          />

          <div className={styles.scrim} aria-hidden="true" />

          <div className={styles.inner}>
            <div className={styles.title}>{s.title}</div>
            <div className={styles.line}>{s.shortLine}</div>
            <div className={styles.view}>View</div>
          </div>
        </button>
      ))}
    </div>
  );
}
