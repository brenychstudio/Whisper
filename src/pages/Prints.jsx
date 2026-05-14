// src/pages/Prints.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function printPreviewSrc(src, kind = "stage") {
  if (typeof src !== "string") return src;

  const match = src.match(/^\/(sea|forest)\/([^/]+)\.(webp|jpe?g|png)$/i);
  if (!match) return src;

  return `/prints-preview/${kind}/${match[1]}/${match[2]}.webp`;
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

    // 2) пробуємо з імені файла: /sea/05a.webp -> 05a
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
    stageImage: p?.stageImage ?? printPreviewSrc(image, "stage"),
    thumbImage: p?.thumbImage ?? printPreviewSrc(image, "thumb"),
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
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 });
  const [photoDragging, setPhotoDragging] = useState(false);

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
  const [isDesktopPrints, setIsDesktopPrints] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(min-width: 980px)").matches;
  });

  // modal micro-anim
  const [backdropOn, setBackdropOn] = useState(false);
  const [modalOn, setModalOn] = useState(false);
  const raf1 = useRef(null);
  const raf2 = useRef(null);
  const modalBodyRef = useRef(null);
  const stageWheelRef = useRef({ delta: 0, lastAt: 0 });
  const modalWheelRef = useRef({ delta: 0, lastAt: 0 });
  const modalMountedRef = useRef(false);
  const photoPanImageRef = useRef(null);
  const photoPanRef = useRef({ x: 0, y: 0 });
  const photoPanRafRef = useRef(null);
  const photoDragRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    width: 1,
    height: 1,
  });

  // ✅ keep timings consistent (only used by modal)
  const MODAL_MS = 620;
  const BACKDROP_MS = 760;
  const PHOTO_MS = 760; // cinematic inspect reveal for the artwork plane

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mq = window.matchMedia("(min-width: 980px)");
    const sync = () => setIsDesktopPrints(mq.matches);
    sync();

    if (mq.addEventListener) {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }

    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  useEffect(() => () => cancelAnimationFrame(photoPanRafRef.current), []);

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

  const stagePrintIndex = stagePrint?.id
    ? Math.max(0, normalizedFiltered.findIndex((p) => p.id === stagePrint.id))
    : 0;
  const activePrintIndex = active?.id
    ? normalizedFiltered.findIndex((p) => p.id === active.id)
    : -1;

  function updatePrintParam(nextId, { replace } = {}) {
    const next = new URLSearchParams(searchParams);
    if (nextId) next.set("print", nextId);
    else next.delete("print");
    setSearchParams(next, { replace: !!replace });
  }

  function wrapIndex(index, length) {
    if (!length) return 0;
    return (index + length) % length;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getPhotoPanVisual(pan, dragging = photoDragging) {
    const scale = dragging ? 1.085 : 1.06;
    const x = Number.isFinite(pan?.x) ? pan.x : 0;
    const y = Number.isFinite(pan?.y) ? pan.y : 0;

    return {
      objectPosition: `${50 + x}% ${50 + y}%`,
      transform: `translate3d(${-x * 0.1}%, ${-y * 0.1}%, 0) scale(${scale})`,
      transformOrigin: `${50 + x}% ${50 + y}%`,
    };
  }

  function pulsePrintRow(id) {
    if (!id) return;
    setFlashId(id);
    window.setTimeout(() => {
      setFlashId((cur) => (cur === id ? null : cur));
    }, 760);

    requestAnimationFrame(() => {
      const isDesktop = window.matchMedia?.("(min-width: 980px)")?.matches;
      const el = document.getElementById(isDesktop ? `print-card-d-${id}` : `print-card-m-${id}`);
      el?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    });
  }

  function selectStageByDirection(direction) {
    if (!normalizedFiltered.length) return;
    const currentIndex = stagePrintIndex >= 0 ? stagePrintIndex : 0;
    const next = normalizedFiltered[wrapIndex(currentIndex + direction, normalizedFiltered.length)];
    if (!next) return;
    setStageId(next.id);
    pulsePrintRow(next.id);
  }

  function selectActiveByDirection(direction) {
    if (!active || !normalizedFiltered.length) return;
    const currentIndex = activePrintIndex >= 0 ? activePrintIndex : stagePrintIndex;
    const next = normalizedFiltered[wrapIndex(currentIndex + direction, normalizedFiltered.length)];
    if (!next || next.id === active.id) return;

    setLinkCopied(false);
    resetPhotoPan();
    setStageId(next.id);
    setActive(next);
    updatePrintParam(next.id, { replace: true });
    pulsePrintRow(next.id);
  }

  function handleSequenceWheel(event, wheelRef, onStep) {
    const deltaScale = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? 280 : 1;
    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY * deltaScale
        : event.deltaX * deltaScale;

    if (Math.abs(dominantDelta) < 2) return;

    event.preventDefault();
    event.stopPropagation();

    const state = wheelRef.current;
    const now = performance.now();

    if (now - state.lastAt < 520) {
      state.delta += dominantDelta * 0.24;
      return;
    }

    state.delta += dominantDelta;
    const threshold = 72;
    if (Math.abs(state.delta) < threshold) return;

    const direction = state.delta > 0 ? 1 : -1;
    state.delta = 0;
    state.lastAt = now;
    onStep(direction);
  }

  function writePhotoPan(pan, dragging = photoDragging) {
    const img = photoPanImageRef.current;
    if (!img) return;
    const visual = getPhotoPanVisual(pan, dragging);

    img.style.objectPosition = visual.objectPosition;
    img.style.transform = visual.transform;
    img.style.transformOrigin = visual.transformOrigin;
  }

  function queuePhotoPan(pan, dragging = photoDragging) {
    cancelAnimationFrame(photoPanRafRef.current);
    photoPanRafRef.current = requestAnimationFrame(() => writePhotoPan(pan, dragging));
  }

  function handlePhotoPanStart(event) {
    if (!shipOpen || event.button > 0) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    photoDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: photoPanRef.current.x,
      startPanY: photoPanRef.current.y,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPhotoDragging(true);
    writePhotoPan(photoPanRef.current, true);
  }

  function handlePhotoPanMove(event) {
    const drag = photoDragRef.current;
    if (!photoDragging || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const nextX = drag.startPanX - ((event.clientX - drag.startX) / drag.width) * 72;
    const nextY = drag.startPanY - ((event.clientY - drag.startY) / drag.height) * 72;
    const nextPan = {
      x: clamp(nextX, -28, 28),
      y: clamp(nextY, -22, 22),
    };

    photoPanRef.current = nextPan;
    queuePhotoPan(nextPan, true);
  }

  function handlePhotoPanEnd(event) {
    const drag = photoDragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    photoDragRef.current.pointerId = null;
    queuePhotoPan(photoPanRef.current, false);
    setPhotoPan(photoPanRef.current);
    setPhotoDragging(false);
  }

  function resetPhotoPan(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const centered = { x: 0, y: 0 };
    photoPanRef.current = centered;
    queuePhotoPan(centered, false);
    setPhotoPan(centered);
  }

  function toggleShipPanel() {
    const nextOpen = !shipOpen;
    setShipOpen(nextOpen);
    if (!nextOpen) resetPhotoPan();
  }

  // modal close helpers
  function closeModal() {
    const hasPrintParam = !!searchParams.get("print");

    setModalOn(false);
    setBackdropOn(false);
    // let the inspect/reveal system close before unmounting
    window.setTimeout(() => {
      setActive(null);
    }, BACKDROP_MS);

    if (!hasPrintParam) return;

    // If user landed directly on a deep-link, keep them on /prints and just clear the param.
    if (deepLinkedRef.current) {
      updatePrintParam(null, { replace: true });
      return;
    }

    // If modal was opened from within /prints, go back to the previous history entry.
    navigate(-1);
  }

  useEffect(() => {
    if (!normalizedFiltered.length) return;
    if (!stageId || !normalizedFiltered.some((p) => p.id === stageId)) {
      setStageId(normalizedFiltered[0].id);
    }
  }, [filter, normalizedFiltered, stageId]);

  // crossfade stage image when selection changes (no snap)
  useEffect(() => {
    if (!stagePrint?.image) return;
    const next = stagePrint.stageImage || stagePrint.image;

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
  }, [stagePrint?.stageImage, stagePrint?.image]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (!active) return;
    const isSequenceStep = modalMountedRef.current;
    modalMountedRef.current = true;

    // default size = first
    const first = (active.sizes || [])[0]?.key ?? (active.sizes || [])[0]?.label ?? null;
    setSelectedSize(first || null);
    setShipOpen(false);
    photoPanRef.current = { x: 0, y: 0 };
    setPhotoPan({ x: 0, y: 0 });
    photoDragRef.current.pointerId = null;

    // start cinematic inspect reveal
    if (!isSequenceStep) setBackdropOn(false);
    setModalOn(false);
    cancelAnimationFrame(raf1.current);
    cancelAnimationFrame(raf2.current);

    raf1.current = requestAnimationFrame(() => {
      setBackdropOn(true);
      raf2.current = requestAnimationFrame(() => {
        window.setTimeout(() => setModalOn(true), isSequenceStep ? 95 : 70);
      });
    });

    return () => {
      cancelAnimationFrame(raf1.current);
      cancelAnimationFrame(raf2.current);
    };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active) return;
    modalMountedRef.current = false;
    modalWheelRef.current.delta = 0;
  }, [active]);

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
        setBackdropOn(false);
        window.setTimeout(() => {
          setActive(null);
        }, BACKDROP_MS);
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
    resetPhotoPan();
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
    if (!activeObj) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const prevHtmlOverflow = html.style.overflow;

    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [Boolean(activeObj)]);

  useEffect(() => {
    if (!activeObj) return;
    modalBodyRef.current?.scrollTo?.({ top: 0, left: 0 });
  }, [activeObj?.id]);

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
  const photoPanVisual = getPhotoPanVisual(photoPan, photoDragging);

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
          background: rgba(0,0,0,0.36);
          border-radius: 16px;
          overflow: hidden;
        }
        .__prints_stageMat {
          position: relative;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: radial-gradient(120% 90% at 50% 15%, rgba(255,255,255,0.05), rgba(0,0,0,0.48));
          aspect-ratio: 16 / 11;
          overflow: hidden;
          overscroll-behavior: contain;
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
          will-change: opacity;
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
          background: rgba(0,0,0,0.36);
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
          transition: background 160ms var(--ease), color 160ms var(--ease);
        }
        .__prints_row:hover {
          background: rgba(255,255,255,0.02);
        }
        .__prints_rowActive {
          background: rgba(255,255,255,0.03);
          outline: 1px solid rgba(255,255,255,0.14);
          outline-offset: -1px;
        }
                  .__prints_rowFlash {
          background: rgba(155,188,255,0.04);
          outline: 1px solid rgba(155,188,255,0.24);
          outline-offset: -1px;
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
          transition: opacity 160ms var(--ease);
        }

        .__prints_row:hover .__prints_thumb > img,
        .__prints_rowActive .__prints_thumb > img {
          opacity: 0.98;
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
      {isDesktopPrints ? (
      <div className="__prints_showroom">
        <div className="__prints_stage">
          <div className="__prints_stageFrame">
            <div
              className="__prints_stageMat"
              onWheel={(event) => handleSequenceWheel(event, stageWheelRef, selectStageByDirection)}
            >
              <div className="__prints_stageViewport">
                <img
                  src={stageA || stagePrint?.stageImage || stagePrint?.image}
                  alt={stagePrint?.title || "Print"}
                  decoding="async"
                  fetchPriority="high"
                  style={{
                    opacity: stageTop === "a" ? 1 : 0,
                    transform: stageTop === "a" ? "translateY(0px) scale(1)" : "translateY(3px) scale(1.02)",
                    transition: `opacity ${STAGE_MS}ms var(--ease), transform ${STAGE_MS}ms var(--ease)`,
                  }}
                />
                <img
                  src={stageB || stagePrint?.stageImage || stagePrint?.image}
                  alt={stagePrint?.title || "Print"}
                  decoding="async"
                  fetchPriority="high"
                  style={{
                    opacity: stageTop === "b" ? 1 : 0,
                    transform: stageTop === "b" ? "translateY(0px) scale(1)" : "translateY(3px) scale(1.02)",
                    transition: `opacity ${STAGE_MS}ms var(--ease), transform ${STAGE_MS}ms var(--ease)`,
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
                    <img src={p.thumbImage || p.stageImage || p.image} alt="" loading="lazy" decoding="async" />
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
      ) : null}

      {/* Mobile grid (keeps current behavior) */}
      {!isDesktopPrints ? (
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
              <img
                src={p.stageImage || p.image}
                alt={p.title}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", display: "block" }}
              />
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
      ) : null}


      {activeObj ? createPortal((
        <div
          className="__prints_modal_backdrop"
          onMouseDown={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: `rgba(0,0,0,${backdropOn ? 0.68 : 0})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "calc(var(--header-h) + 24px) 28px 28px",
            zIndex: 200,
            transition: `background ${BACKDROP_MS}ms cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter ${BACKDROP_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            backdropFilter: backdropOn ? "blur(9px)" : "blur(0px)",
            WebkitBackdropFilter: backdropOn ? "blur(9px)" : "blur(0px)",
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(event) => handleSequenceWheel(event, modalWheelRef, selectActiveByDirection)}
            className="__prints_modal_fix"
            data-open={modalOn ? "1" : "0"}
            style={{
              width: "min(96vw, 1360px)",
              background: "rgba(8,9,13,0.94)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "grid",
              gridTemplateColumns: "minmax(0, 2.08fr) minmax(370px, 0.82fr)",
              gap: 0,
              padding: 0,
              maxHeight: "min(86svh, 920px)",
              overflow: "hidden",
              borderRadius: 12,
              position: "relative",
              boxShadow: modalOn
                ? "0 34px 120px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.04)"
                : "0 18px 60px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.02)",
              opacity: modalOn ? 1 : 0,
              transform: modalOn ? "translate3d(0, 0, 0) scale(1)" : "translate3d(0, 18px, 0) scale(0.965)",
              filter: modalOn ? "none" : "blur(2px)",
              willChange: "transform, opacity, filter",
              transition: `opacity ${MODAL_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${MODAL_MS}ms cubic-bezier(0.16, 1, 0.3, 1), filter ${MODAL_MS}ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow ${MODAL_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            <div
  className="__prints_media"
  onPointerDown={handlePhotoPanStart}
  onPointerMove={handlePhotoPanMove}
  onPointerUp={handlePhotoPanEnd}
  onPointerCancel={handlePhotoPanEnd}
  onDoubleClick={resetPhotoPan}
  data-panning={photoDragging ? "1" : "0"}
  style={{
    position: "relative",
    overflow: "hidden",
    borderRight: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.35)",
    minHeight: 0,
    cursor: shipOpen ? (photoDragging ? "grabbing" : "grab") : "default",
    touchAction: shipOpen ? "none" : "auto",
    userSelect: "none",
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
      transition: `opacity ${PHOTO_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${PHOTO_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      willChange: "opacity, transform",
    }}
  >
    <img
      src={activeObj.image}
      alt={activeObj.title}
      draggable={false}
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
      transition: `opacity ${PHOTO_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${PHOTO_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      willChange: "opacity, transform",
      pointerEvents: "none",
    }}
  >
    <img
      className="__prints_panImage"
      ref={photoPanImageRef}
      src={activeObj.image}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: photoPanVisual.objectPosition,
        display: "block",
        transform: photoPanVisual.transform,
        transformOrigin: photoPanVisual.transformOrigin,
        transition: photoDragging
          ? "none"
          : `object-position 620ms cubic-bezier(0.16, 1, 0.3, 1), transform ${PHOTO_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform-origin ${PHOTO_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        willChange: "object-position, transform, transform-origin",
      }}
    />
  </div>
</div>

            <div className="__prints_modal_panel" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div
                ref={modalBodyRef}
                className="__prints_modal_body"
                style={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflow: "auto",
                  padding: 18,
                  paddingRight: 16,
                }}
              >
                <div className="__prints_modal_title" style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif", fontSize: 18 }}>
                  {activeObj.title}
                </div>

                <div className="__prints_modal_meta" style={{ marginTop: 10, color: "rgba(255,255,255,0.70)", lineHeight: 1.8, fontSize: 13 }}>
                  <div>Year: {activeObj.year ?? 2025}</div>
                  <div>{editionForSize}</div>
                  <div>{activeObj.paper}</div>
                </div>

                <div className="__prints_modal_size" style={{ marginTop: 14 }}>
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

                <div className="__prints_modal_details" style={{ marginTop: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontSize: 12 }}>
                  {detailsText.map((t, i) => (
                    <div key={i} style={{ marginTop: i ? 8 : 0 }}>
                      {t}
                    </div>
                  ))}
                </div>

                <div className="__prints_modal_shipping" style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                  <button
                    type="button"
                    onClick={toggleShipPanel}
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
                      className="__prints_modal_shipping_grid"
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
                className="__prints_modal_actions"
                style={{
                  flex: "0 0 auto",
                  padding: 16,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  background: "linear-gradient(to bottom, rgba(10,10,14,0.40), rgba(10,10,14,0.70))",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                      const _email = (site.purchaseEmail || "").trim() || "artproject@concept2048.com";
                      const _subject = (site.purchaseSubject || "").trim() || "Print purchase request";
                      const _body = [
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

                      const _mailto = `mailto:${encodeURIComponent(_email)}?subject=${encodeURIComponent(
                        _subject
                      )}&body=${encodeURIComponent(_body)}`;

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
  /* =========================================================
     WHISPER Mobile Print Modal Fix
     Prevent horizontal overflow + make print modal usable on phones
     ========================================================= */

  .__prints_modal_fix,
  .__prints_modal_fix * {
    box-sizing: border-box;
  }

  .__prints_modal_fix {
    overscroll-behavior: contain;
  }

  .__prints_modal_fix::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background:
      linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 48%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.07) 52%, transparent 100%),
      linear-gradient(180deg, rgba(255,255,255,0.06), transparent 16%, transparent 84%, rgba(255,255,255,0.045));
    opacity: 0;
    transform: translateX(-46%) scaleX(0.22);
    transition:
      opacity 720ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 980ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .__prints_modal_fix::after {
    content: "";
    position: absolute;
    inset: 1px;
    z-index: 2;
    pointer-events: none;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.035),
      inset 0 0 80px rgba(180,210,255,0.035);
    opacity: 0;
    transition: opacity 820ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .__prints_modal_fix[data-open="1"]::before {
    opacity: 0.5;
    transform: translateX(54%) scaleX(0.08);
    transition-delay: 70ms;
  }

  .__prints_modal_fix[data-open="1"]::after {
    opacity: 1;
    transition-delay: 180ms;
  }

  .__prints_modal_fix > * {
    position: relative;
    z-index: 1;
  }

  .__prints_media,
  .__prints_modal_panel {
    opacity: 0;
    transition:
      opacity 760ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 820ms cubic-bezier(0.16, 1, 0.3, 1),
      filter 760ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform, filter;
  }

  .__prints_media {
    transform: scale(1.025);
    filter: blur(2px) saturate(0.9);
  }

  .__prints_modal_panel {
    transform: translate3d(18px, 0, 0);
    filter: blur(1.5px);
  }

  .__prints_modal_fix[data-open="1"] .__prints_media,
  .__prints_modal_fix[data-open="1"] .__prints_modal_panel {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(0) saturate(1);
  }

  .__prints_modal_body > *,
  .__prints_modal_actions > * {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
    transition:
      opacity 520ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 620ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform;
  }

  .__prints_modal_fix[data-open="1"] .__prints_modal_body > *,
  .__prints_modal_fix[data-open="1"] .__prints_modal_actions > * {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .__prints_modal_fix[data-open="1"] .__prints_modal_body > :nth-child(1) { transition-delay: 180ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_body > :nth-child(2) { transition-delay: 235ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_body > :nth-child(3) { transition-delay: 290ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_body > :nth-child(4) { transition-delay: 345ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_body > :nth-child(5) { transition-delay: 400ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_actions > :nth-child(1) { transition-delay: 440ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_actions > :nth-child(2) { transition-delay: 475ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_actions > :nth-child(3) { transition-delay: 510ms; }
  .__prints_modal_fix[data-open="1"] .__prints_modal_actions > :nth-child(4) { transition-delay: 545ms; }

  .__prints_modal_actions button,
  .__prints_modal_actions a {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    text-align: center;
    white-space: normal;
    line-height: 1.18;
  }

  @media (prefers-reduced-motion: reduce) {
    .__prints_modal_fix,
    .__prints_modal_fix::before,
    .__prints_modal_fix::after,
    .__prints_media,
    .__prints_modal_panel,
    .__prints_modal_body > *,
    .__prints_modal_actions > * {
      transition: none !important;
      transform: none !important;
      filter: none !important;
      opacity: 1 !important;
    }
  }

  @media (max-width: 900px) {
    .__prints_modal_fix {
      width: min(94vw, 760px) !important;
      max-width: 94vw !important;
      max-height: calc(100dvh - 28px) !important;
      grid-template-columns: 1fr !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    .__prints_modal_fix > * {
      min-width: 0 !important;
      max-width: 100% !important;
    }

    .__prints_media {
      min-height: 42vh !important;
      max-height: 48vh !important;
      border-right: 0 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10) !important;
      overflow: hidden !important;
    }

    .__prints_media img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      object-fit: contain !important;
    }

    .__prints_media .__prints_panImage {
      object-fit: cover !important;
    }

    .__prints_modal_fix > div:nth-child(2) {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      padding: 22px 18px 18px !important;
      overflow-x: hidden !important;
    }

    .__prints_modal_fix h1,
    .__prints_modal_fix h2,
    .__prints_modal_fix h3 {
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
    }

    .__prints_modal_fix h1 {
      font-size: clamp(28px, 8vw, 42px) !important;
      line-height: 1.02 !important;
      letter-spacing: -0.035em !important;
    }

    .__prints_modal_fix p,
    .__prints_modal_fix li,
    .__prints_modal_fix span {
      max-width: 100% !important;
    }

    .__prints_modal_fix button {
      max-width: 100% !important;
      touch-action: manipulation;
    }
  }

  @media (max-width: 700px) {
    .__prints_modal_fix {
      width: calc(100vw - 20px) !important;
      max-width: calc(100vw - 20px) !important;
      max-height: calc(100dvh - 20px) !important;
      border-radius: 18px !important;
      margin: 0 auto !important;
    }

    .__prints_media {
      min-height: 34vh !important;
      max-height: 38vh !important;
    }

    .__prints_modal_fix > div:nth-child(2) {
      padding: 20px 16px 16px !important;
    }

    .__prints_modal_fix h1 {
      font-size: clamp(24px, 7.5vw, 34px) !important;
      line-height: 1.04 !important;
    }

    /* size selector / segmented controls */
    .__prints_modal_fix [role="tablist"],
    .__prints_modal_fix [aria-label*="size" i],
    .__prints_modal_fix [aria-label*="Size" i] {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }

    /* bottom action row */
    .__prints_modal_fix > div:nth-child(2) > div:last-child {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
    }

    .__prints_modal_fix > div:nth-child(2) > div:last-child button {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 50px !important;
      padding: 12px 10px !important;
      font-size: 10px !important;
      line-height: 1.15 !important;
      letter-spacing: 0.16em !important;
      white-space: normal !important;
    }
  }

  @media (max-width: 420px) {
    .__prints_media {
      min-height: 30vh !important;
      max-height: 34vh !important;
    }

    .__prints_modal_fix > div:nth-child(2) {
      padding: 18px 14px 14px !important;
    }

    .__prints_modal_fix > div:nth-child(2) > div:last-child {
      grid-template-columns: 1fr 1fr !important;
    }

    .__prints_modal_fix > div:nth-child(2) > div:last-child button {
      min-height: 48px !important;
    }
  }

  @media (max-width: 900px) {
    .__prints_modal_backdrop {
      align-items: center !important;
      padding: 16px !important;
      overflow: hidden !important;
      overscroll-behavior: contain !important;
      touch-action: auto !important;
    }

    .__prints_modal_fix {
      width: min(680px, calc(100vw - 24px)) !important;
      max-width: calc(100vw - 24px) !important;
      max-height: calc(100svh - 24px) !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      grid-template-rows: minmax(180px, 34svh) minmax(0, 1fr) !important;
      overflow: hidden !important;
    }

    .__prints_modal_panel {
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .__prints_modal_body {
      min-height: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      overscroll-behavior: contain !important;
      -webkit-overflow-scrolling: touch;
      padding: 18px 16px 14px !important;
      touch-action: pan-y !important;
    }

    .__prints_modal_title {
      font-size: 17px !important;
      line-height: 1.2 !important;
    }

    .__prints_modal_meta {
      margin-top: 8px !important;
      font-size: 12px !important;
      line-height: 1.55 !important;
    }

    .__prints_modal_details {
      display: none !important;
    }

    .__prints_modal_shipping_grid {
      grid-template-columns: 1fr !important;
      row-gap: 6px !important;
    }

    .__prints_modal_shipping_grid > div:nth-child(odd) {
      margin-top: 8px !important;
    }

    .__prints_modal_actions {
      position: sticky !important;
      bottom: 0 !important;
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
      padding: 12px !important;
      background: rgba(10, 10, 14, 0.96) !important;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .__prints_modal_actions button,
    .__prints_modal_actions a {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 44px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 10px 8px !important;
      font-size: 9px !important;
      line-height: 1.15 !important;
      letter-spacing: 0.14em !important;
      text-align: center !important;
      white-space: normal !important;
    }
  }

  @media (max-width: 700px) {
    .__prints_modal_backdrop {
      align-items: center !important;
      justify-content: center !important;
      padding: calc(8px + env(safe-area-inset-top, 0px)) 8px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .__prints_modal_fix {
      width: calc(100vw - 16px) !important;
      max-width: calc(100vw - 16px) !important;
      max-height: calc(100svh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
      border-radius: 18px 18px 12px 12px !important;
      grid-template-rows: minmax(150px, 28svh) minmax(0, 1fr) !important;
      margin: auto !important;
    }

    .__prints_media {
      min-height: 0 !important;
      max-height: none !important;
    }

    .__prints_modal_body {
      padding: 16px 14px 12px !important;
    }

    .__prints_modal_size {
      margin-top: 12px !important;
    }
  }

  @media (max-width: 420px) {
    .__prints_modal_fix {
      grid-template-rows: minmax(132px, 24svh) minmax(0, 1fr) !important;
    }

    .__prints_modal_fix > .__prints_modal_panel > .__prints_modal_actions {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 7px !important;
      padding: 10px !important;
    }

    .__prints_modal_fix > .__prints_modal_panel > .__prints_modal_actions button,
    .__prints_modal_fix > .__prints_modal_panel > .__prints_modal_actions a {
      min-height: 42px !important;
      font-size: 8.5px !important;
      letter-spacing: 0.12em !important;
    }
  }
          `}</style>
        </div>
      ), document.body) : null}

      <CustomerPrintArOverlay />
    </div>
  );
}
