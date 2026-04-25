import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./EditorialScroll.module.css";
import ScrollVideoStage from "../ScrollVideoStage/ScrollVideoStage.jsx";

function Img({ src, srcSmall, alt, onLoad }) {
  const srcSet = srcSmall ? `${srcSmall} 1100w, ${src} 2800w` : undefined;
  const sizes = "(max-width: 900px) 92vw, 1200px";

  return (
    <img
      className={styles.img}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
    />
  );
}

function TextBlock({ eyebrow, headline, body, align = "center" }) {
  const has = Boolean(
    (eyebrow && String(eyebrow).trim()) ||
      (headline && String(headline).trim()) ||
      (body && String(body).trim())
  );
  if (!has) return null;

  const alignClass =
    align === "left"
      ? styles.textLeft
      : align === "right"
      ? styles.textRight
      : styles.textCenter;

  return (
    <div className={`${styles.textBlock} ${alignClass}`}>
      <div className={styles.textInner}>
        {eyebrow ? <div className={styles.textEyebrow}>{eyebrow}</div> : null}
        {headline ? <div className={styles.textHeadline}>{headline}</div> : null}
        {body ? <div className={styles.textBody}>{body}</div> : null}
      </div>
    </div>
  );
}

// --------- Variant C helpers (must match Prints id generation) ---------
const isImageSrc = (src) => typeof src === "string" && /\.(jpe?g|png|webp)$/i.test(src);

const normalizeCode = (raw) => {
  const s = (raw || "").toString().trim();
  if (!s) return "";
  const m = s.match(/^(\d+)([a-z])?$/i);
  if (!m) return s.toLowerCase();
  const num = m[1].padStart(2, "0");
  const suf = (m[2] || "").toLowerCase();
  return `${num}${suf}`;
};

const codeFrom = (src, alt) => {
  // 1) alt: "Sea 05a" -> 05a
  const a = (alt || "").toString().match(/(\d+[a-z]?)/i)?.[1];
  if (a) return normalizeCode(a);

  // 2) filename: /sea/05a.jpg -> 05a
  const f = (src || "").match(/\/(\d+[a-z]?)\.(jpe?g|png|webp)$/i)?.[1];
  if (f) return normalizeCode(f);

  return "";
};

const printIdFrom = (seriesKey, src, alt) => {
  if (!seriesKey || !isImageSrc(src)) return "";
  const code = codeFrom(src, alt);
  if (!code) return "";
  return `${seriesKey}-${code}`;
};

const labelFromAlt = (alt) => {
  const s = (alt || "").toString().trim();
  if (!s) return "";
  return s.toUpperCase();
};

function FrameFooter({ label, printId, cta }) {
  const enabled = Boolean(cta?.enabled);
  if (!enabled || !printId) return null;

  const showLabel = Boolean(cta?.showLabel);

  const labelText = (cta?.label || "Edition print").toString().trim() || "Edition print";
  const showPrice = cta?.showPrice !== false;
  const fromPrice = Number.isFinite(cta?.fromPrice) ? cta.fromPrice : 280;
  const meta = (cta?.meta || "· COA").toString().trim();

  const to = `/prints?print=${encodeURIComponent(printId)}`;

  return (
    <div className={styles.frameFooter} data-cta="1">
      {showLabel && label ? (
        <div className={styles.frameLabel}>{label}</div>
      ) : null}

      <Link
        className={styles.printCta}
        to={to}
        aria-label={`Open print details: ${printId}`}
      >
        <span className={styles.printCtaLabel}>{labelText}</span>
        {showPrice ? (
          <span className={styles.printCtaMeta}>{`· from €${fromPrice}`}</span>
        ) : null}
        {meta ? <span className={styles.printCtaMeta}>{meta}</span> : null}
        <span className={styles.printCtaArrow} aria-hidden>
          →
        </span>
      </Link>
    </div>
  );
}

