// src/pages/SharePage.jsx
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { site } from "../content/config.js";

function shareBase() {
  const u = (site?.url || "").toString().trim();
  if (u) return u.replace(/\/+$/, "");
  return window.location.origin;
}

function findPreviewImage(printId) {
  // lightweight resolver: scan site.series for matching id => src
  // id format: "sea-05a" / "forest-03"
  const m = String(printId || "").match(/^([a-z]+)-(\d+[a-z]?)$/i);
  if (!m) return null;

  const seriesKey = m[1].toLowerCase();
  const code = m[2].toLowerCase();

  const normalizeCode = (raw) => {
    const s = (raw || "").toString().trim();
    if (!s) return "";
    const mm = s.match(/^(\d+)([a-z])?$/i);
    if (!mm) return s.toLowerCase();
    const num = mm[1].padStart(2, "0");
    const suf = (mm[2] || "").toLowerCase();
    return `${num}${suf}`;
  };

  const codeFrom = (src, alt) => {
    const a = (alt || "").toString().match(/(\d+[a-z]?)/i)?.[1];
    if (a) return normalizeCode(a);
    const f = (src || "").match(/\/(\d+[a-z]?)\.(jpe?g|png|webp)$/i)?.[1];
    if (f) return normalizeCode(f);
    return "";
  };

  const isImageSrc = (src) => typeof src === "string" && /\.(jpe?g|png|webp)$/i.test(src);

  const s = (site.series || []).find((x) => x.key === seriesKey);
  if (!s) return null;

  for (const it of s.items || []) {
    if (!it) continue;
    if (it.type === "video_stage" || it.type === "text") continue;

    if (it.type === "diptych" && Array.isArray(it.items)) {
      for (const sub of it.items) {
        if (!sub?.src || !isImageSrc(sub.src)) continue;
        if (codeFrom(sub.src, sub.alt) === code) return sub.src;
      }
      continue;
    }

    if (it.src && isImageSrc(it.src)) {
      if (codeFrom(it.src, it.alt) === code) return it.src;
    }
  }

  return null;
}

export default function SharePage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const safeId = useMemo(() => String(id || "").trim(), [id]);
  const redirectTo = useMemo(
    () => `/prints?print=${encodeURIComponent(safeId)}`,
    [safeId]
  );

  const shareUrl = useMemo(() => {
    const base = shareBase();
    return `${base}/p/${encodeURIComponent(safeId)}/`;
  }, [safeId]);

  const preview = useMemo(() => findPreviewImage(safeId), [safeId]);

  useEffect(() => {
    if (!safeId) return;
    const t = window.setTimeout(() => {
      navigate(redirectTo, { replace: true });
    }, 700);
    return () => window.clearTimeout(t);
  }, [safeId, redirectTo, navigate]);

  return (
    <div style={{ width: "min(92vw, 980px)", margin: "0 auto", padding: "24px var(--pad) 90px" }}>
      <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.9 }}>
        Redirecting to Prints…
      </div>

      <div style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.8 }}>
        ID: <span style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}>{safeId}</span>
      </div>

      {preview ? (
        <div style={{ marginTop: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)" }}>
          <img
            src={preview}
            alt={safeId}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => navigate(redirectTo, { replace: true })}
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            background: "transparent",
            color: "rgba(255,255,255,0.86)",
            padding: "12px 14px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Open print
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard?.writeText(shareUrl);
            } catch {}
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "transparent",
            color: "rgba(255,255,255,0.62)",
            padding: "12px 14px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Copy link
        </button>

        <Link
          to="/prints"
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.62)",
            padding: "12px 14px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: 11,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Go to prints
        </Link>
      </div>
    </div>
  );
}