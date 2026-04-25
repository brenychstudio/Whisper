import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportPrintSceneToGlb } from "../export/exportPrintSceneToGlb.js";
import { exportPrintSceneToUsdz } from "../export/exportPrintSceneToUsdz.js";
import { validateHostedAsset } from "../mobile-ar/validateHostedAsset.js";
import { validateHostedIosAsset } from "../mobile-ar/validateHostedIosAsset.js";
import {
  buildHostedArManifestBatchPatch,
  buildHostedArManifestSingleEntryPatch,
} from "../../../integrations/print-ar-preview/buildHostedArManifestPatch.js";
import {
  buildIosManifestBatchPatch,
  buildIosManifestSingleEntryPatch,
} from "../../../integrations/print-ar-preview/buildIosManifestPatch.js";
import { getHostedArAssetRecord } from "../../../integrations/print-ar-preview/resolveHostedArAssetRecord.js";
import { resolveHostedArAssetHealth } from "../../../integrations/print-ar-preview/resolveHostedArAssetHealth.js";
import {
  clearCompletedJobs,
  clearFailedJobs,
  getSessionGeneratedOutput,
  loadGenerationJobs,
  markJobFailed,
  markJobGenerated,
  markJobGenerating,
  markUsdzFailed,
  markUsdzGenerated,
  markUsdzGenerating,
  mergeHostedAssetStateWithLocalJobs,
  removeJob,
  saveGenerationJobs,
  setSessionGeneratedOutput,
  upsertQueuedJob,
} from "./arGenerationStore.js";

function formatBytes(value) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

