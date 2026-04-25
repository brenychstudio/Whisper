import { useEffect, useRef, useState } from "react";
import styles from "./NotesDrawer.module.css";

// має бути >= найдовшого transition у CSS (drawer/filter).
// Беремо з CSS token (--t-drawer-exit), щоб JS і CSS не роз"їжджалися.
const EXIT_FALLBACK_MS = 900;

function readVarMs(name, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function getDrawerExitMs() {
  const explicit = readVarMs("--t-drawer-exit", NaN);
  if (Number.isFinite(explicit)) return explicit;
  const base = readVarMs("--t-drawer-filter", 860);
  return Math.ceil(base + 40);
}

export default function NotesDrawer({ open, onClose, payload, fallbackTitle }) {
  const [present, setPresent] = useState(open); // чи рендеримо модалку в DOM
  const [active, setActive] = useState(false);  // чи застосовуємо *In класи (анімація)

  const tRef = useRef(null);
  const rafRef = useRef(null);

  // enter/exit state machine
  useEffect(() => {
    window.clearTimeout(tRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (open) {
      setPresent(true);

      // важливо: спочатку змонтувати в "hidden" стані
      setActive(false);

      // а в наступний кадр увімкнути "In" (щоб transition завжди запускався)
      rafRef.current = requestAnimationFrame(() => setActive(true));
      return;
    }

    // close: спочатку вимикаємо "In", потім прибираємо з DOM після transition
    if (present) {
      setActive(false);
      tRef.current = window.setTimeout(() => setPresent(false), getDrawerExitMs());
    }
  }, [open, present]);

  // ESC + scroll lock поки drawer присутній (включно з exit-анімацією)
  useEffect(() => {
    if (!present) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
const prevOverflow = html.style.overflow;
html.style.overflow = "hidden";

return () => {
  window.removeEventListener("keydown", onKey);
  html.style.overflow = prevOverflow || "";
};

  }, [present, onClose]);

  // cleanup timers
  useEffect(() => {
    return () => {
      window.clearTimeout(tRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!present) return null;

  return (
    <div
      className={`${styles.backdrop} ${active ? styles.backdropIn : ""}`}
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <aside
        className={`${styles.drawer} ${active ? styles.drawerIn : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.title}>{payload ? "Notes" : fallbackTitle}</div>
          <button className={styles.close} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {payload ? (
          <div className={styles.body}>
            <section className={styles.section}>
              <div className={styles.label}>Statement</div>
              <div className={styles.text}>{payload.statement}</div>
            </section>

            <section className={styles.section}>
              <div className={styles.label}>Context</div>
              <div className={styles.text}>{payload.context}</div>
            </section>

            <section className={styles.section}>
              <div className={styles.label}>Sound design</div>
              <div className={styles.text}>{payload.sound}</div>
            </section>

            <section className={styles.section}>
              <div className={styles.label}>Credits</div>
              <ul className={styles.list}>
                {payload.credits?.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </section>

            {payload.links?.length ? (
              <section className={styles.section}>
                <div className={styles.label}>Links</div>
                <ul className={styles.list}>
                  {payload.links.map((l, i) => (
                    <li key={i}>
                      <a className={styles.link} href={l.href} target="_blank" rel="noreferrer">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.text}>Open a series page to view its notes.</div>
          </div>
        )}
      </aside>
    </div>
  );
}
