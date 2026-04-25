// src/xr-core/content/validateManifest.js
import { XR_MANIFEST_SCHEMA_VERSION } from "./manifestContract.js";

const ID_RE = /^[a-z0-9][a-z0-9-_]*$/i;

const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const isStr = (x) => typeof x === "string";
const isNum = (x) => typeof x === "number" && Number.isFinite(x);

const toStr = (x) => (isStr(x) ? x : "");
const trim = (s) => toStr(s).trim();

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function normalizeShareBasePath(p, warnings, errors) {
  const raw = trim(p);
  if (!raw) {
    errors.push("manifest.collect.shareBasePath is required.");
    return "/p/";
  }

  if (raw.includes("://")) {
    warnings.push("manifest.collect.shareBasePath looks like a full URL; expected a path like '/p/'.");
  }

  let out = raw;
  if (!out.startsWith("/")) out = `/${out}`;
  if (!out.endsWith("/")) out = `${out}/`;

  // avoid weird double slashes (keep root-safe)
  out = out.replace(/\/{2,}/g, "/");

  return out;
}

function pushDupe(set, key, onDupe) {
  if (!key) return;
  if (set.has(key)) onDupe();
  set.add(key);
}

export function validateManifest(m) {
  const errors = [];
  const warnings = [];

  if (!isObj(m)) {
    return { ok: false, errors: ["Manifest is not an object."], warnings, manifest: null };
  }

  const experienceId = trim(m.experienceId);
  if (!experienceId) errors.push("manifest.experienceId is required.");

  // optional schemaVersion (not required to keep backward compatibility)
  const schemaVersion = isNum(m.schemaVersion) ? m.schemaVersion : null;
  if (schemaVersion == null) {
    warnings.push(
      `manifest.schemaVersion is missing (recommended: ${XR_MANIFEST_SCHEMA_VERSION}).`
    );
  }

  // zones
  const zonesIn = Array.isArray(m.zones) ? m.zones : null;
  if (!zonesIn) errors.push("manifest.zones[] is required.");

  const zones = [];
  const zoneIds = new Set();

  for (let i = 0; i < (zonesIn || []).length; i++) {
    const z = zonesIn[i];
    const id = trim(z?.id);
    const label = trim(z?.label);

    if (!id) errors.push(`zones[${i}].id is required.`);
    else if (!ID_RE.test(id)) warnings.push(`zones[${i}].id '${id}' is not a safe id (recommended: ${ID_RE}).`);

    if (!label) warnings.push(`zones[${i}].label is missing (recommended).`);

    pushDupe(zoneIds, id, () => errors.push(`zones[].id duplicate: '${id}'.`));

    zones.push({ id, label });
  }

  if (zonesIn && zones.length === 0) warnings.push("manifest.zones is empty (ok for MVP, but recommended to define).");

  // artworks
  const artworksIn = Array.isArray(m.artworks) ? m.artworks : null;
  if (!artworksIn) errors.push("manifest.artworks[] is required.");

  const artworks = [];
  const artworkIds = new Set();
  const printIds = new Set();

  for (let i = 0; i < (artworksIn || []).length; i++) {
    const a = artworksIn[i];
    const id = trim(a?.id);
    const printId = trim(a?.printId);
    const zoneId = trim(a?.zoneId);
    const src = trim(a?.src);

    if (!id) errors.push(`artworks[${i}].id is required.`);
    if (!printId) errors.push(`artworks[${i}].printId is required.`);
    if (!zoneId) errors.push(`artworks[${i}].zoneId is required.`);
    if (!src) errors.push(`artworks[${i}].src is required.`);

    if (id) pushDupe(artworkIds, id, () => errors.push(`artworks[].id duplicate: '${id}'.`));
    if (printId) pushDupe(printIds, printId, () => errors.push(`artworks[].printId duplicate: '${printId}'.`));

    if (zoneId && zoneIds.size && !zoneIds.has(zoneId)) {
      errors.push(`artworks[${i}].zoneId '${zoneId}' not found in zones[].id.`);
    }

    const caption = a?.caption == null ? undefined : String(a.caption);
    const title = a?.title == null ? undefined : String(a.title);
const kindRaw = trim(a?.kind);
const kind = kindRaw === "video" ? "video" : undefined;

const videoSrc = a?.videoSrc == null ? undefined : String(a.videoSrc).trim();
const poster = a?.poster == null ? undefined : String(a.poster).trim();

if (kindRaw && kindRaw !== "video") {
  warnings.push(`artworks[${i}].kind '${kindRaw}' is not supported (supported: 'video').`);
}
if (kind === "video" && !videoSrc) {
  errors.push(`artworks[${i}] kind 'video' requires videoSrc.`);
}
if (videoSrc && !videoSrc.startsWith("/") && !videoSrc.startsWith("http") && !videoSrc.startsWith("data:")) {
  warnings.push(`artworks[${i}].videoSrc '${videoSrc}' is not an absolute path; ensure it resolves in runtime.`);
}

    // light src sanity checks (warn-only)
    if (src && !src.startsWith("/") && !src.startsWith("http") && !src.startsWith("data:")) {
      warnings.push(`artworks[${i}].src '${src}' is not an absolute path; ensure it resolves in runtime.`);
    }

    artworks.push({ id, printId, zoneId, src, caption, title, kind, videoSrc, poster });
  }

  if (artworksIn && artworks.length === 0) errors.push("manifest.artworks must not be empty.");

  // beats
  const beatsIn = Array.isArray(m.beats) ? m.beats : null;
  if (!beatsIn) errors.push("manifest.beats[] is required.");

  const beats = [];
  const beatIds = new Set();

  for (let i = 0; i < (beatsIn || []).length; i++) {
    const b = beatsIn[i];
    const id = trim(b?.id);
    const zoneId = trim(b?.zoneId);
    const artworkPrintId = trim(b?.artworkPrintId);

    if (!id) errors.push(`beats[${i}].id is required.`);
    if (!zoneId) errors.push(`beats[${i}].zoneId is required.`);

    if (id) pushDupe(beatIds, id, () => errors.push(`beats[].id duplicate: '${id}'.`));

    if (zoneId && zoneIds.size && !zoneIds.has(zoneId)) {
      errors.push(`beats[${i}].zoneId '${zoneId}' not found in zones[].id.`);
    }

    if (artworkPrintId && !printIds.has(artworkPrintId)) {
      errors.push(`beats[${i}].artworkPrintId '${artworkPrintId}' not found in artworks[].printId.`);
    }

    const guidance = isObj(b?.guidance)
      ? {
          type: trim(b.guidance.type) || "beacon",
          intensity: isNum(b.guidance.intensity) ? clamp01(b.guidance.intensity) : undefined,
        }
      : undefined;

    const onGaze = Array.isArray(b?.onGaze) ? b.onGaze.filter(Boolean).map(String) : undefined;
    const onProximity = Array.isArray(b?.onProximity)
      ? b.onProximity.filter(Boolean).map(String)
      : undefined;

    beats.push({ id, zoneId, artworkPrintId: artworkPrintId || undefined, guidance, onGaze, onProximity });
  }

  if (beatsIn && beats.length === 0) warnings.push("manifest.beats is empty (runtime can fallback to artworks ordering).");

  // collect
  const collectIn = isObj(m.collect) ? m.collect : null;
  if (!collectIn) errors.push("manifest.collect is required.");

  const mode = trim(collectIn?.mode) || "qr";
  if (mode !== "qr") warnings.push(`manifest.collect.mode '${mode}' is not supported yet (expected 'qr').`);

  const shareBasePath = normalizeShareBasePath(collectIn?.shareBasePath, warnings, errors);

  const manifest = {
    experienceId,
    schemaVersion: schemaVersion ?? undefined,
    zones,
    artworks,
    beats,
    collect: { mode: "qr", shareBasePath },
  };

  return { ok: errors.length === 0, errors, warnings, manifest };
}