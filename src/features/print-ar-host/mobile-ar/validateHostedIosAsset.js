const IOS_HEAVY_BYTES = 10 * 1024 * 1024;
const IOS_HARD_LIMIT_BYTES = 16 * 1024 * 1024;

function formatBytes(value) {
  if (value == null || Number.isNaN(value)) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeContentType(response) {
  const value = response.headers.get("content-type");
  if (!value) return null;
  return value.split(";")[0].trim().toLowerCase();
}

function getSizeTier(sizeBytes) {
  if (sizeBytes == null || Number.isNaN(sizeBytes)) return "unknown";
  if (sizeBytes > IOS_HARD_LIMIT_BYTES) return "hard-limit-risk";
  if (sizeBytes > IOS_HEAVY_BYTES) return "heavy";
  return "ok";
}

function buildResult(base) {
  const sizeTier = base.sizeTier || "unknown";
  const tooHeavy = sizeTier === "heavy" || sizeTier === "hard-limit-risk";
  const reachable = base.status === "ok" || base.status === "ok-heavy";

  return {
    ok: base.ok,
    status: base.status,
    classification: base.status,
    statusCode: base.statusCode ?? null,
    message: base.message,
    reachable,
    tooHeavy,
    sizeTier,
    sizeBytes: base.sizeBytes ?? null,
    bytes: base.sizeBytes ?? null,
    sizeLabel: formatBytes(base.sizeBytes),
    contentType: base.contentType ?? null,
    mimeType: base.contentType ?? null,
    url: base.url || null,
    finalUrl: base.finalUrl || base.url || null,
  };
}

function isValidUsdzContentType(contentType, url) {
  if (!contentType) {
    return /\.usdz(?:$|[?#])/i.test(String(url || ""));
  }

  return (
    contentType.includes("model/vnd.usdz+zip") ||
    contentType.includes("model/usd") ||
    contentType.includes("application/octet-stream")
  );
}

export async function validateHostedIosAsset(url) {
  if (!url) {
    return buildResult({
      ok: false,
      status: "missing",
      statusCode: null,
      message: "No hosted USDZ path is attached in manifest.",
      sizeBytes: null,
      sizeTier: "unknown",
      contentType: null,
      url: null,
      finalUrl: null,
    });
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    const sizeHeader = response.headers.get("content-length");
    const sizeBytes =
      sizeHeader && Number.isFinite(Number(sizeHeader))
        ? Number(sizeHeader)
        : null;
    const sizeTier = getSizeTier(sizeBytes);
    const contentType = normalizeContentType(response);
    const finalUrl = response.url || url;

    if (!response.ok) {
      return buildResult({
        ok: false,
        status: "unreachable",
        statusCode: response.status,
        message: `Hosted USDZ returned ${response.status}.`,
        sizeBytes,
        sizeTier,
        contentType,
        url,
        finalUrl,
      });
    }

    if (!isValidUsdzContentType(contentType, finalUrl)) {
      return buildResult({
        ok: false,
        status: "invalid",
        statusCode: response.status,
        message: contentType
          ? `Hosted USDZ MIME type looks invalid: ${contentType}.`
          : "Hosted USDZ response does not look like a USDZ file.",
        sizeBytes,
        sizeTier,
        contentType,
        url,
        finalUrl,
      });
    }

    if (sizeTier === "heavy" || sizeTier === "hard-limit-risk") {
      return buildResult({
        ok: true,
        status: "ok-heavy",
        statusCode: response.status,
        message:
          sizeTier === "hard-limit-risk"
            ? `Hosted USDZ is reachable but heavy (${formatBytes(sizeBytes)}). Quick Look may load slowly.`
            : `Hosted USDZ is reachable (${formatBytes(sizeBytes)}) but heavier than ideal for iPhone/iPad.`,
        sizeBytes,
        sizeTier,
        contentType,
        url,
        finalUrl,
      });
    }

    return buildResult({
      ok: true,
      status: "ok",
      statusCode: response.status,
      message: `Hosted USDZ is reachable${sizeBytes != null ? ` (${formatBytes(sizeBytes)})` : ""}.`,
      sizeBytes,
      sizeTier,
      contentType,
      url,
      finalUrl,
    });
  } catch (error) {
    return buildResult({
      ok: false,
      status: "unreachable",
      statusCode: null,
      message:
        error instanceof Error
          ? error.message
          : "Hosted USDZ validation failed.",
      sizeBytes: null,
      sizeTier: "unknown",
      contentType: null,
      url,
      finalUrl: url,
    });
  }
}
