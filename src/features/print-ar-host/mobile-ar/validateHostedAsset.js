const ANDROID_HEAVY_BYTES = 10 * 1024 * 1024;
const ANDROID_HARD_LIMIT_BYTES = 15 * 1024 * 1024;

function formatBytes(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function getSizeTier(sizeBytes) {
  if (sizeBytes == null) return "unknown";
  if (sizeBytes > ANDROID_HARD_LIMIT_BYTES) return "hard-limit-risk";
  if (sizeBytes > ANDROID_HEAVY_BYTES) return "heavy";
  return "ok";
}

function getMimeType(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) return null;
  return contentType.split(";")[0].trim().toLowerCase();
}

function buildResult(base) {
  const sizeTier = base.sizeTier || "unknown";
  const tooHeavy = sizeTier === "heavy" || sizeTier === "hard-limit-risk";
  const reachable = base.status === "ok" || base.status === "too-heavy";

  return {
    ok: base.ok,
    status: base.status,
    classification: base.status,
    statusCode: base.statusCode ?? null,
    message: base.message,
    reachable,
    tooHeavy,
    sizeBytes: base.sizeBytes ?? null,
    sizeLabel: formatBytes(base.sizeBytes),
    sizeTier,
    mimeType: base.mimeType ?? null,
    url: base.url || null,
  };
}

export async function validateHostedAsset(url) {
  if (!url) {
    return buildResult({
      ok: false,
      status: "missing",
      statusCode: null,
      message: "No hosted GLB path is attached in manifest.",
      sizeBytes: null,
      sizeTier: "unknown",
      mimeType: null,
      url: null,
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
    const mimeType = getMimeType(response);

    if (!response.ok) {
      return buildResult({
        ok: false,
        status: "unreachable",
        statusCode: response.status,
        message: `Hosted GLB returned ${response.status}.`,
        sizeBytes,
        sizeTier,
        mimeType,
        url,
      });
    }

    if (mimeType && !mimeType.includes("model") && !mimeType.includes("octet-stream")) {
      return buildResult({
        ok: false,
        status: "invalid",
        statusCode: response.status,
        message: `Hosted GLB MIME type looks invalid: ${mimeType}.`,
        sizeBytes,
        sizeTier,
        mimeType,
        url,
      });
    }

    if (sizeTier === "heavy" || sizeTier === "hard-limit-risk") {
      return buildResult({
        ok: true,
        status: "too-heavy",
        statusCode: response.status,
        message:
          sizeTier === "hard-limit-risk"
            ? `Hosted GLB is ${formatBytes(sizeBytes)} and may exceed comfortable Scene Viewer limits.`
            : `Hosted GLB is ${formatBytes(sizeBytes)} and heavier than ideal for Android.`,
        sizeBytes,
        sizeTier,
        mimeType,
        url,
      });
    }

    return buildResult({
      ok: true,
      status: "ok",
      statusCode: response.status,
      message: `Hosted GLB is reachable (${formatBytes(sizeBytes)}).`,
      sizeBytes,
      sizeTier,
      mimeType,
      url,
    });
  } catch (error) {
    return buildResult({
      ok: false,
      status: "unreachable",
      statusCode: null,
      message:
        error instanceof Error
          ? error.message
          : "Hosted GLB validation failed.",
      sizeBytes: null,
      sizeTier: "unknown",
      mimeType: null,
      url,
    });
  }
}
