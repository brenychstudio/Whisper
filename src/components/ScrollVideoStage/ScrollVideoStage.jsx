import { useEffect, useRef } from "react";
import styles from "./ScrollVideoStage.module.css";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function ScrollVideoStage({
  src,
  poster,
  heightVh = 220,
  topOffset = 24,
  introVh = 18, // ✅ “буфер” перед sticky, щоб не перекривало попереднє фото
  caption,
}) {

  const sectionRef = useRef(null);
  const frameRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!section || !frame) return;

    let raf = 0;
    let p = 0;       // поточний (сгладжений) прогрес
    let target = 0;  // цільовий прогрес

    const setVars = (val) => {
      const e = easeOutCubic(val);
      frame.style.setProperty("--p", val.toFixed(4));
      frame.style.setProperty("--e", e.toFixed(4));
    };

    const computeTarget = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // прогрес 0..1 по проходженню секції
      const total = Math.max(1, rect.height - vh);

/* lead-in: анімація починається, коли секція ще під’їжджає (Apple-style) */
const lead = vh * 0.35; // 35% viewport “заздалегідь”
const raw = (lead - rect.top) / total;

target = clamp01(raw);

// play/pause: граємо довше (навіть коли наступні фото вже частково видно)
if (video) {
  // запас, щоб відео не зупинялось рано
  const marginTop = vh * 0.20;      // дозволяємо бути нижче viewport ще трохи
  const marginBottom = vh * 0.55;   // дозволяємо бути вище viewport ще довше (пізніше stop)

  const inExtendedView =
    rect.top < (vh + marginTop) &&
    rect.bottom > (-marginBottom);

  if (inExtendedView) {
    const prom = video.play?.();
    if (prom && typeof prom.catch === "function") prom.catch(() => {});
  } else {
    video.pause?.();
  }
}

      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = 0;
      // “signature smoothness”: не тільки на scroll — доганяємо до target
      p = p + (target - p) * 0.12;
      if (Math.abs(target - p) < 0.0008) p = target;

      setVars(p);

      if (p !== target) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => computeTarget();
    const onResize = () => computeTarget();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // init
    setVars(0);
    computeTarget();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
  ref={sectionRef}
  className={styles.stage}
  style={{
    height: `${heightVh + introVh}vh`,
    ["--introVh"]: introVh,
    ["--stickyTop"]: `calc(var(--header-h) + ${topOffset}px)`,
  }}
>
      <div className={styles.sticky}>
        <div ref={frameRef} className={styles.frame}>
          <video
  ref={videoRef}
  className={styles.video}
  src={src}
  poster={poster}
  muted
  playsInline
  loop
  preload="auto"
  autoPlay
/>
          <div className={styles.vignette} />
        </div>

        {caption ? <div className={styles.caption}>{caption}</div> : null}
      </div>
    </section>
  );
}