async function copyText(text) {
  if (!text) return false;

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

function toJobInput(row) {
  return {
    jobId: row.assetKey,
    assetKey: row.assetKey,
    productId: row.productId,
    printId: row.printId,
    title: row.title,
    sizeLabel: row.sizeLabel,
    plannedGlbPath: row.plannedGlbPath,
    plannedUsdzPath: row.plannedUsdzPath,
  };
}

function fileNameFromPath(path) {
  const chunks = String(path || "").split("/");
  return chunks[chunks.length - 1] || "";
}

function getUsdzSizeTierFromBytes(sizeBytes) {
  if (!Number.isFinite(sizeBytes)) return "unknown";
  if (sizeBytes > 16 * 1024 * 1024) return "hard-limit-risk";
  if (sizeBytes > 10 * 1024 * 1024) return "heavy";
  return "ok";
}

function getPlatformReadiness(health) {
  if (health.androidLaunchReady && health.iosLaunchReady) {
    return "both-ready";
  }
  if (health.androidLaunchReady) {
    return "android-ready-only";
  }
  if (health.iosLaunchReady) {
    return "ios-ready-only";
  }
  return "neither-ready";
}

function getMismatchNotes(row) {
  const notes = [];

  if (row.health.manifestStatus === "ready" && row.health.reachable === false) {
    notes.push("Manifest ready, GLB unreachable");
  }

  if (row.health.manifestStatus === "ready" && row.health.iosDeclared && row.health.iosReachable === false) {
    notes.push("Manifest ready, USDZ unreachable");
  }

  if ((row.status === "generated" || row.hasSessionOutput) && !row.health.manifestDeclared) {
    notes.push("Local GLB generated, not attached");
  }

  if ((row.usdzStatus === "generated" || row.hasUsdzSessionOutput) && !row.health.iosLaunchReady) {
    notes.push("Local USDZ generated, manual attach still pending");
  }

  if (row.health.manifestDeclared && row.health.reachable === true && !row.health.androidEnabled) {
    notes.push("Attached GLB reachable, Android disabled");
  }

  if (row.health.iosDeclared && row.health.iosReachable === true && !row.health.iosEnabled) {
    notes.push("Attached USDZ reachable, iPhone/iPad disabled");
  }

  if (!row.health.manifestDeclared) {
    notes.push("Manifest missing");
  }

  if (!row.health.iosDeclared) {
    notes.push("USDZ not attached");
  }

  if (row.usdzSizeTier === "heavy" || row.usdzSizeTier === "hard-limit-risk") {
    notes.push("Local USDZ is heavy; Quick Look retest may need lighter export.");
  }

  if (row.localUsdzGenerated && !row.usdzWallFirstTuned) {
    notes.push("Local USDZ predates wall-first orientation/pivot tuning.");
  }

  if (row.localUsdzGenerated && row.usdzExperimentMode) {
    notes.push("Experimental wall-first Quick Look export generated.");
  }

  if (row.health.tooHeavy) {
    notes.push("Heavy GLB warning");
  }

  return Array.from(new Set([
    ...notes,
    ...row.health.issues,
    ...row.health.iosIssues,
  ]));
}

function rowMatchesFilter(row, filterId) {
  if (filterId === "generated-local") {
    return row.status === "generated" || row.hasSessionOutput || row.usdzStatus === "generated" || row.hasUsdzSessionOutput;
  }

  if (filterId === "usdz-generated") {
    return row.usdzStatus === "generated" || row.hasUsdzSessionOutput;
  }

  if (filterId === "ios-heavy") {
    return row.usdzSizeTier === "heavy" || row.usdzSizeTier === "hard-limit-risk" || row.health.iosTooHeavy;
  }

  if (filterId === "ios-ready") {
    return row.health.iosLaunchReady;
  }

  if (filterId === "ios-missing") {
    return !row.health.iosDeclared || row.health.iosValidationStatus === "missing";
  }

  if (filterId === "ready-for-ipad-test") {
    return row.readyForIpadTest;
  }

  if (filterId === "retest-candidates") {
    return row.retestCandidate;
  }

  if (filterId === "wall-first-experiment") {
    return row.usdzExperimentMode;
  }

  if (filterId === "old-balanced-exports") {
    return row.oldBalancedExport;
  }

  if (filterId === "needs-final-decision") {
    return row.needsFinalDecision;
  }

  if (filterId === "wall-first-tuned") {
    return row.usdzWallFirstTuned;
  }

  if (filterId === "old-ios-exports") {
    return row.oldIosExport;
  }

  if (filterId === "needs-re-export") {
    return row.needsReExport;
  }

  if (filterId === "android-only") {
    return row.platformReadiness === "android-ready-only";
  }

  if (filterId === "both-ready") {
    return row.platformReadiness === "both-ready";
  }

  if (filterId === "errors") {
    return row.health.combinedLevel === "error" || row.usdzStatus === "failed";
  }

  return true;
}

function resolveRowsByAssetKeys(rowsByAssetKey, assetKeys) {
  const keys = Array.isArray(assetKeys) ? assetKeys : [];
  return keys
    .map((assetKey) => rowsByAssetKey.get(assetKey))
    .filter(Boolean);
}

function canBuildIosPatch(row) {
  return Boolean(row && (row.localUsdzGenerated || row.health?.iosDeclared));
}

function canBuildCombinedPatch(row) {
  return Boolean(
    row &&
      (
        row.localGlbGenerated ||
        row.health?.fileDeclared ||
        row.localUsdzGenerated ||
        row.health?.iosDeclared
      ),
  );
}

export function useVariantGenerationWorkflow(variants, options = {}) {
  const healthValidationEnabled = options.healthValidationEnabled !== false;
  const [jobs, setJobs] = useState(() => loadGenerationJobs());
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeUsdzJobId, setActiveUsdzJobId] = useState(null);
  const [healthByAssetKey, setHealthByAssetKey] = useState({});
  const generatingJobRef = useRef(null);
  const generatingUsdzJobRef = useRef(null);
  const androidValidationCacheRef = useRef(new Map());
  const iosValidationCacheRef = useRef(new Map());
  const healthRunRef = useRef(0);

  const baseRows = useMemo(
    () => mergeHostedAssetStateWithLocalJobs(variants, jobs),
    [variants, jobs],
  );

  useEffect(() => {
    const baseHealth = {};

    for (const row of baseRows) {
      const record = getHostedArAssetRecord(row.assetKey);
      baseHealth[row.assetKey] = resolveHostedArAssetHealth(row.assetKey, {
        record,
        androidValidation: null,
        iosValidation: null,
      });
    }

    setHealthByAssetKey(baseHealth);

    if (!healthValidationEnabled || !baseRows.length) {
      return undefined;
    }

    let isActive = true;
    const runId = healthRunRef.current + 1;
    healthRunRef.current = runId;

    async function runHealthChecks() {
      for (const row of baseRows) {
        if (!isActive || healthRunRef.current !== runId) return;

        const record = getHostedArAssetRecord(row.assetKey);

        if (!record?.glbUrl && !record?.iosSrc) {
          setHealthByAssetKey((prev) => ({
            ...prev,
            [row.assetKey]: resolveHostedArAssetHealth(row.assetKey, {
              record,
              androidValidation: null,
              iosValidation: null,
            }),
          }));
          continue;
        }

        const androidCacheKey = `${row.assetKey}::android::${record?.glbUrl || ""}`;
        const iosCacheKey = `${row.assetKey}::ios::${record?.iosSrc || ""}`;

        const validations = await Promise.all([
          record?.glbUrl
            ? (async () => {
                let validation = androidValidationCacheRef.current.get(androidCacheKey);
                if (!validation) {
                  validation = await validateHostedAsset(record.glbUrl);
                  androidValidationCacheRef.current.set(androidCacheKey, validation);
                }
                return validation;
              })()
            : Promise.resolve(null),
          record?.iosSrc
            ? (async () => {
                let validation = iosValidationCacheRef.current.get(iosCacheKey);
                if (!validation) {
                  validation = await validateHostedIosAsset(record.iosSrc);
                  iosValidationCacheRef.current.set(iosCacheKey, validation);
                }
                return validation;
              })()
            : Promise.resolve(null),
        ]);

        if (!isActive || healthRunRef.current !== runId) return;

        const [androidValidation, iosValidation] = validations;

        setHealthByAssetKey((prev) => ({
          ...prev,
          [row.assetKey]: resolveHostedArAssetHealth(row.assetKey, {
            record,
            androidValidation,
            iosValidation,
          }),
        }));
      }
    }

    void runHealthChecks();

    return () => {
      isActive = false;
    };
  }, [baseRows, healthValidationEnabled]);

  const rows = useMemo(
    () =>
      baseRows.map((row) => {
        const usdzOutput = getSessionGeneratedOutput(row.jobId || row.assetKey, "usdz");
        const health =
          healthByAssetKey[row.assetKey] ||
          resolveHostedArAssetHealth(row.assetKey, {
            record: getHostedArAssetRecord(row.assetKey),
            androidValidation: null,
            iosValidation: null,
          });

        const localGlbGenerated = row.status === "generated" || row.hasSessionOutput;
        const localUsdzGenerated = row.usdzStatus === "generated" || row.hasUsdzSessionOutput;
        const usdzSizeTier =
          usdzOutput?.sizeTier ||
          getUsdzSizeTierFromBytes(
            Number.isFinite(row.usdzSizeBytes) ? row.usdzSizeBytes : health.iosBytes,
          );
        const usdzTextureStrategy = usdzOutput?.textureStrategy || "unknown";
        const usdzQualityWarnings = Array.isArray(usdzOutput?.qualityWarnings)
          ? usdzOutput.qualityWarnings
          : [];
        const usdzAnchoringAlignment = usdzOutput?.anchoringUsed?.alignment || "vertical";
        const usdzWallPlacementMode =
          usdzOutput?.wallPlacement?.mode || row.usdzWallPlacementMode || "unknown";
        const usdzPivotStrategy =
          usdzOutput?.pivotNormalization?.strategy || row.usdzPivotStrategy || "unknown";
        const usdzInitialTransformPreset =
          usdzOutput?.initialTransform?.preset || row.usdzInitialTransformPreset || "unknown";
        const usdzInteractionIntent =
          usdzOutput?.wallPlacement?.interactionIntent ||
          row.usdzInteractionIntent ||
          "wall-art-preview";
        const usdzExperimentMode =
          usdzOutput?.wallFirstExperimentEnabled === true ||
          row.usdzExperimentMode === true;
        const usdzOrientationBias =
          usdzOutput?.wallPlacement?.orientationBias ||
          row.usdzOrientationBias ||
          "unknown";
        const usdzWallFirstTuned =
          (usdzWallPlacementMode === "wall-first" ||
            usdzWallPlacementMode === "wall-first-experiment") &&
          usdzPivotStrategy !== "unknown" &&
          usdzInitialTransformPreset !== "unknown";
        const oldBalancedExport =
          localUsdzGenerated &&
          !usdzExperimentMode &&
          (usdzInitialTransformPreset === "balanced" ||
            row.usdzExportProfileMode === "balanced");
        const iosHeavy = usdzSizeTier === "heavy" || usdzSizeTier === "hard-limit-risk" || health.iosTooHeavy;
        const oldIosExport = localUsdzGenerated && !usdzWallFirstTuned;
        const needsReExport =
          localUsdzGenerated &&
          (iosHeavy || usdzTextureStrategy === "source-url" || oldIosExport);
        const needsFinalDecision = usdzExperimentMode && localUsdzGenerated;
        const retestCandidate = Boolean(
          (localUsdzGenerated && !needsReExport && usdzWallFirstTuned) ||
          (health.iosLaunchReady && !health.iosTooHeavy),
        );

        const rowWithDerived = {
          ...row,
          health,
          platformReadiness: getPlatformReadiness(health),
          localGlbGenerated,
          localUsdzGenerated,
          readyForIpadTest: health.iosLaunchReady || localUsdzGenerated,
          retestCandidate,
          needsReExport,
          usdzSizeTier,
          usdzTextureStrategy,
          usdzQualityWarnings,
          usdzAnchoringAlignment,
          usdzWallPlacementMode,
          usdzPivotStrategy,
          usdzInitialTransformPreset,
          usdzInteractionIntent,
          usdzExperimentMode,
          usdzOrientationBias,
          usdzWallFirstTuned,
          oldBalancedExport,
          oldIosExport,
          needsFinalDecision,
        };

        return {
          ...rowWithDerived,
          mismatchNotes: getMismatchNotes(rowWithDerived),
        };
      }),
    [baseRows, healthByAssetKey],
  );

  const rowsByAssetKey = useMemo(
    () => new Map(rows.map((row) => [row.assetKey, row])),
    [rows],
  );

  const queuedRows = useMemo(
    () => rows.filter((row) => row.status === "queued"),
    [rows],
  );

  const generatedRows = useMemo(
    () => rows.filter((row) => row.localGlbGenerated),
    [rows],
  );

  const generatedUsdzRows = useMemo(
    () => rows.filter((row) => row.localUsdzGenerated),
    [rows],
  );

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      androidReady: 0,
      iosReady: 0,
      bothReady: 0,
      androidOnly: 0,
      iosOnly: 0,
      neitherReady: 0,
      manifestMissing: 0,
      unreachable: 0,
      iosMissing: 0,
      glbGenerated: 0,
      usdzGenerated: 0,
      readyForIpadTest: 0,
      iosHeavy: 0,
      retestCandidates: 0,
      experimentExports: 0,
      oldBalancedExports: 0,
      needsFinalDecision: 0,
      wallFirstTuned: 0,
      oldIosExports: 0,
      needsReExport: 0,
      heavy: 0,
      disabled: 0,
      warnings: 0,
      errors: 0,
      queued: 0,
      generating: 0,
      generated: 0,
      failed: 0,
    };

    for (const row of rows) {
      if (counts[row.status] !== undefined) {
        counts[row.status] += 1;
      }

      if (row.health.androidLaunchReady) counts.androidReady += 1;
      if (row.health.iosLaunchReady) counts.iosReady += 1;
      if (row.platformReadiness === "both-ready") counts.bothReady += 1;
      if (row.platformReadiness === "android-ready-only") counts.androidOnly += 1;
      if (row.platformReadiness === "ios-ready-only") counts.iosOnly += 1;
      if (row.platformReadiness === "neither-ready") counts.neitherReady += 1;
      if (!row.health.manifestDeclared || row.health.manifestStatus === "missing") counts.manifestMissing += 1;
      if (
        (row.health.reachable === false && row.health.fileDeclared) ||
        (row.health.iosReachable === false && row.health.iosDeclared)
      ) {
        counts.unreachable += 1;
      }
      if (!row.health.iosDeclared) counts.iosMissing += 1;
      if (row.localGlbGenerated) counts.glbGenerated += 1;
      if (row.localUsdzGenerated) counts.usdzGenerated += 1;
      if (row.readyForIpadTest) counts.readyForIpadTest += 1;
      if (row.usdzSizeTier === "heavy" || row.usdzSizeTier === "hard-limit-risk" || row.health.iosTooHeavy) {
        counts.iosHeavy += 1;
      }
      if (row.retestCandidate) counts.retestCandidates += 1;
      if (row.usdzExperimentMode) counts.experimentExports += 1;
      if (row.oldBalancedExport) counts.oldBalancedExports += 1;
      if (row.needsFinalDecision) counts.needsFinalDecision += 1;
      if (row.usdzWallFirstTuned) counts.wallFirstTuned += 1;
      if (row.oldIosExport) counts.oldIosExports += 1;
      if (row.needsReExport) counts.needsReExport += 1;
      if (row.health.tooHeavy) counts.heavy += 1;
      if (
        row.health.manifestStatus === "disabled" ||
        !row.health.androidEnabled ||
        !row.health.iosEnabled
      ) {
        counts.disabled += 1;
      }
      if (row.health.combinedLevel === "warn") counts.warnings += 1;
      if (row.health.combinedLevel === "error" || row.usdzStatus === "failed") counts.errors += 1;
    }

    return counts;
  }, [rows]);

  const filterCounts = useMemo(
    () => ({
      all: rows.length,
      "generated-local": rows.filter((row) => rowMatchesFilter(row, "generated-local")).length,
      "usdz-generated": rows.filter((row) => rowMatchesFilter(row, "usdz-generated")).length,
      "ios-heavy": rows.filter((row) => rowMatchesFilter(row, "ios-heavy")).length,
      "ios-ready": rows.filter((row) => rowMatchesFilter(row, "ios-ready")).length,
      "ios-missing": rows.filter((row) => rowMatchesFilter(row, "ios-missing")).length,
      "ready-for-ipad-test": rows.filter((row) => rowMatchesFilter(row, "ready-for-ipad-test")).length,
      "retest-candidates": rows.filter((row) => rowMatchesFilter(row, "retest-candidates")).length,
      "wall-first-experiment": rows.filter((row) => rowMatchesFilter(row, "wall-first-experiment")).length,
      "old-balanced-exports": rows.filter((row) => rowMatchesFilter(row, "old-balanced-exports")).length,
      "needs-final-decision": rows.filter((row) => rowMatchesFilter(row, "needs-final-decision")).length,
      "wall-first-tuned": rows.filter((row) => rowMatchesFilter(row, "wall-first-tuned")).length,
      "old-ios-exports": rows.filter((row) => rowMatchesFilter(row, "old-ios-exports")).length,
      "needs-re-export": rows.filter((row) => rowMatchesFilter(row, "needs-re-export")).length,
      "android-only": rows.filter((row) => rowMatchesFilter(row, "android-only")).length,
      "both-ready": rows.filter((row) => rowMatchesFilter(row, "both-ready")).length,
      errors: rows.filter((row) => rowMatchesFilter(row, "errors")).length,
    }),
    [rows],
  );

  const getRowsByFilter = useCallback(
    (filterId) => rows.filter((row) => rowMatchesFilter(row, filterId)),
    [rows],
  );

  const updateJobs = useCallback((updater) => {
    setJobs((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return saveGenerationJobs(next);
    });
  }, []);

  const queueVariant = useCallback(
    (assetKey) => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row || row.health.androidLaunchReady || row.status === "generating") {
        return false;
      }

      updateJobs((prev) => upsertQueuedJob(prev, toJobInput(row)));
      return true;
    },
    [rowsByAssetKey, updateJobs],
  );

  const queueVariants = useCallback(
    (assetKeys) => {
      const keys = Array.isArray(assetKeys) ? assetKeys : [];
      let queuedCount = 0;

      updateJobs((prev) => {
        let next = prev;

        for (const assetKey of keys) {
          const row = rowsByAssetKey.get(assetKey);
          if (!row || row.health.androidLaunchReady || row.status === "generating") {
            continue;
          }

          next = upsertQueuedJob(next, toJobInput(row));
          queuedCount += 1;
        }

        return next;
      });

      return queuedCount;
    },
    [rowsByAssetKey, updateJobs],
  );

  const generateVariant = useCallback(
    async (assetKey) => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row || !row.payload || row.health.androidLaunchReady) {
        return false;
      }

      if (generatingJobRef.current || generatingUsdzJobRef.current) {
        return false;
      }

      const jobId = row.jobId || row.assetKey;
      generatingJobRef.current = jobId;
      setActiveJobId(jobId);

      updateJobs((prev) => {
        const queued = upsertQueuedJob(prev, toJobInput(row));
        return markJobGenerating(queued, jobId);
      });

      try {
        const output = await exportPrintSceneToGlb(row.payload);
        setSessionGeneratedOutput(jobId, output, "glb");
        updateJobs((prev) => markJobGenerated(prev, jobId, output));
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "GLB generation failed.";
        updateJobs((prev) => markJobFailed(prev, jobId, message));
        return false;
      } finally {
        generatingJobRef.current = null;
        setActiveJobId(null);
      }
    },
    [rowsByAssetKey, updateJobs],
  );

  const generateUsdzVariant = useCallback(
    async (assetKey, options = {}) => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row || !row.payload) {
        return false;
      }

      if (generatingUsdzJobRef.current || generatingJobRef.current) {
        return false;
      }

      const jobId = row.jobId || row.assetKey;
      generatingUsdzJobRef.current = jobId;
      setActiveUsdzJobId(jobId);

      updateJobs((prev) => {
        const queued = upsertQueuedJob(prev, toJobInput(row));
        return markUsdzGenerating(queued, jobId);
      });

      try {
        const output = await exportPrintSceneToUsdz(row.payload, {
          mode: options.mode || "wall-first-experiment",
        });
        setSessionGeneratedOutput(jobId, output, "usdz");
        updateJobs((prev) => markUsdzGenerated(prev, jobId, output));
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "USDZ generation failed.";
        updateJobs((prev) => markUsdzFailed(prev, jobId, message));
        return false;
      } finally {
        generatingUsdzJobRef.current = null;
        setActiveUsdzJobId(null);
      }
    },
    [rowsByAssetKey, updateJobs],
  );

  const generateNextQueued = useCallback(async () => {
    if (generatingJobRef.current || generatingUsdzJobRef.current) return false;
    const next = queuedRows[0];
    if (!next) return false;
    return generateVariant(next.assetKey);
  }, [queuedRows, generateVariant]);

  const removeVariantJob = useCallback(
    (assetKey) => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row) return false;
      updateJobs((prev) => removeJob(prev, row.jobId || row.assetKey));
      return true;
    },
    [rowsByAssetKey, updateJobs],
  );

  const clearCompleted = useCallback(() => {
    updateJobs((prev) => clearCompletedJobs(prev));
  }, [updateJobs]);

  const clearFailed = useCallback(() => {
    updateJobs((prev) => clearFailedJobs(prev));
  }, [updateJobs]);

  const downloadGeneratedAsset = useCallback(
    (assetKey, format = "glb") => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row) return false;

      const output = getSessionGeneratedOutput(row.jobId || row.assetKey, format);
      if (!output?.objectUrl) return false;

      const link = document.createElement("a");
      link.href = output.objectUrl;
      link.download = output.fileName;
      link.click();
      return true;
    },
    [rowsByAssetKey],
  );

  const copySingleManifestSnippet = useCallback(
    async (assetKey) => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row) return { ok: false, text: "" };

      const text = buildHostedArManifestSingleEntryPatch(row);
      const ok = await copyText(text);
      return { ok, text };
    },
    [rowsByAssetKey],
  );

  const copySingleIosManifestSnippet = useCallback(
    async (assetKey, options = {}) => {
      const row = rowsByAssetKey.get(assetKey);
      if (!row) return { ok: false, text: "" };

      const text = buildIosManifestSingleEntryPatch(row, options);
      const ok = await copyText(text);
      return { ok, text };
    },
    [rowsByAssetKey],
  );

  const copyManifestPatchForGenerated = useCallback(async () => {
    if (!generatedRows.length) return { ok: false, text: "", count: 0 };

    const text = buildHostedArManifestBatchPatch(generatedRows, {
      sortByAssetKey: true,
    });
    const ok = await copyText(text);
    return { ok, text, count: generatedRows.length };
  }, [generatedRows]);

  const copyReadyCandidatesPatch = useCallback(async () => {
    const readyCandidates = rows.filter(
      (row) => row.localGlbGenerated && row.health.manifestStatus !== "ready",
    );

    if (!readyCandidates.length) {
      return { ok: false, text: "", count: 0 };
    }

    const text = buildHostedArManifestBatchPatch(readyCandidates, {
      sortByAssetKey: true,
    });
    const ok = await copyText(text);
    return { ok, text, count: readyCandidates.length };
  }, [rows]);

  const copyIosPatchForAssetKeys = useCallback(
    async (assetKeys, options = {}) => {
      const selectedRows = resolveRowsByAssetKeys(rowsByAssetKey, assetKeys)
        .filter((row) => canBuildIosPatch(row));
      if (!selectedRows.length) {
        return { ok: false, text: "", count: 0 };
      }

      const text = buildIosManifestBatchPatch(selectedRows, {
        sortByAssetKey: true,
        preferGeneratedUsdz: true,
        ...options,
      });
      const ok = await copyText(text);
      return { ok, text, count: selectedRows.length };
    },
    [rowsByAssetKey],
  );

  const copyIosPatchForLocalRows = useCallback(async () => {
    if (!generatedUsdzRows.length) {
      return { ok: false, text: "", count: 0 };
    }

    const text = buildIosManifestBatchPatch(generatedUsdzRows, {
      sortByAssetKey: true,
      preferGeneratedUsdz: true,
    });
    const ok = await copyText(text);
    return { ok, text, count: generatedUsdzRows.length };
  }, [generatedUsdzRows]);

  const copyCombinedPatchForAssetKeys = useCallback(
    async (assetKeys) => {
      const selectedRows = resolveRowsByAssetKeys(rowsByAssetKey, assetKeys)
        .filter((row) => canBuildCombinedPatch(row));
      if (!selectedRows.length) {
        return { ok: false, text: "", count: 0 };
      }

      const text = buildIosManifestBatchPatch(selectedRows, {
        sortByAssetKey: true,
        mode: "combined",
        preferGeneratedGlb: true,
        preferGeneratedUsdz: true,
      });
      const ok = await copyText(text);
      return { ok, text, count: selectedRows.length };
    },
    [rowsByAssetKey],
  );

  const copyCombinedPatchForLocalRows = useCallback(async () => {
    const localRows = rows
      .filter((row) => row.localGlbGenerated || row.localUsdzGenerated)
      .filter((row) => canBuildCombinedPatch(row));
    if (!localRows.length) {
      return { ok: false, text: "", count: 0 };
    }

    const text = buildIosManifestBatchPatch(localRows, {
      sortByAssetKey: true,
      mode: "combined",
      preferGeneratedGlb: true,
      preferGeneratedUsdz: true,
    });
    const ok = await copyText(text);
    return { ok, text, count: localRows.length };
  }, [rows]);

  const copyFileChecklist = useCallback(async () => {
    const localRows = rows.filter((row) => row.localGlbGenerated || row.localUsdzGenerated);
    if (!localRows.length) return { ok: false, text: "", count: 0 };

    const lines = [];

    for (const row of localRows) {
      if (row.localGlbGenerated) {
        const glbOutput = getSessionGeneratedOutput(row.jobId || row.assetKey, "glb");
        const fromName =
          glbOutput?.fileName || row.fileName || fileNameFromPath(row.plannedGlbPath);
        lines.push(`- GLB: ${fromName} -> public${row.plannedGlbPath || `/generated/${row.assetKey}.glb`}`);
      }

      if (row.localUsdzGenerated) {
        const usdzOutput = getSessionGeneratedOutput(row.jobId || row.assetKey, "usdz");
        const fromName =
          usdzOutput?.fileName || row.usdzFileName || fileNameFromPath(row.plannedUsdzPath);
        lines.push(`- USDZ: ${fromName} -> public${row.plannedUsdzPath || `/generated/${row.assetKey}.usdz`}`);
      }
    }

    const text = [
      "Manual attach checklist for generated assets:",
      ...lines,
      "",
      "After moving files into /public/generated/, paste the matching manifest patch into hostedArAssets.js.",
    ].join("\n");

    const ok = await copyText(text);
    return { ok, text, count: localRows.length };
  }, [rows]);

  const copyHealthReport = useCallback(async () => {
    const problemRows = rows.filter(
      (row) => row.health.combinedLevel !== "ready" || row.usdzStatus === "failed",
    );
    if (!problemRows.length) return { ok: false, text: "", count: 0 };

    const lines = problemRows.map((row) => {
      const notes = row.mismatchNotes.length
        ? row.mismatchNotes.join("; ")
        : "No explicit issue text";
      return `- ${row.assetKey} [${row.health.combinedLevel}] ${notes}`;
    });

    const text = [
      "Hosted AR health report (problem rows):",
      ...lines,
    ].join("\n");

    const ok = await copyText(text);
    return { ok, text, count: problemRows.length };
  }, [rows]);

  const copyIosRetestChecklist = useCallback(async () => {
    const candidates = rows.filter((row) => row.retestCandidate);
    if (!candidates.length) return { ok: false, text: "", count: 0 };

    const lines = candidates.map((row) => {
      const localNote = row.localUsdzGenerated ? "local USDZ ready" : "hosted USDZ ready";
      return `- ${row.assetKey}: ${localNote}; wall=${row.usdzWallPlacementMode}; pivot=${row.usdzPivotStrategy}; preset=${row.usdzInitialTransformPreset}; anchoring=${row.usdzAnchoringAlignment}`;
    });

    const text = [
      "iOS Quick Look retest checklist:",
      "1) Move/attach USDZ to /public/generated/ if still local-only.",
      "2) Confirm manifest iosSrc points to /generated/<assetKey>.usdz.",
      "3) Retest on iPad in brighter light; start in object mode, then AR.",
      ...lines,
    ].join("\n");

    const ok = await copyText(text);
    return { ok, text, count: candidates.length };
  }, [rows]);

  const copyNeedsTunedUsdzReport = useCallback(async () => {
    const needs = rows.filter((row) => row.needsReExport);
    if (!needs.length) return { ok: false, text: "", count: 0 };

    const lines = needs.map((row) => {
      const warnings = row.usdzQualityWarnings.length
        ? row.usdzQualityWarnings.join("; ")
        : "Needs lighter/tuned export";
      return `- ${row.assetKey}: tier=${row.usdzSizeTier}; strategy=${row.usdzTextureStrategy}; wall=${row.usdzWallPlacementMode}; pivot=${row.usdzPivotStrategy}; ${warnings}`;
    });

    const text = [
      "USDZ tuning report (needs re-export):",
      ...lines,
    ].join("\n");

    const ok = await copyText(text);
    return { ok, text, count: needs.length };
  }, [rows]);

  const copyWallPresetReexportReport = useCallback(async () => {
    const needs = rows.filter((row) => row.oldIosExport || row.needsReExport);
    if (!needs.length) return { ok: false, text: "", count: 0 };

    const lines = needs.map((row) => {
      return `- ${row.assetKey}: preset=${row.usdzInitialTransformPreset}; wall=${row.usdzWallPlacementMode}; pivot=${row.usdzPivotStrategy}; recommended=re-export with wall-first preset`;
    });

    const text = [
      "iOS re-export with wall preset report:",
      "Regenerate these variants so Quick Look starts from the wall-first orientation/pivot tuning pass.",
      ...lines,
    ].join("\n");

    const ok = await copyText(text);
    return { ok, text, count: needs.length };
  }, [rows]);

  const copyWallFirstExperimentResultsReport = useCallback(async () => {
    const experimentRows = rows.filter((row) => row.usdzExperimentMode);
    if (!experimentRows.length) return { ok: false, text: "", count: 0 };

    const lines = experimentRows.map((row) => {
      const status = row.retestCandidate ? "retest now" : row.needsReExport ? "re-export" : "review";
      return `- ${row.assetKey}: mode=${row.usdzExportProfileMode || "wall-first-experiment"}; preset=${row.usdzInitialTransformPreset}; wall=${row.usdzWallPlacementMode}; pivot=${row.usdzPivotStrategy}; decision=${status}`;
    });

    const text = [
      "Wall-first experiment results report:",
      "Compare these exports against older balanced USDZs on iPhone/iPad Quick Look.",
      ...lines,
    ].join("\n");

    const ok = await copyText(text);
    return { ok, text, count: experimentRows.length };
  }, [rows]);

  return {
    rows,
    summary,
    filterCounts,
    activeJobId,
    activeUsdzJobId,
    queuedRows,
    generatedRows,
    generatedUsdzRows,
    formatBytes,
    getRowsByFilter,
    queueVariant,
    queueVariants,
    generateVariant,
    generateUsdzVariant,
    generateNextQueued,
    removeVariantJob,
    clearCompleted,
    clearFailed,
    downloadGeneratedAsset,
    copySingleManifestSnippet,
    copySingleIosManifestSnippet,
    copyManifestPatchForGenerated,
    copyReadyCandidatesPatch,
    copyIosPatchForAssetKeys,
    copyIosPatchForLocalRows,
    copyCombinedPatchForAssetKeys,
    copyCombinedPatchForLocalRows,
    copyFileChecklist,
    copyHealthReport,
    copyIosRetestChecklist,
    copyNeedsTunedUsdzReport,
    copyWallPresetReexportReport,
    copyWallFirstExperimentResultsReport,
  };
}
