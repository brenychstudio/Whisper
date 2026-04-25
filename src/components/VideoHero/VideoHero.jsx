import styles from "./VideoHero.module.css";

export default function VideoHero({ mp4, webm, poster }) {
  return (
    <div className={styles.wrap}>
      <video
        className={styles.video}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
      >
        {webm ? <source src={webm} type="video/webm" /> : null}
        <source src={mp4} type="video/mp4" />
      </video>
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  );
}
