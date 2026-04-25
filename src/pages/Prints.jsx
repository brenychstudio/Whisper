// src/pages/Prints.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { site } from "../content/config.js";
import CustomerPrintArOverlay from "../modules/print-ar/components/CustomerPrintArOverlay.jsx";
import { buildWhisperPrintArPayload } from "../integrations/print-ar-preview/buildWhisperPrintArPayload.js";
import { openSitePrintPreview } from "../integrations/print-ar-preview/openSitePrintPreview.js";

const PRICE_MAP = {
  "30×40": 280,
  "50×70": 580,
  "70×100": 790,
};

const SHIPPING = {
  packaging:
    "Packed in protective sleeves with rigid backing; shipped in reinforced flat mailers or tubes.",
  production:
    "Originals: dispatch in 2–5 business days.\nPrints: production 3–7 business days + dispatch.",
  delivery:
    "Spain: 1–3 business days. EU: 3–7 business days. Worldwide: 5–14 business days.",
  returns:
    "Prints: accepted within 14 days in original condition (return shipping paid by buyer).\nOriginals: returns on request — contact within 48 hours of delivery.",
  note:
    "Questions, shipping quotes, framing options, or custom sizes — email the artwork title and your location.",
};

function normalizeSizes(input) {
  // accepts: ["30×40","50×70"] OR [{key,label,price}] OR [{label,price}] OR [{key,price}]
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((s) => {
      if (typeof s === "string") {
        const label = s.replace("x", "×");
        return { key: label.replace("×", "x"), label, price: PRICE_MAP[label] ?? null };
      }
      if (!s || typeof s !== "object") return null;

      const label = (s.label || s.key || "").toString().replace("x", "×");
      const key = (s.key || label.replace("×", "x")).toString();
      const price = Number.isFinite(s.price) ? s.price : PRICE_MAP[label] ?? null;

      if (!label) return null;
      return { key, label, price };
    })
    .filter(Boolean);
}

function priceFromSizes(sizes) {
  const prices = (sizes || []).map((s) => s?.price).filter((n) => Number.isFinite(n));
  if (!prices.length) return 180;
  return Math.min(...prices);
}

function buildPrintsFromSeries() {
  const out = [];
  const paperDefault = "Hahnemühle Photo Rag 308 gsm";
  const sizesDefault = ["30×40", "50×70", "70×100"];
  const editionDefault = "Limited Edition of 30";

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
    // 1) пробуємо витягнути 05a / 06 з alt
    const a = (alt || "").toString().match(/(\d+[a-z]?)/i)?.[1];
    if (a) return normalizeCode(a);

    // 2) пробуємо з імені файла: /sea/05a.jpg -> 05a
    const f = (src || "").match(/\/(\d+[a-z]?)\.(jpe?g|png|webp)$/i)?.[1];
    if (f) return normalizeCode(f);

    return "";
  };

  const pushOne = (seriesKey, seriesTitle, src, alt) => {
    if (!isImageSrc(src)) return;

    const code = codeFrom(src, alt);
    const id = `${seriesKey}-${code || out.length + 1}`;

    out.push({
      id,
      series: seriesKey,
      title: `${seriesTitle} — ${code ? code.toUpperCase() : ""}`.trim(),
      image: src,
      year: 2025,
      edition: editionDefault,
      paper: paperDefault,
      sizes: sizesDefault,
      priceFrom: PRICE_MAP["30×40"] ?? 280,
      buyUrl: "",
    });
  };

  for (const s of site.series || []) {
    for (const it of s.items || []) {
      if (!it) continue;

      // ❌ не додаємо відео в Prints
      if (it.type === "video_stage") continue;

      // diptych: додаємо кожен кадр як окремий print
      if (it.type === "diptych" && Array.isArray(it.items)) {
        for (const sub of it.items) {
          pushOne(s.key, s.title, sub?.src, sub?.alt);
        }
        continue;
      }

      // звичайні зображення
      if (isImageSrc(it.src)) {
        pushOne(s.key, s.title, it.src, it.alt);
      }
    }
  }

  return out;
}

