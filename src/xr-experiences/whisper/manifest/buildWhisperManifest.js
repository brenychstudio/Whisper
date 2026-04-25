// src/xr-experiences/whisper/manifest/buildWhisperManifest.js
import { site } from "../../../content/config.js";

function inferPrintId(seriesKey, src) {
  const m = String(src || "").match(/\/(\d+)([a-z])?\.jpg$/i);
  if (!m) return null;
  const n = String(m[1] || "").padStart(2, "0");
  const suf = (m[2] || "").toLowerCase();
  return `${seriesKey}-${n}${suf}`;
}

function flattenSeries(seriesKey) {
  const s = (site.series || []).find((x) => x.key === seriesKey);
  if (!s) return [];

  const out = [];
  for (const it of s.items || []) {
    if (!it) continue;
    if (it.type === "text" || it.type === "video_stage") continue;

    if (it.type === "diptych") {
      for (const di of it.items || []) {
        if (!di?.src) continue;
        out.push({
          zoneId: seriesKey,
          src: di.src,
          caption: di.alt || "",
          printId: inferPrintId(seriesKey, di.src),
        });
      }
      continue;
    }

    if (it.src) {
      out.push({
        zoneId: seriesKey,
        src: it.src,
        caption: it.alt || "",
        printId: inferPrintId(seriesKey, it.src),
      });
    }
  }

  return out;
}

// ---- VIDEO STAGE HELPERS (MUST be top-level scope) ----
function getVideoStage(seriesKey) {
  const s = (site.series || []).find((x) => x.key === seriesKey);
  if (!s) return null;
  const it = (s.items || []).find((x) => x?.type === "video_stage");
  if (!it?.src) return null;

  return {
    videoSrc: it.src,
    poster: it.poster || "",
    caption: it.caption || "",
  };
}

function insertVideoStageAfterSecond(list, seriesKey) {
  const stage = getVideoStage(seriesKey);
  if (!stage) return Array.isArray(list) ? list : [];

  const out = Array.isArray(list) ? [...list] : [];
  const stagePrintId = `${seriesKey}-stage`;

  const stageItem = {
    zoneId: seriesKey,
    // contract requires src — use poster (or fallback to an existing frame)
    src: stage.poster || out[1]?.src || out[0]?.src || "",
    poster: stage.poster || "",
    caption: stage.caption || `${seriesKey} — motion fragment`,
    printId: stagePrintId,
    kind: "video",
    videoSrc: stage.videoSrc,
  };

  // Insert AFTER second artwork (index 2)
  if (out.length >= 2) out.splice(2, 0, stageItem);
  else out.push(stageItem);

  return out;
}

function toMapByPrintId(list) {
  const m = new Map();
  for (const a of list || []) {
    if (a?.printId) m.set(a.printId, a);
  }
  return m;
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function spreadPick(list, count) {
  const arr = Array.isArray(list) ? list : [];
  const n = arr.length;
  if (count <= 0 || n === 0) return [];
  if (count >= n) return [...arr];

  const out = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const idx = Math.round(t * (n - 1));
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }

  for (let i = 0; i < n && out.length < count; i++) {
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }

  return out;
}

/**
 * Curate selection rules (config-driven).
 * - curatedIds: explicit include list (printId[])
 * - rules: { count?: number, strategy?: "first" | "spread", exclude?: string[] }
 */
function pickCurated(all, curatedIds, rules, fallbackCount = 3) {
  const safeAll = Array.isArray(all) ? all : [];
  const includeIds = uniq(Array.isArray(curatedIds) ? curatedIds.filter(Boolean) : []);
  const excludeIds = new Set(uniq(Array.isArray(rules?.exclude) ? rules.exclude.filter(Boolean) : []));

  const count =
    typeof rules?.count === "number" && Number.isFinite(rules.count)
      ? Math.max(0, Math.floor(rules.count))
      : includeIds.length || fallbackCount;

  const strategy = rules?.strategy === "spread" ? "spread" : "first";
  const byId = toMapByPrintId(safeAll);

  const picked = [];
  const pickedIds = new Set();

  for (const id of includeIds) {
    if (excludeIds.has(id)) continue;
    const item = byId.get(id);
    if (!item) continue;
    if (pickedIds.has(item.printId)) continue;
    pickedIds.add(item.printId);
    picked.push(item);
    if (picked.length >= count) return picked;
  }

  const remaining = safeAll.filter(
    (x) => x?.printId && !excludeIds.has(x.printId) && !pickedIds.has(x.printId)
  );

  const need = Math.max(0, count - picked.length);
  if (need <= 0) return picked;

  const fill = strategy === "spread" ? spreadPick(remaining, need) : remaining.slice(0, need);

  for (const x of fill) {
    if (!x?.printId) continue;
    if (pickedIds.has(x.printId)) continue;
    pickedIds.add(x.printId);
    picked.push(x);
    if (picked.length >= count) break;
  }

  return picked;
}

export async function buildWhisperManifest() {
  const xr = site?.xr || {};

  const seaAll = flattenSeries("sea");
  const forestAll = flattenSeries("forest");

  const seaCurated = pickCurated(seaAll, xr?.curated?.sea, xr?.curatedRules?.sea, 3);
  const forestCurated = pickCurated(forestAll, xr?.curated?.forest, xr?.curatedRules?.forest, 3);

  // Insert “video_stage” AFTER 2nd work in each zone
  const seaSeq = insertVideoStageAfterSecond(seaCurated, "sea");
  const forestSeq = insertVideoStageAfterSecond(forestCurated, "forest");

  const artworksRaw = [...seaSeq, ...forestSeq]
    .filter((a) => a?.src)
    .filter((a) => a?.printId);

  const zones = [
    { id: "sea", label: "Sea" },
    { id: "forest", label: "Forest" },
  ];

  const artworks = artworksRaw.map((a) => ({
    id: `art-${a.printId}`,
    printId: a.printId,
    zoneId: a.zoneId,
    src: a.src,
    caption: a.caption || "",
    kind: a.kind || undefined,
    videoSrc: a.videoSrc || undefined,
    poster: a.poster || undefined,
  }));

  const defaultOnGaze = Array.isArray(xr?.triggers?.onGaze) ? xr.triggers.onGaze : ["advance"];
  const defaultOnProximity = Array.isArray(xr?.triggers?.onProximity)
    ? xr.triggers.onProximity
    : ["whisper"];

  const beats = artworks.map((a, idx) => {
    const isVideo = a?.kind === "video" || !!a?.videoSrc;

    return {
      id: `beat-${String(idx + 1).padStart(2, "0")}`,
      zoneId: a.zoneId,
      artworkPrintId: a.printId,
      onGaze: defaultOnGaze,
      onProximity: isVideo ? ["video"] : defaultOnProximity,
    };
  });

  return {
    experienceId: xr?.experienceId || "whisper",
    zones,
    artworks,
    beats,
    collect: { mode: "qr", shareBasePath: "/p/" },
  };
}

// Generic alias for XRCore (engine should not depend on WHISPER naming).
export const buildManifest = buildWhisperManifest;