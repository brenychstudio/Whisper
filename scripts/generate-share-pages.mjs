// scripts/generate-share-pages.mjs
// Generates static OG "share pages" at /public/p/<print-id>/index.html
// so links like https://your-domain.com/p/sea-01/ show rich previews.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { site } from "../src/content/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const OUT_DIR = path.join(root, "public", "p");

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function trimSlashEnd(s) {
  return String(s || "").trim().replace(/\/+$/, "");
}

function ensureLeadingSlash(p) {
  const s = String(p || "").trim();
  if (!s) return "";
  return s.startsWith("/") ? s : `/${s}`;
}

function absUrl(base, p) {
  const b = trimSlashEnd(base);
  const rel = ensureLeadingSlash(p);
  return b ? `${b}${rel}` : rel;
}

function parseCode(input) {
  const s = String(input || "");
  // examples: "Sea 05a", "05A", "Whisper of the Sea — 01"
  const m = s.match(/(\d{1,3})\s*([a-zA-Z])?/);
  if (!m) return null;
  const n = String(parseInt(m[1], 10)).padStart(2, "0");
  const suf = m[2] ? m[2].toLowerCase() : "";
  return { n, suf };
}

function codeFromPath(p) {
  const base = path.posix.basename(String(p || ""));
  // "05a.jpg" -> "05a"
  const stem = base.replace(/\.[a-z0-9]+$/i, "");
  return parseCode(stem);
}

function displayCode({ n, suf }) {
  return suf ? `${n}${suf.toUpperCase()}` : n;
}

function buildAutoPrints() {
  const out = [];
  const series = Array.isArray(site?.series) ? site.series : [];

  for (const s of series) {
    const key = s?.key;
    if (!key) continue;

    const seriesTitle = s?.title || key;
    const items = Array.isArray(s?.items) ? s.items : [];

    const pushItem = (imgItem) => {
      if (!imgItem?.src) return;
      const code = parseCode(imgItem?.alt) || codeFromPath(imgItem.src);
      if (!code) return;

      const id = `${String(key).toLowerCase()}-${code.n}${code.suf}`;
      out.push({
        id,
        series: String(key).toLowerCase(),
        title: `${seriesTitle} — ${displayCode(code)}`,
        image: imgItem.src,
      });
    };

    for (const it of items) {
      if (!it) continue;
      if (it.type === "text") continue;
      if (it.type === "video_stage") continue;

      if (it.type === "diptych" && Array.isArray(it.items)) {
        for (const img of it.items) pushItem(img);
        continue;
      }

      // full / window / default image item
      if (it.src) pushItem(it);
    }
  }

  return out;
}

function mergePrints(autoPrints, manualPrints) {
  const map = new Map();

  for (const p of autoPrints) {
    map.set(p.id, p);
  }

  for (const p of manualPrints) {
    if (!p?.id) continue;
    const id = String(p.id);
    const prev = map.get(id) || {};
    map.set(id, {
      ...prev,
      ...p,
      id,
      series: (p.series || prev.series || "").toString().toLowerCase(),
    });
  }

  return Array.from(map.values());
}

function ogDescription(p, defaults) {
  const parts = [];
  const edition = p.edition || defaults?.edition;
  const paper = p.paper || defaults?.paper;
  const priceFrom =
    (typeof p.priceFrom === "number" && Number.isFinite(p.priceFrom)
      ? p.priceFrom
      : defaults?.priceFrom);

  if (edition) parts.push(edition);
  if (paper) parts.push(paper);
  if (typeof priceFrom === "number" && Number.isFinite(priceFrom)) {
    parts.push(`From €${priceFrom}`);
  }

  return parts.filter(Boolean).join(" · ") || "Limited edition fine art print.";
}

function htmlTemplate({ title, description, ogUrl, ogImage, redirectUrl, siteName }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="noindex,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:site_name" content="${esc(siteName || "")}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(ogUrl)}" />
    <meta property="og:image" content="${esc(ogImage)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(ogImage)}" />

    <link rel="canonical" href="${esc(ogUrl)}" />

    <!-- Bots read OG tags; humans get redirected immediately via JS. -->
    <meta http-equiv="refresh" content="2;url=${esc(redirectUrl)}" />
  </head>
  <body>
    <script>
      // Fast redirect for humans
      location.replace(${JSON.stringify(redirectUrl)});
    </script>
    <noscript>
      <a href="${esc(redirectUrl)}">Continue</a>
    </noscript>
  </body>
</html>`;
}

async function main() {
  const cfgUrl = trimSlashEnd(site?.url);
const envUrl = trimSlashEnd(process.env.SITE_URL || process.env.VITE_SITE_URL || "");

const isPlaceholder = (u) =>
  /YOUR-PROJECT|example\.com|pages\.dev\/?$/i.test(String(u || ""));

const baseUrl = envUrl || (cfgUrl && !isPlaceholder(cfgUrl) ? cfgUrl : "");

  const autoPrints = buildAutoPrints();
  const manualPrints = Array.isArray(site?.prints) ? site.prints : [];

  const firstManual = manualPrints.find(
    (x) => x && (x.edition || x.paper || (typeof x.priceFrom === "number" && Number.isFinite(x.priceFrom)))
  );

  const defaults = {
    edition: firstManual?.edition || "Limited Edition",
    paper: firstManual?.paper || "",
    priceFrom:
      typeof firstManual?.priceFrom === "number" && Number.isFinite(firstManual.priceFrom)
        ? firstManual.priceFrom
        : undefined,
  };
  const prints = mergePrints(autoPrints, manualPrints)
    .filter((p) => p?.id && p?.image)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  // wipe & recreate public/p
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  let count = 0;

  for (const p of prints) {
    const id = String(p.id);

    const sharePath = `/p/${encodeURIComponent(id)}/`;
    const ogUrl = absUrl(baseUrl, sharePath);

    const redirectUrl = `/prints?print=${encodeURIComponent(id)}`;

    // OG image needs to be absolute for best results.
    const imgPath = ensureLeadingSlash(p.image);
    const ogImage = absUrl(baseUrl, imgPath);

    const title = p.title || id;
    const description = ogDescription(p, defaults);

    const dir = path.join(OUT_DIR, id);
    await fs.mkdir(dir, { recursive: true });

    const html = htmlTemplate({
  title,
  description,
  ogUrl,
  ogImage,
  redirectUrl,
  siteName: site?.title || "WHISPER",
});

    await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
    count += 1;
  }

  console.log(`[share-pages] Generated ${count} OG pages in public/p/*`);
  if (!baseUrl) {
  console.log(
    "[share-pages] NOTE: baseUrl is empty. Set env SITE_URL (recommended) or VITE_SITE_URL for absolute OG URLs/images."
  );
}
}

main().catch((err) => {
  console.error("[share-pages] Failed:", err);
  process.exit(1);
});