function normalizePrint(p) {
  const sizes = normalizeSizes(p?.sizes);
  const series = p?.series ?? p?.seriesKey ?? "";
  const image = p?.image ?? p?.src ?? "";
  const edition = p?.edition ?? "Limited Edition of 30";
  const year = p?.year ?? 2025;

  return {
    ...p,
    series,
    image,
    sizes,
    edition,
    year,
    priceFrom: Number.isFinite(p?.priceFrom) ? p.priceFrom : priceFromSizes(sizes),
  };
}

export default function Prints() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("all"); // all | sea | forest
  const [selectedSize, setSelectedSize] = useState(null);
  const [shipOpen, setShipOpen] = useState(false);

  // deep-link + sharing
  const deepLinkedRef = useRef(false);
  const deepLinkedInitRef = useRef(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // showroom (desktop): sticky stage + curated list
  const [stageId, setStageId] = useState(null);
  const [flashId, setFlashId] = useState(null);

  // stage crossfade (two layers)
  const STAGE_MS = 820;
  const [stageA, setStageA] = useState("");
  const [stageB, setStageB] = useState("");
  const [stageTop, setStageTop] = useState("a");

  // modal micro-anim
  const [backdropOn, setBackdropOn] = useState(false);
  const [modalOn, setModalOn] = useState(false);
  const raf1 = useRef(null);
  const raf2 = useRef(null);

  // ✅ keep timings consistent (only used by modal)
  const MODAL_MS = 190;
  const PHOTO_MS = 360; // плавніше для фото (окремо від модалки)

  const prints = useMemo(() => {
    const auto = buildPrintsFromSeries().map(normalizePrint);
    const manualRaw = Array.isArray(site.prints) ? site.prints : [];
    const manual = manualRaw.map(normalizePrint);

    const byId = new Map();
    for (const p of manual) byId.set(p.id, p); // manual priority
    for (const p of auto) if (!byId.has(p.id)) byId.set(p.id, p);

    return Array.from(byId.values());
  }, []);

  const printsById = useMemo(() => {
    const m = new Map();
    for (const p of prints) m.set(p.id, p);
    return m;
  }, [prints]);

  const filtered = useMemo(() => {
    if (filter === "all") return prints;
    return prints.filter((p) => p.series === filter);
  }, [prints, filter]);

  const normalizedFiltered = useMemo(() => filtered.map(normalizePrint), [filtered]);

  const stagePrint = useMemo(() => {
    if (!normalizedFiltered.length) return null;
    return normalizedFiltered.find((p) => p.id === stageId) || normalizedFiltered[0];
  }, [normalizedFiltered, stageId]);

  // keep stage selection valid when filter changes
  useEffect(() => {
    if (!normalizedFiltered.length) return;
    if (!stageId || !normalizedFiltered.some((p) => p.id === stageId)) {
      setStageId(normalizedFiltered[0].id);
    }
  }, [filter, normalizedFiltered, stageId]);

  // crossfade stage image when selection changes (no snap)
  useEffect(() => {
    if (!stagePrint?.image) return;
    const next = stagePrint.image;

    // init
    if (!stageA && !stageB) {
      setStageA(next);
      setStageB(next);
      return;
    }

    // avoid redundant swaps
    if (stageTop === "a" && stageA === next) return;
    if (stageTop === "b" && stageB === next) return;

    if (stageTop === "a") {
      setStageB(next);
      requestAnimationFrame(() => setStageTop("b"));
    } else {
      setStageA(next);
      requestAnimationFrame(() => setStageTop("a"));
    }
  }, [stagePrint?.image]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (!active) return;

    // default size = first
    const first = (active.sizes || [])[0]?.key ?? (active.sizes || [])[0]?.label ?? null;
    setSelectedSize(first || null);
    setShipOpen(false);

    // start subtle appear (no “pop”)
    setBackdropOn(false);
    setModalOn(false);
    cancelAnimationFrame(raf1.current);
    cancelAnimationFrame(raf2.current);

    raf1.current = requestAnimationFrame(() => {
      setBackdropOn(true);
      raf2.current = requestAnimationFrame(() => setModalOn(true));
    });

    return () => {
      cancelAnimationFrame(raf1.current);
      cancelAnimationFrame(raf2.current);
    };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // record whether the user landed on /prints with ?print=...
  useEffect(() => {
    if (deepLinkedInitRef.current) return;
    deepLinkedInitRef.current = true;
    deepLinkedRef.current = !!searchParams.get("print");
  }, [searchParams]);

  // deep-link sync: URL -> modal (Back button closes, direct links open)
  useEffect(() => {
    const id = searchParams.get("print");

    if (!id) {
      if (active && modalOn) {
        setModalOn(false);
        window.setTimeout(() => {
          setBackdropOn(false);
          setActive(null);
        }, MODAL_MS);
      }
      return;
    }

    const p = printsById.get(id);
    if (!p) return;

    // optional: align filter with the linked print
    if (p.series === "sea" || p.series === "forest") {
      setFilter(p.series);
    }

    if (!active || active.id !== id) {
      setActive(p);
    }
    // keep showroom stage aligned with deep-link
setStageId(id);

// subtle highlight + bring into view (desktop list OR mobile grid)
setFlashId(id);
window.setTimeout(() => {
  setFlashId((cur) => (cur === id ? null : cur));
}, 1200);

requestAnimationFrame(() => {
  const isDesktop = window.matchMedia?.("(min-width: 980px)")?.matches;
  const el = document.getElementById(isDesktop ? `print-card-d-${id}` : `print-card-m-${id}`);
  el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
});
  }, [searchParams, printsById]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Escape closes modal (minimal, no structural changes)
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function updatePrintParam(nextId, { replace } = {}) {
    const next = new URLSearchParams(searchParams);
    if (nextId) next.set("print", nextId);
    else next.delete("print");
    setSearchParams(next, { replace: !!replace });
  }

  function getShareUrl(id) {
  const base =
    site?.url && String(site.url).trim()
      ? String(site.url).trim().replace(/\/+$/, "")
      : window.location.origin;

  return `${base}/p/${encodeURIComponent(id)}/`;
}

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }

  function openPrint(p) {
    if (!p) return;
    setLinkCopied(false);
    setActive(p);

    // if switching while modal is open, don't stack history
    const replace = !!searchParams.get("print");
    updatePrintParam(p.id, { replace });
  }

  function buildPurchaseMailto(activePrint, sizeObj, price) {
    const email = (site.purchaseEmail || "").trim() || "artproject@concept2048.com";
    const subject = (site.purchaseSubject || "").trim() || "Print purchase request";
    const body = [
      "Hello,",
      "",
      "I'd like to purchase the following print:",
      `Title: ${activePrint?.title || ""}`,
      `ID: ${activePrint?.id || ""}`,
      `Series: ${activePrint?.series || ""}`,
      `Size: ${sizeObj?.label || sizeObj?.key || selectedSize || ""}`,
      `Price: €${price}`,
      "",
      "Shipping country / city:",
      "",
      `Link: ${getShareUrl(activePrint?.id || "")}`,
      "",
      "Thank you.",
    ].join("\n");

    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function openArPreview() {
    if (!activeObj || !activeSizeObj) return;

    try {
      const payload = await buildWhisperPrintArPayload({
        print: activeObj,
        size: activeSizeObj,
        shareUrl: getShareUrl(activeObj.id),
        framePresetId: "black",
        paperToneId: "warm-white",
      });

      const purchaseUrl =
        activeObj.buyUrl ||
        buildPurchaseMailto(activeObj, activeSizeObj, priceForSize);

      await openSitePrintPreview({
        ...payload,
        cta: {
          label: activeObj.buyUrl ? "Purchase" : "Request purchase",
          url: purchaseUrl,
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[Print AR] Failed to open customer preview", error);
      }
    }
  }

  function closeModal() {
    const hasPrintParam = !!searchParams.get("print");

    setModalOn(false);
    // let the modal fade out first
    window.setTimeout(() => {
      setBackdropOn(false);
      setActive(null);
    }, MODAL_MS);

    if (!hasPrintParam) return;

    // If user landed directly on a deep-link, keep them on /prints and just clear the param.
    if (deepLinkedRef.current) {
      updatePrintParam(null, { replace: true });
      return;
    }

    // If modal was opened from within /prints, go back to the previous history entry.
    navigate(-1);
  }

  const FilterBtn = ({ id, label }) => {
    const activeBtn = filter === id;
    return (
      <button
        type="button"
        onClick={() => setFilter(id)}
        aria-pressed={activeBtn}
        style={{
          background: "transparent",
          border: `1px solid ${
            activeBtn ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"
          }`,
          color: activeBtn ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.62)",
          padding: "8px 10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 10,
          cursor: "pointer",
          transition: "border-color 160ms var(--ease), color 160ms var(--ease)",
        }}
      >
        {label}
      </button>
    );
  };

  const activeObj = active ? normalizePrint(active) : null;

  useEffect(() => {
    setLinkCopied(false);
  }, [activeObj?.id]);

  const activeSizeObj = useMemo(() => {
    if (!activeObj) return null;
    const sizes = activeObj.sizes || [];
    return (
      sizes.find((s) => s.key === selectedSize) ||
      sizes.find((s) => s.label === selectedSize) ||
      sizes[0] ||
      null
    );
  }, [activeObj, selectedSize]);

  const priceForSize = activeSizeObj?.price ?? activeObj?.priceFrom ?? 180;

  // editions by size (per your rule)
  const editionForSize =
    (activeSizeObj?.label || "").includes("70×100") || (activeSizeObj?.key || "").includes("70x100")
      ? "Limited Edition of 15"
      : "Limited Edition of 30";

  const detailsText = [
    "Fine art giclée print — museum-quality, 100% cotton, acid-free archival paper with a smooth matte surface.",
    "Printed with archival pigment inks for excellent tonal depth, sharp detail, and long-term color stability.",
    "White border for framing. Hand-signed, numbered, and includes a Certificate of Authenticity.",
  ];

  return (
    <div
      style={{
        width: "min(92vw, 1200px)",
        margin: "0 auto",
        padding: "96px 0 110px",
      }}
    >
      <h1
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Prints
      </h1>

      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 10 }}>
        <FilterBtn id="all" label="All" />
        <FilterBtn id="sea" label="Sea" />
        <FilterBtn id="forest" label="Forest" />
      </div>

      <style>{`
        /* Prints: showroom on desktop, grid on mobile */
        .__prints_showroom { display: none; }
        .__prints_grid { 
          margin-top: 26px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }

        @media (min-width: 980px) {
          .__prints_showroom {
            display: grid;
            grid-template-columns: minmax(520px, 1.25fr) minmax(320px, 0.75fr);
            gap: 22px;
            align-items: start;
            margin-top: 26px;
          }
          .__prints_grid { display: none; }
        }

        .__prints_stage {
          position: sticky;
          top: calc(var(--header-h) + 18px);
        }
        .__prints_stageFrame {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.14);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          overflow: hidden;
        }
        .__prints_stageMat {
          position: relative;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: radial-gradient(120% 90% at 50% 15%, rgba(255,255,255,0.05), rgba(0,0,0,0.48));
          aspect-ratio: 16 / 11;
          overflow: hidden;
        }
        .__prints_stageViewport {
          position: absolute;
          inset: 0;
          padding: 26px;
        }

        .__prints_stageViewport > img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          filter: saturate(1.02) contrast(1.02);
          will-change: opacity, transform;
        }
        .__prints_stageMeta {
          padding: 16px 18px 14px;
          background: linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.28) 18%, rgba(0,0,0,0.34) 100%);
        }

        .__prints_stageTitle {
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          letter-spacing: 0.04em;
          font-size: 18px;
          line-height: 1.25;
          color: rgba(255,255,255,0.92);
        }

        .__prints_stageSub {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.55;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.56);
        }

        .__prints_stageCtaRow {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .__prints_stageCta {
          appearance: none;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.16);
          color: rgba(255,255,255,0.86);
          padding: 10px 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: 10px;
          cursor: pointer;
          transition: border-color 180ms var(--ease), color 180ms var(--ease), background 180ms var(--ease), transform 420ms var(--ease);
        }
        .__prints_stageCta:hover {
          border-color: rgba(255,255,255,0.28);
          color: rgba(255,255,255,0.94);
          background: rgba(255,255,255,0.03);
        }
        .__prints_listFrame {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          overflow: hidden;
        }
        .__prints_listHeader {
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
        }

        .__prints_listHeaderTitle {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.62);
        }

        .__prints_listHeaderMeta {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.40);
        }
        .__prints_listBody {
          padding: 0;
          display: grid;
          gap: 0;
        }
        .__prints_row {
          width: 100%;
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 12px;
          align-items: center;

          padding: 12px 14px;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          text-align: left;
          transition: background 200ms var(--ease), color 200ms var(--ease), box-shadow 260ms var(--ease);
        }
        .__prints_row:hover {
          background: rgba(255,255,255,0.02);
        }
        .__prints_rowActive {
          background: rgba(255,255,255,0.03);
          box-shadow: inset 2px 0 0 rgba(255,255,255,0.26);
        }
                  .__prints_rowFlash {
          background: rgba(155,188,255,0.04);
          box-shadow: inset 2px 0 0 rgba(155,188,255,0.34);
        }
        .__prints_thumb {
          width: 44px;
          height: 32px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.22);
        }
        .__prints_thumb > img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0.86;
          filter: saturate(0.98) contrast(1.02);
          transform: scale(1.01);
          transition: opacity 220ms var(--ease), transform 420ms var(--ease), filter 220ms var(--ease);
        }

        .__prints_row:hover .__prints_thumb > img,
        .__prints_rowActive .__prints_thumb > img {
          opacity: 0.98;
          transform: scale(1.05);
          filter: saturate(1.02) contrast(1.04);
        }
        .__prints_rowTitle {
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          letter-spacing: 0.04em;
          color: rgba(255,255,255,0.90);
          font-size: 13px;
          line-height: 1.22;
        }
        .__prints_rowSub {
          margin-top: 6px;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.38);
        }
        .__prints_rowPrice {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.52);
          white-space: nowrap;
        }
      `}</style>

      {/* Desktop showroom */}
      <div className="__prints_showroom">
        <div className="__prints_stage">
          <div className="__prints_stageFrame">
            <div className="__prints_stageMat">
              <div className="__prints_stageViewport">
                <img
                  src={stageA || stagePrint?.image}
                  alt={stagePrint?.title || "Print"}
                  style={{
                    opacity: stageTop === "a" ? 1 : 0,
                    transform: stageTop === "a" ? "translateY(0px) scale(1)" : "translateY(3px) scale(1.02)",
                    filter: stageTop === "a" ? "blur(0px)" : "blur(2px)",
                    transition: `opacity ${STAGE_MS}ms var(--ease), transform ${STAGE_MS}ms var(--ease), filter ${STAGE_MS}ms var(--ease)`,
                  }}
                />
                <img
                  src={stageB || stagePrint?.image}
                  alt={stagePrint?.title || "Print"}
                  style={{
                    opacity: stageTop === "b" ? 1 : 0,
                    transform: stageTop === "b" ? "translateY(0px) scale(1)" : "translateY(3px) scale(1.02)",
                    filter: stageTop === "b" ? "blur(0px)" : "blur(2px)",
                    transition: `opacity ${STAGE_MS}ms var(--ease), transform ${STAGE_MS}ms var(--ease), filter ${STAGE_MS}ms var(--ease)`,
                  }}
                />
              </div>
            </div>

            <div className="__prints_stageMeta">
              <div className="__prints_stageTitle">{stagePrint?.title}</div>
              <div className="__prints_stageSub">
                {stagePrint?.year ? `Year: ${stagePrint.year}` : ""}{" "}
                {stagePrint?.edition ? ` · ${stagePrint.edition}` : ""}{" "}
                {Number.isFinite(stagePrint?.priceFrom) ? ` · from €${stagePrint.priceFrom}` : ""}
              </div>

              {stagePrint?.paper ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.58)", lineHeight: 1.55 }}>
                  {stagePrint.paper}
                </div>
              ) : null}

              <div className="__prints_stageCtaRow">
                <button
                  type="button"
                  className="__prints_stageCta"
                  onClick={() => stagePrint && openPrint(stagePrint)}
                >
                  View details
                </button>
                <button
                  type="button"
                  className="__prints_stageCta"
                  onClick={() => {
                    if (!stagePrint) return;
                    if (stagePrint.buyUrl) {
                      window.open(stagePrint.buyUrl, "_blank", "noopener,noreferrer");
                      return;
                    }
                    openPrint(stagePrint);
                  }}
                >
                  Purchase
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="__prints_listFrame">
          <div className="__prints_listHeader">
            <div className="__prints_listHeaderTitle">Collector selection</div>
            <div className="__prints_listHeaderMeta">{normalizedFiltered.length} prints · hover to preview</div>
          </div>

          <div className="__prints_listBody">
            {normalizedFiltered.map((p) => {
              const isActive = stagePrint?.id === p.id;
              return (
                <button
  key={p.id}
  id={`print-card-d-${p.id}`}
  type="button"
  className={`__prints_row ${isActive ? "__prints_rowActive" : ""} ${flashId === p.id ? "__prints_rowFlash" : ""}`}
                  onMouseEnter={() => setStageId(p.id)}
                  onFocus={() => setStageId(p.id)}
                  onClick={() => openPrint(p)}
                >
                  <span className="__prints_thumb" aria-hidden="true">
                    <img src={p.image} alt="" />
                  </span>

                  <span>
                    <div className="__prints_rowTitle">{p.title}</div>
                    <div className="__prints_rowSub">{p.series}</div>
                  </span>

                  <span className="__prints_rowPrice">from €{p.priceFrom}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile grid (keeps current behavior) */}
      <div className="__prints_grid">
        {normalizedFiltered.map((p) => {
          return (
            <button
  key={p.id}
  id={`print-card-m-${p.id}`}
  type="button"
  onClick={() => openPrint(p)}
  style={{
    background: "transparent",
    border: flashId === p.id ? "1px solid rgba(155,188,255,0.32)" : "1px solid rgba(255,255,255,0.10)",
    boxShadow: flashId === p.id ? "0 0 0 2px rgba(155,188,255,0.10)" : "none",
    transition: "border-color 260ms var(--ease), box-shadow 260ms var(--ease)",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              <img src={p.image} alt={p.title} style={{ width: "100%", display: "block" }} />
              <div style={{ padding: 14 }}>
                <div
                  style={{
                    fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                    letterSpacing: "0.04em",
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "rgba(255,255,255,0.62)",
                    fontSize: 12,
                    letterSpacing: "0.10em",
                  }}
                >
                  {p.edition} · From €{p.priceFrom}
                </div>
              </div>
            </button>
          );
        })}
      </div>


      {activeObj ? (
        <div
          onMouseDown={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: `rgba(0,0,0,${backdropOn ? 0.55 : 0})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: 18,
            paddingTop: "calc(var(--header-h) + 110px)",
            paddingBottom: 24,
            zIndex: 200,
            transition: `background ${MODAL_MS}ms var(--ease)`,
            backdropFilter: "blur(1px)",
            WebkitBackdropFilter: "blur(1px)",
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="__prints_modal_fix"
            style={{
              width: "min(96vw, 1120px)",
              background: "rgba(10,10,14,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.9fr) minmax(340px, 0.95fr)",
              gap: 0,
              padding: 0,
              maxHeight: "78vh",
              overflow: "hidden",
              borderRadius: 10,
              boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
              opacity: modalOn ? 1 : 0,
              transform: modalOn ? "translateY(0) scale(1)" : "translateY(10px) scale(0.985)",
              filter: modalOn ? "blur(0px)" : "blur(0.8px)",
              willChange: "transform, opacity, filter",
              transition: `opacity ${MODAL_MS}ms var(--ease), transform ${MODAL_MS}ms var(--ease), filter ${MODAL_MS}ms var(--ease)`,
            }}
          >
            <div
  className="__prints_media"
  style={{
    position: "relative",
    overflow: "hidden",
    borderRight: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.35)",
    minHeight: 0,
  }}
>
  {/* LAYER A — CONTAIN (default) */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      padding: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: shipOpen ? 0 : 1,
      transform: shipOpen ? "scale(0.995)" : "scale(1)",
      transition: `opacity ${MODAL_MS}ms var(--ease), transform ${MODAL_MS}ms var(--ease)`,
      willChange: "opacity, transform",
    }}
  >
    <img
      src={activeObj.image}
      alt={activeObj.title}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    />
  </div>

  {/* LAYER B — COVER (when Shipping opens) */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch",
      opacity: shipOpen ? 1 : 0,
      transform: shipOpen ? "scale(1.02)" : "scale(1.005)",
      transition: `opacity ${MODAL_MS}ms var(--ease), transform ${MODAL_MS}ms var(--ease)`,
      willChange: "opacity, transform",
      pointerEvents: "none",
    }}
  >
    <img
      src={activeObj.image}
      alt=""
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  </div>
</div>

            <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div
                style={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflow: "auto",
                  padding: 18,
                  paddingRight: 16,
                }}
              >
                <div style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif", fontSize: 18 }}>
                  {activeObj.title}
                </div>

                <div style={{ marginTop: 10, color: "rgba(255,255,255,0.70)", lineHeight: 1.8, fontSize: 13 }}>
                  <div>Year: {activeObj.year ?? 2025}</div>
                  <div>{editionForSize}</div>
                  <div>{activeObj.paper}</div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    Size
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "inline-flex",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 2,
                      gap: 2,
                      borderRadius: 8,
                    }}
                  >
                    {(activeObj.sizes || []).map((s) => {
                      const isOn =
                        s.key === selectedSize ||
                        s.label === selectedSize ||
                        (!selectedSize && s === activeSizeObj);
                      return (
                        <button
                          key={s.key || s.label}
                          type="button"
                          onClick={() => setSelectedSize(s.key || s.label)}
                          style={{
                            background: isOn ? "rgba(255,255,255,0.10)" : "transparent",
                            border: "0",
                            padding: "7px 10px",
                            color: isOn ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.62)",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            borderRadius: 7,
                            transition: "background 140ms var(--ease), color 140ms var(--ease)",
                          }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 10, color: "rgba(255,255,255,0.80)", fontSize: 13 }}>
                    Price: €{priceForSize}
                  </div>
                </div>

                <div style={{ marginTop: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontSize: 12 }}>
                  {detailsText.map((t, i) => (
                    <div key={i} style={{ marginTop: i ? 8 : 0 }}>
                      {t}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShipOpen((v) => !v)}
                    aria-expanded={shipOpen}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "transparent",
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.78)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontSize: 10,
                    }}
                  >
                    <span>Shipping &amp; Returns</span>
                    <span style={{ opacity: 0.7, letterSpacing: 0 }}>{shipOpen ? "–" : "+"}</span>
                  </button>

                  <div
                    style={{
                      maxHeight: shipOpen ? 420 : 0,
                      opacity: shipOpen ? 1 : 0,
                      overflow: "hidden",
                      transition: `max-height ${MODAL_MS}ms var(--ease), opacity ${MODAL_MS}ms var(--ease)`,
                      marginTop: shipOpen ? 10 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "140px 1fr",
                        columnGap: 14,
                        rowGap: 12,
                        fontSize: 12,
                        lineHeight: 1.65,
                        color: "rgba(255,255,255,0.68)",
                      }}
                    >
                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)" }}>
                        Packaging
                      </div>
                      <div>{SHIPPING.packaging}</div>

                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)" }}>
                        Production &amp; Dispatch
                      </div>
                      <div style={{ whiteSpace: "pre-line" }}>{SHIPPING.production}</div>

                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)" }}>
                        Delivery Times
                      </div>
                      <div>{SHIPPING.delivery}</div>

                      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)" }}>
                        Returns
                      </div>
                      <div style={{ whiteSpace: "pre-line" }}>{SHIPPING.returns}</div>
                    </div>

                    <div style={{ marginTop: 12, color: "rgba(255,255,255,0.52)", fontSize: 12, lineHeight: 1.6 }}>
                      {SHIPPING.note}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: "0 0 auto",
                  padding: 16,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  background: "linear-gradient(to bottom, rgba(10,10,14,0.40), rgba(10,10,14,0.70))",
                  display: "flex",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(getShareUrl(activeObj.id));
                    if (!ok) return;
                    setLinkCopied(true);
                    window.setTimeout(() => setLinkCopied(false), 1200);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    padding: "10px 12px",
                    color: linkCopied ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.70)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontSize: 11,
                    cursor: "pointer",
                    borderRadius: 8,
                    transition: "border-color 180ms var(--ease), color 180ms var(--ease), background 180ms var(--ease)",
                  }}
                >
                  {linkCopied ? "Copied" : "Copy link"}
                </button>

                <button
                  type="button"
                  onClick={openArPreview}
                  disabled={!activeObj || !activeSizeObj}
                  aria-disabled={!activeObj || !activeSizeObj}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    padding: "10px 12px",
                    color: !activeObj || !activeSizeObj ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.70)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontSize: 11,
                    cursor: !activeObj || !activeSizeObj ? "not-allowed" : "pointer",
                    borderRadius: 8,
                  }}
                >
                  Open 3D preview
                </button>

                {activeObj.buyUrl ? (
                  <a
                    href={activeObj.buyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "10px 12px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.92)",
                      textDecoration: "none",
                      borderRadius: 8,
                    }}
                  >
                    Purchase
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const email = (site.purchaseEmail || "").trim() || "artproject@concept2048.com";
                      const subject = (site.purchaseSubject || "").trim() || "Print purchase request";
                      const body = [
                        "Hello,",
                        "",
                        "I'd like to purchase the following print:",
                        `Title: ${activeObj.title}`,
                        `ID: ${activeObj.id}`,
                        `Series: ${activeObj.series}`,
                        `Size: ${activeSizeObj?.label || selectedSize || ""}`,
                        `Price: €${priceForSize}`,
                        "",
                        "Shipping country / city:",
                        "",
                        `Link: ${getShareUrl(activeObj.id)}`,
                        "",
                        "Thank you.",
                      ].join("\n");

                      const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                        subject
                      )}&body=${encodeURIComponent(body)}`;

                      window.location.href = buildPurchaseMailto(activeObj, activeSizeObj, priceForSize);
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "10px 12px",
                      color: "rgba(255,255,255,0.92)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontSize: 11,
                      cursor: "pointer",
                      borderRadius: 8,
                    }}
                  >
                    Request purchase
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.70)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontSize: 11,
                    cursor: "pointer",
                    borderRadius: 8,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <style>{`
            /* responsive modal */
            @media (max-width: 900px){
              .__prints_modal_fix{
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      ) : null}

      <CustomerPrintArOverlay />
    </div>
  );
}
