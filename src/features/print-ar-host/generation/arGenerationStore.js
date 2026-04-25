const STORAGE_KEY = "print-ar-generation-jobs-v2";
const SESSION_GENERATED_OUTPUTS = new Map();

const ALLOWED_JOB_STATUSES = new Set([
  "missing",
  "queued",
  "generating",
  "generated",
  "ready",
  "failed",
]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeStatus(value) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (ALLOWED_JOB_STATUSES.has(status)) {
    return status;
  }

  return "missing";
}

function outputKey(jobId, format = "glb") {
  return `${String(jobId || "").trim()}::${String(format || "glb").trim().toLowerCase()}`;
}

function normalizeJob(raw) {
  const assetKey = String(raw?.assetKey || raw?.jobId || "").trim();
  const jobId = String(raw?.jobId || assetKey).trim();

  if (!assetKey || !jobId) {
    return null;
  }

  return {
    jobId,
    assetKey,
    productId: raw?.productId || "",
    printId: raw?.printId || raw?.productId || "",
    title: raw?.title || "",
    sizeLabel: raw?.sizeLabel || "",
    plannedGlbPath: raw?.plannedGlbPath || `/generated/${assetKey}.glb`,
    plannedUsdzPath: raw?.plannedUsdzPath || `/generated/${assetKey}.usdz`,
    status: normalizeStatus(raw?.status),
    fileName: raw?.fileName || "",
    sizeBytes: Number.isFinite(raw?.sizeBytes) ? raw.sizeBytes : null,
    error: raw?.error || "",
    usdzStatus: normalizeStatus(raw?.usdzStatus),
    usdzFileName: raw?.usdzFileName || "",
    usdzSizeBytes: Number.isFinite(raw?.usdzSizeBytes) ? raw.usdzSizeBytes : null,
    usdzError: raw?.usdzError || "",
    usdzExportProfileMode: raw?.usdzExportProfileMode || "",
    usdzTextureOptimized: raw?.usdzTextureOptimized === true,
    usdzWallPlacementMode: raw?.usdzWallPlacementMode || "",
    usdzPivotStrategy: raw?.usdzPivotStrategy || "",
    usdzInitialTransformPreset: raw?.usdzInitialTransformPreset || "",
    usdzInteractionIntent: raw?.usdzInteractionIntent || "",
    usdzWallFirstTuned: raw?.usdzWallFirstTuned === true,
    usdzExperimentMode: raw?.usdzExperimentMode === true,
    usdzOrientationBias: raw?.usdzOrientationBias || "",
    updatedAt: raw?.updatedAt || nowIso(),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function stableDedupe(jobs) {
  const byJobId = new Map();

  for (const job of jobs) {
    const normalized = normalizeJob(job);
    if (!normalized) continue;
    byJobId.set(normalized.jobId, normalized);
  }

  return Array.from(byJobId.values()).sort((a, b) =>
    String(a.updatedAt).localeCompare(String(b.updatedAt)),
  );
}

function withJobUpdate(jobs, jobId, updater) {
  const targetId = String(jobId || "").trim();
  if (!targetId) return jobs;

  return jobs.map((job) => {
    if (job.jobId !== targetId) return job;
    return normalizeJob({
      ...job,
      ...updater(job),
      updatedAt: nowIso(),
    });
  });
}

export function loadGenerationJobs() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return stableDedupe(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function saveGenerationJobs(jobs) {
  const normalized = stableDedupe(Array.isArray(jobs) ? jobs : []);

  if (!canUseStorage()) {
    return normalized;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage write failures in browser-limited modes
  }

  return normalized;
}

export function upsertQueuedJob(jobs, input) {
  const source = Array.isArray(jobs) ? [...jobs] : [];
  const targetId = String(input?.jobId || input?.assetKey || "").trim();
  const index = source.findIndex((job) => job?.jobId === targetId);

  if (!targetId) {
    return stableDedupe(source);
  }

  const nextValue = normalizeJob({
    ...(index >= 0 ? source[index] : {}),
    ...input,
    jobId: targetId,
    status: "queued",
    error: "",
    updatedAt: nowIso(),
  });

  if (!nextValue) {
    return stableDedupe(source);
  }

  if (index === -1) {
    source.push(nextValue);
    return stableDedupe(source);
  }

  source[index] = nextValue;

  return stableDedupe(source);
}

export function markJobGenerating(jobs, jobId) {
  return stableDedupe(
    withJobUpdate(stableDedupe(jobs || []), jobId, () => ({
      status: "generating",
      error: "",
    })),
  );
}

export function markJobGenerated(jobs, jobId, generated) {
  return stableDedupe(
    withJobUpdate(stableDedupe(jobs || []), jobId, () => ({
      status: "generated",
      error: "",
      fileName: generated?.fileName || "",
      sizeBytes: Number.isFinite(generated?.sizeBytes) ? generated.sizeBytes : null,
    })),
  );
}

export function markJobFailed(jobs, jobId, error) {
  return stableDedupe(
    withJobUpdate(stableDedupe(jobs || []), jobId, () => ({
      status: "failed",
      error: error || "GLB generation failed.",
    })),
  );
}

export function markUsdzGenerating(jobs, jobId) {
  return stableDedupe(
    withJobUpdate(stableDedupe(jobs || []), jobId, () => ({
      usdzStatus: "generating",
      usdzError: "",
    })),
  );
}

export function markUsdzGenerated(jobs, jobId, generated) {
  return stableDedupe(
    withJobUpdate(stableDedupe(jobs || []), jobId, () => ({
      usdzStatus: "generated",
      usdzError: "",
      usdzFileName: generated?.fileName || "",
      usdzSizeBytes: Number.isFinite(generated?.sizeBytes) ? generated.sizeBytes : null,
      usdzExportProfileMode: generated?.exportProfileUsed?.mode || "",
      usdzTextureOptimized: generated?.textureOptimization?.applied === true,
      usdzWallPlacementMode: generated?.wallPlacement?.mode || "",
      usdzPivotStrategy: generated?.pivotNormalization?.strategy || "",
      usdzInitialTransformPreset: generated?.initialTransform?.preset || "",
      usdzInteractionIntent:
        generated?.wallPlacement?.interactionIntent ||
        generated?.exportProfileUsed?.interactionIntent ||
        "",
      usdzWallFirstTuned:
        generated?.wallPlacement?.mode === "wall-first" ||
        generated?.wallPlacement?.mode === "wall-first-experiment",
      usdzExperimentMode: generated?.wallFirstExperimentEnabled === true,
      usdzOrientationBias:
        generated?.wallPlacement?.orientationBias ||
        generated?.exportProfileUsed?.orientationBias ||
        "",
    })),
  );
}

export function markUsdzFailed(jobs, jobId, error) {
  return stableDedupe(
    withJobUpdate(stableDedupe(jobs || []), jobId, () => ({
      usdzStatus: "failed",
      usdzError: error || "USDZ generation failed.",
    })),
  );
}

export function removeJob(jobs, jobId) {
  const targetId = String(jobId || "").trim();
  if (!targetId) return stableDedupe(jobs || []);

  removeSessionGeneratedOutput(targetId);
  return stableDedupe((jobs || []).filter((job) => job?.jobId !== targetId));
}

export function clearCompletedJobs(jobs) {
  const source = stableDedupe(jobs || []);
  const removedIds = source
    .filter(
      (job) =>
        job.status === "generated" ||
        job.status === "ready" ||
        job.usdzStatus === "generated" ||
        job.usdzStatus === "ready",
    )
    .map((job) => job.jobId);

  for (const jobId of removedIds) {
    removeSessionGeneratedOutput(jobId);
  }

  return source.filter(
    (job) =>
      job.status !== "generated" &&
      job.status !== "ready" &&
      job.usdzStatus !== "generated" &&
      job.usdzStatus !== "ready",
  );
}

export function clearFailedJobs(jobs) {
  return stableDedupe(
    (jobs || []).filter(
      (job) => job?.status !== "failed" && job?.usdzStatus !== "failed",
    ),
  );
}

export function setSessionGeneratedOutput(jobId, output, format = "glb") {
  const key = outputKey(jobId, format);
  if (!String(jobId || "").trim() || !output?.objectUrl) return;

  removeSessionGeneratedOutput(jobId, format);
  SESSION_GENERATED_OUTPUTS.set(key, output);
}

export function getSessionGeneratedOutput(jobId, format = "glb") {
  const key = outputKey(jobId, format);
  if (!String(jobId || "").trim()) return null;
  return SESSION_GENERATED_OUTPUTS.get(key) || null;
}

export function removeSessionGeneratedOutput(jobId, format = null) {
  const baseId = String(jobId || "").trim();
  if (!baseId) return;

  if (format) {
    const key = outputKey(baseId, format);
    const existing = SESSION_GENERATED_OUTPUTS.get(key);
    if (existing?.objectUrl) {
      URL.revokeObjectURL(existing.objectUrl);
    }
    SESSION_GENERATED_OUTPUTS.delete(key);
    return;
  }

  for (const key of Array.from(SESSION_GENERATED_OUTPUTS.keys())) {
    if (!key.startsWith(`${baseId}::`)) continue;
    const existing = SESSION_GENERATED_OUTPUTS.get(key);
    if (existing?.objectUrl) {
      URL.revokeObjectURL(existing.objectUrl);
    }
    SESSION_GENERATED_OUTPUTS.delete(key);
  }
}

export function mergeHostedAssetStateWithLocalJobs(variants, jobs) {
  const safeVariants = Array.isArray(variants) ? variants : [];
  const safeJobs = stableDedupe(jobs || []);
  const jobsByAssetKey = new Map(
    safeJobs.map((job) => [job.assetKey, job]),
  );

  return safeVariants.map((variant) => {
    const job = jobsByAssetKey.get(variant.assetKey) || null;
    const hostedReady = String(variant.hostedStatus || "")
      .trim()
      .toLowerCase() === "ready";

    let status = "missing";
    if (hostedReady) status = "ready";
    else if (job) status = normalizeStatus(job.status);

    return {
      ...variant,
      status,
      jobId: job?.jobId || variant.assetKey,
      fileName: job?.fileName || "",
      sizeBytes: Number.isFinite(job?.sizeBytes) ? job.sizeBytes : null,
      error: job?.error || "",
      updatedAt: job?.updatedAt || null,
      hasSessionOutput: Boolean(
        getSessionGeneratedOutput(job?.jobId || variant.assetKey, "glb"),
      ),
      usdzStatus: job?.usdzStatus || "missing",
      usdzFileName: job?.usdzFileName || "",
      usdzSizeBytes: Number.isFinite(job?.usdzSizeBytes) ? job.usdzSizeBytes : null,
      usdzError: job?.usdzError || "",
      usdzExportProfileMode: job?.usdzExportProfileMode || "",
      usdzTextureOptimized: job?.usdzTextureOptimized === true,
      usdzWallPlacementMode: job?.usdzWallPlacementMode || "",
      usdzPivotStrategy: job?.usdzPivotStrategy || "",
      usdzInitialTransformPreset: job?.usdzInitialTransformPreset || "",
      usdzInteractionIntent: job?.usdzInteractionIntent || "",
      usdzWallFirstTuned: job?.usdzWallFirstTuned === true,
      usdzExperimentMode: job?.usdzExperimentMode === true,
      usdzOrientationBias: job?.usdzOrientationBias || "",
      hasUsdzSessionOutput: Boolean(
        getSessionGeneratedOutput(job?.jobId || variant.assetKey, "usdz"),
      ),
    };
  });
}