export default function EditorialScroll({ title, items, seriesKey, cta }) {
  const streamRef = useRef(null);
  const checkRef = useRef(() => {});
  const rafCheck = useRef(0);

  const blocks = useMemo(() => {
    const out = [];
    let seq = 0;

    const nextDelay = () => {
      const d = Math.min(seq * 120, 900);
      seq += 1;
      return `${d}ms`;
    };

    const ping = () => checkRef.current?.();

    items.forEach((it, idx) => {
      if (!it) return;

      if (it.type === "text") {
        const d = nextDelay();
        out.push(
          <div
            key={`text-${idx}`}
            className={`${styles.reveal}`}
            data-reveal="1"
            style={{ "--d": d }}
          >
            <TextBlock
              eyebrow={it.eyebrow}
              headline={it.headline}
              body={it.body}
              align={it.align}
            />
          </div>
        );
        return;
      }

      if (it.type === "diptych") {
        const d1 = nextDelay();
        const d2 = nextDelay();

        const a = it.items?.[0];
        const b = it.items?.[1];

        const aPrintId = printIdFrom(seriesKey, a?.src, a?.alt);
        const bPrintId = printIdFrom(seriesKey, b?.src, b?.alt);

        out.push(
          <div key={`dip-${idx}`} className={styles.diptych}>
            <div
              className={`${styles.dipItem} ${styles.reveal}`}
              data-reveal="1"
              style={{ "--d": d1 }}
            >
              <Img {...a} onLoad={ping} />
              <FrameFooter
                label={labelFromAlt(a?.alt)}
                printId={aPrintId}
                cta={cta}
              />
            </div>

            <div
              className={`${styles.dipItem} ${styles.reveal}`}
              data-reveal="1"
              style={{ "--d": d2 }}
            >
              <Img {...b} onLoad={ping} />
              <FrameFooter
                label={labelFromAlt(b?.alt)}
                printId={bPrintId}
                cta={cta}
              />
            </div>
          </div>
        );
        return;
      }

      if (it.type === "window") {
        const d = nextDelay();
        const pid = printIdFrom(seriesKey, it.src, it.alt);
        out.push(
          <div key={`win-${idx}`} className={styles.window}>
            <div
              className={`${styles.windowInner} ${styles.reveal}`}
              data-reveal="1"
              style={{ "--d": d }}
            >
              <Img src={it.src} srcSmall={it.srcSmall} alt={it.alt} onLoad={ping} />
              <FrameFooter
                label={labelFromAlt(it.alt)}
                printId={pid}
                cta={cta}
              />
            </div>
          </div>
        );
        return;
      }

      if (it.type === "video_stage") {
        out.push(
          <ScrollVideoStage
            key={`vstage-${idx}`}
            src={it.src}
            poster={it.poster}
            caption={it.caption}
            heightVh={it.heightVh ?? 220}
            topOffset={it.topOffset ?? 24}
          />
        );
        return;
      }

      // full (default)
      const d = nextDelay();
      const pid = printIdFrom(seriesKey, it.src, it.alt);
      out.push(
        <div
          key={`full-${idx}`}
          className={`${styles.full} ${styles.reveal}`}
          data-reveal="1"
          style={{ "--d": d }}
        >
          <Img src={it.src} srcSmall={it.srcSmall} alt={it.alt} onLoad={ping} />
          <FrameFooter label={labelFromAlt(it.alt)} printId={pid} cta={cta} />
        </div>
      );
    });

    return out;
  }, [items, seriesKey, cta]);

  useEffect(() => {
    const root = streamRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll('[data-reveal="1"]'));
    if (!nodes.length) return;

    nodes.forEach((el) => el.classList.remove(styles.revealIn));

    const vh = () =>
      window.innerHeight || document.documentElement.clientHeight || 0;

    const check = () => {
      const cut = vh() * 0.80;
      for (const el of nodes) {
        if (el.classList.contains(styles.revealIn)) continue;

        const r = el.getBoundingClientRect();
        if (r.height === 0) continue; // дочекаємось layout (img onLoad теж пінгує)

        if (r.top < cut && r.bottom > 0) {
          el.classList.add(styles.revealIn);
        }
      }
    };

    checkRef.current = () => {
      if (rafCheck.current) cancelAnimationFrame(rafCheck.current);
      rafCheck.current = requestAnimationFrame(check);
    };

    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add(styles.revealIn);
            io.unobserve(e.target);
          }
        },
        {
          root: null,
          rootMargin: "0px 0px -12% 0px",
          threshold: 0.12,
        }
      );
    }

    const start = () => {
      if (io) nodes.forEach((n) => io.observe(n));
      checkRef.current();
    };

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(start);
    });

    const t1 = window.setTimeout(start, 180);
    const t2 = window.setTimeout(start, 420);

    const onScroll = () => checkRef.current();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);

      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (rafCheck.current) cancelAnimationFrame(rafCheck.current);

      clearTimeout(t1);
      clearTimeout(t2);

      if (io) io.disconnect();
    };
  }, [items]);

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div className={`${styles.h1} ${styles.titleReveal}`}>{title}</div>
      </div>

      <div ref={streamRef} className={styles.stream}>
        {blocks}
      </div>
    </div>
  );
}
