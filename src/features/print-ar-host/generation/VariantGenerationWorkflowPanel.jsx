import { useEffect, useMemo, useState } from "react";
import { useVariantGenerationWorkflow } from "./useVariantGenerationWorkflow.js";
import "./VariantGenerationWorkflowPanel.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "generated-local", label: "Generated locally" },
  { id: "usdz-generated", label: "USDZ generated" },
  { id: "ios-heavy", label: "iOS heavy" },
  { id: "ios-ready", label: "iOS ready" },
  { id: "ios-missing", label: "iOS missing" },
  { id: "ready-for-ipad-test", label: "Ready for iPad test" },
  { id: "retest-candidates", label: "Retest candidates" },
  { id: "wall-first-experiment", label: "Wall-first experiment" },
  { id: "old-balanced-exports", label: "Old balanced exports" },
  { id: "needs-final-decision", label: "Needs final decision" },
  { id: "wall-first-tuned", label: "Wall-first tuned" },
  { id: "old-ios-exports", label: "Old iOS exports" },
  { id: "needs-re-export", label: "Needs re-export" },
  { id: "both-ready", label: "Both ready" },
  { id: "errors", label: "Errors" },
];

function normalizeSizeKey(value) {
  return String(value || "")
    .trim()
    .replace(/x/g, "x")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function localStatusLabel(status) {
  if (status === "ready") return "Android hosted ready";
  if (status === "missing") return "Missing";
  if (status === "queued") return "Queued";
  if (status === "generating") return "Generating";
  if (status === "generated") return "Generated";
  if (status === "failed") return "Failed";
  return "Unknown";
}

function localUsdzStatusLabel(row) {
  if (row.health.iosLaunchReady) return "Hosted Quick Look ready";
  if (row.usdzStatus === "generating") return "Generating";
  if (row.localUsdzGenerated) return "Generated locally";
  if (row.usdzStatus === "failed") return "Generation failed";
  return "Not generated";
}

function hostedStatusLabel(row) {
  if (row.platformReadiness === "both-ready") return "Both launch-ready";
  if (row.platformReadiness === "android-ready-only") return "Android ready only";
  if (row.platformReadiness === "ios-ready-only") return "iPhone/iPad ready only";
  if (row.health.combinedLevel === "error") return "Platform error";
  return "Not fully ready";
}

function iosStatusLabel(row) {
  if (row.health.iosLaunchReady) return "Quick Look ready";
  if (!row.health.iosDeclared) return "USDZ missing";
  if (!row.health.iosEnabled || row.health.manifestStatus === "disabled") return "iOS disabled";
  if (row.health.iosValidationStatus === "invalid") return "USDZ invalid";
  if (row.health.iosReachable === false) return "USDZ unreachable";
  return "Checking";
}

function platformStateLabel(value) {
  if (value === "both-ready") return "Android + iPhone/iPad ready";
  if (value === "android-ready-only") return "Android ready only";
  if (value === "ios-ready-only") return "iPhone/iPad ready only";
  return "Neither platform ready";
}

function localStatusClass(status) {
  return `ar-workflow-status ar-workflow-status--${status || "missing"}`;
}

function hostedStatusClass(level) {
  return `ar-workflow-health ar-workflow-health--${level || "warn"}`;
}

function platformStateClass(value) {
  return `ar-workflow-platform ar-workflow-platform--${value || "neither-ready"}`;
}

export default function VariantGenerationWorkflowPanel({
  isOpen,
  onClose,
  catalog,
  catalogLoading,
  catalogError,
  activePrintId,
  activeSizeKey,
  filteredPrintIds,
  focusedAssetKey,
}) {
  const workflow = useVariantGenerationWorkflow(catalog, {
    healthValidationEnabled: isOpen,
  });
  const [selectedAssetKey, setSelectedAssetKey] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [notice, setNotice] = useState("");

  const filteredIdsSet = useMemo(
    () => new Set(Array.isArray(filteredPrintIds) ? filteredPrintIds : []),
    [filteredPrintIds],
  );

  const currentVariantAssetKey = useMemo(() => {
    if (focusedAssetKey) {
      const focused = workflow.rows.find((row) => row.assetKey === focusedAssetKey);
      if (focused) return focused.assetKey;
    }

    if (!activePrintId) return "";

    const sizeKey = normalizeSizeKey(activeSizeKey);
    const exact = workflow.rows.find((row) => {
      if (row.printId !== activePrintId) return false;
      if (!sizeKey) return false;

      return (
        normalizeSizeKey(row.requestedSizeKey) === sizeKey ||
        normalizeSizeKey(row.sizeKey) === sizeKey ||
        normalizeSizeKey(row.sizeLabel) === sizeKey
      );
    });

    if (exact) return exact.assetKey;

    const fallback = workflow.rows.find((row) => row.printId === activePrintId);
    return fallback?.assetKey || "";
  }, [focusedAssetKey, activePrintId, activeSizeKey, workflow.rows]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedAssetKey && currentVariantAssetKey) {
      setSelectedAssetKey(currentVariantAssetKey);
      return;
    }

    if (
      selectedAssetKey &&
      !workflow.rows.some((row) => row.assetKey === selectedAssetKey)
    ) {
      setSelectedAssetKey("");
    }
  }, [isOpen, selectedAssetKey, currentVariantAssetKey, workflow.rows]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEsc = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const rowsInActiveFilter = useMemo(
    () => workflow.getRowsByFilter(activeFilter),
    [workflow, activeFilter],
  );

  const visibleAssetKeys = useMemo(
    () => rowsInActiveFilter.map((row) => row.assetKey),
    [rowsInActiveFilter],
  );

  const selectedRow = useMemo(
    () => workflow.rows.find((row) => row.assetKey === selectedAssetKey) || null,
    [workflow.rows, selectedAssetKey],
  );

  if (!isOpen) return null;

  const queueCurrentVariant = () => {
    if (!currentVariantAssetKey) return;
    const ok = workflow.queueVariant(currentVariantAssetKey);
    setNotice(ok ? "Current variant queued." : "Current variant was not queued.");
  };

  const queueAllSizesOfCurrentPrint = () => {
    if (!activePrintId) return;

    const keys = workflow.rows
      .filter((row) => row.printId === activePrintId && !row.health.androidLaunchReady)
      .map((row) => row.assetKey);

    const count = workflow.queueVariants(keys);
    setNotice(count ? `${count} variant(s) queued.` : "Nothing to queue for this print.");
  };

  const queueMissingFromFiltered = () => {
    const keys = workflow.rows
      .filter(
        (row) =>
          filteredIdsSet.has(row.printId) &&
          (!row.health.manifestDeclared || row.health.manifestStatus !== "ready"),
      )
      .map((row) => row.assetKey);

    const count = workflow.queueVariants(keys);
    setNotice(
      count
        ? `${count} missing variant(s) queued.`
        : "No missing variants in current filtered scope.",
    );
  };

  const handleCopyGeneratedPatch = async () => {
    const result = await workflow.copyManifestPatchForGenerated();
    setNotice(
      result.ok
        ? `Copied Android manifest patch (${result.count}).`
        : "Nothing to copy yet. Generate at least one local GLB first.",
    );
  };

  const handleCopyReadyCandidates = async () => {
    const result = await workflow.copyReadyCandidatesPatch();
    setNotice(
      result.ok
        ? `Copied Android ready-candidates patch (${result.count}).`
        : "No ready candidates found.",
    );
  };

  const handleCopyChecklist = async () => {
    const result = await workflow.copyFileChecklist();
    setNotice(
      result.ok
        ? `Copied attach checklist (${result.count}).`
        : "No local generated assets available for attach prep.",
    );
  };

  const handleCopyHealthReport = async () => {
    const result = await workflow.copyHealthReport();
    setNotice(
      result.ok
        ? `Copied health report (${result.count}).`
        : "No problem rows to report.",
    );
  };

  const handleCopyRetestChecklist = async () => {
    const result = await workflow.copyIosRetestChecklist();
    setNotice(
      result.ok
        ? `Copied iOS retest checklist (${result.count}).`
        : "No iOS retest candidates yet.",
    );
  };

  const handleCopyNeedsTunedReport = async () => {
    const result = await workflow.copyNeedsTunedUsdzReport();
    setNotice(
      result.ok
        ? `Copied needs-tuning USDZ report (${result.count}).`
        : "No rows currently marked for USDZ re-export.",
    );
  };

  const handleCopyWallPresetReport = async () => {
    const result = await workflow.copyWallPresetReexportReport();
    setNotice(
      result.ok
        ? `Copied wall-preset re-export report (${result.count}).`
        : "No rows currently need wall-first re-export guidance.",
    );
  };

  const handleCopyExperimentResultsReport = async () => {
    const result = await workflow.copyWallFirstExperimentResultsReport();
    setNotice(
      result.ok
        ? `Copied wall-first experiment report (${result.count}).`
        : "No wall-first experiment exports are available yet.",
    );
  };

  const handleCopySelectedIosPatch = async () => {
    if (!selectedAssetKey) return;
    const result = await workflow.copyIosPatchForAssetKeys([selectedAssetKey]);
    setNotice(
      result.ok
        ? "Copied iOS manifest patch for selected row."
        : "Unable to copy iOS patch for selected row.",
    );
  };

  const handleCopyVisibleIosPatch = async () => {
    const result = await workflow.copyIosPatchForAssetKeys(visibleAssetKeys);
    setNotice(
      result.ok
        ? `Copied iOS manifest patch (${result.count}).`
        : "No visible rows to export as iOS patches.",
    );
  };

  const handleCopyCombinedVisiblePatch = async () => {
    const result = await workflow.copyCombinedPatchForAssetKeys(visibleAssetKeys);
    setNotice(
      result.ok
        ? `Copied combined Android+iOS patch (${result.count}).`
        : "No visible rows to export as combined patches.",
    );
  };

  const handleCopyLocalIosPatch = async () => {
    const result = await workflow.copyIosPatchForLocalRows();
    setNotice(
      result.ok
        ? `Copied iOS patch for local USDZ rows (${result.count}).`
        : "No local USDZ rows available for iOS patch prep.",
    );
  };

  const handleCopyLocalCombinedPatch = async () => {
    const result = await workflow.copyCombinedPatchForLocalRows();
    setNotice(
      result.ok
        ? `Copied combined patch for local rows (${result.count}).`
        : "No local rows available for combined patch prep.",
    );
  };

  const handleGenerateSelectedGlb = async () => {
    if (!selectedAssetKey) return;
    const ok = await workflow.generateVariant(selectedAssetKey);
    setNotice(ok ? "GLB generation completed." : "GLB generation did not start.");
  };

  const handleGenerateSelectedUsdz = async () => {
    if (!selectedAssetKey) return;
    const ok = await workflow.generateUsdzVariant(selectedAssetKey, {
      mode: "wall-first-experiment",
    });
    setNotice(
      ok
        ? "Experimental USDZ generation completed."
        : "Experimental USDZ generation did not start.",
    );
  };

  const handleGenerateNext = async () => {
    const ok = await workflow.generateNextQueued();
    setNotice(ok ? "Generated next queued GLB." : "No queued variants to generate.");
  };

  return (
    <div
      className="ar-workflow-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="ar-workflow-panel"
        role="dialog"
        aria-modal="true"
        aria-label="AR generation workflow"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ar-workflow-header">
          <div>
            <div className="ar-workflow-eyebrow">Dev Utility</div>
            <h2>Hosted AR Asset Workflow</h2>
          </div>

          <button
            type="button"
            className="ar-workflow-btn ar-workflow-btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="ar-workflow-body">
          {catalogLoading ? (
            <div className="ar-workflow-state">Building variant catalog...</div>
          ) : null}

          {catalogError ? (
            <div className="ar-workflow-error">{catalogError}</div>
          ) : null}

          {!catalogLoading && !catalogError ? (
            <>
              <div className="ar-workflow-summary">
                <div>Total: {workflow.summary.total}</div>
                <div>Android ready: {workflow.summary.androidReady}</div>
                <div>iPhone/iPad ready: {workflow.summary.iosReady}</div>
                <div>Local GLB: {workflow.summary.glbGenerated}</div>
                <div>Local USDZ: {workflow.summary.usdzGenerated}</div>
                <div>iOS heavy: {workflow.summary.iosHeavy}</div>
                <div>Ready for iPad test: {workflow.summary.readyForIpadTest}</div>
                <div>Retest candidates: {workflow.summary.retestCandidates}</div>
                <div>Experiment exports: {workflow.summary.experimentExports}</div>
                <div>Old balanced exports: {workflow.summary.oldBalancedExports}</div>
                <div>Needs final decision: {workflow.summary.needsFinalDecision}</div>
                <div>Wall-first tuned: {workflow.summary.wallFirstTuned}</div>
                <div>Old iOS exports: {workflow.summary.oldIosExports}</div>
                <div>Needs re-export: {workflow.summary.needsReExport}</div>
                <div>Errors: {workflow.summary.errors}</div>
              </div>

              <div className="ar-workflow-filters">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`ar-workflow-filter ${activeFilter === filter.id ? "is-active" : ""}`}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label} ({workflow.filterCounts[filter.id] || 0})
                  </button>
                ))}
              </div>

              <div className="ar-workflow-actions">
                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={queueCurrentVariant}
                  disabled={!currentVariantAssetKey}
                >
                  Queue current variant
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={queueAllSizesOfCurrentPrint}
                  disabled={!activePrintId}
                >
                  Queue all sizes of current print
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={queueMissingFromFiltered}
                  disabled={!workflow.rows.length}
                >
                  Queue missing from filtered list
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn ar-workflow-btn--ghost"
                  onClick={workflow.clearCompleted}
                >
                  Clear completed
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn ar-workflow-btn--ghost"
                  onClick={workflow.clearFailed}
                >
                  Clear failed
                </button>
              </div>

              <div className="ar-workflow-queue">
                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleGenerateNext}
                  disabled={!workflow.queuedRows.length || !!workflow.activeJobId || !!workflow.activeUsdzJobId}
                >
                  Generate next queued GLB
                </button>

                <select
                  className="ar-workflow-select"
                  value={selectedAssetKey}
                  onChange={(event) => setSelectedAssetKey(event.target.value)}
                >
                  <option value="">Select a variant</option>
                  {workflow.rows.map((row) => (
                    <option key={row.assetKey} value={row.assetKey}>
                      {row.title} / {row.sizeLabel} / {row.assetKey}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleGenerateSelectedGlb}
                  disabled={!selectedAssetKey || !!workflow.activeJobId || !!workflow.activeUsdzJobId}
                >
                  Generate selected GLB
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleGenerateSelectedUsdz}
                  disabled={!selectedAssetKey || !!workflow.activeUsdzJobId || !!workflow.activeJobId}
                >
                  Generate experiment USDZ
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn ar-workflow-btn--ghost"
                  onClick={() => {
                    if (!selectedAssetKey) return;
                    const ok = workflow.removeVariantJob(selectedAssetKey);
                    setNotice(ok ? "Removed from queue/jobs." : "Nothing to remove.");
                  }}
                  disabled={!selectedAssetKey}
                >
                  Remove from queue
                </button>
              </div>

              <div className="ar-workflow-export">
                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyGeneratedPatch}
                >
                  Copy Android patch (generated)
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyReadyCandidates}
                >
                  Copy Android ready-candidates
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopySelectedIosPatch}
                  disabled={!selectedRow || (!selectedRow.localUsdzGenerated && !selectedRow.health.iosDeclared)}
                >
                  Copy iOS patch (selected)
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyVisibleIosPatch}
                  disabled={!visibleAssetKeys.length}
                >
                  Copy iOS patch (visible)
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyCombinedVisiblePatch}
                  disabled={!visibleAssetKeys.length}
                >
                  Copy combined patch (visible)
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyLocalIosPatch}
                >
                  Copy iOS patch (local USDZ rows)
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyLocalCombinedPatch}
                >
                  Copy combined patch (local rows)
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyChecklist}
                >
                  Copy attach checklist
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyHealthReport}
                >
                  Copy health report
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyRetestChecklist}
                >
                  Copy iOS retest checklist
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyNeedsTunedReport}
                >
                  Copy needs lighter USDZ report
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyWallPresetReport}
                >
                  Copy re-export with wall preset report
                </button>

                <button
                  type="button"
                  className="ar-workflow-btn"
                  onClick={handleCopyExperimentResultsReport}
                >
                  Copy wall-first experiment results
                </button>
              </div>

              {notice ? (
                <div className="ar-workflow-notice">{notice}</div>
              ) : null}

              <div className="ar-workflow-list">
                {rowsInActiveFilter.map((row) => (
                  <div key={row.assetKey} className="ar-workflow-row">
                    <div className="ar-workflow-row-head">
                      <div>
                        <strong>{row.title}</strong>
                        <div>{row.sizeLabel}</div>
                        <code>{row.assetKey}</code>
                      </div>
                      <div className="ar-workflow-badges">
                        <span className={localStatusClass(row.status)}>
                          {localStatusLabel(row.status)}
                        </span>
                        <span className={hostedStatusClass(row.health.combinedLevel)}>
                          {hostedStatusLabel(row)}
                        </span>
                        <span className={platformStateClass(row.platformReadiness)}>
                          {platformStateLabel(row.platformReadiness)}
                        </span>
                      </div>
                    </div>

                    <div className="ar-workflow-row-meta">
                      <div>Planned GLB: <code>{row.plannedGlbPath}</code></div>
                      <div>Planned USDZ: <code>{row.plannedUsdzPath}</code></div>
                      {row.glbUrl ? (
                        <div>Hosted GLB: <code>{row.glbUrl}</code></div>
                      ) : null}
                      <div>Hosted USDZ: <code>{row.iosSrc || "not attached"}</code></div>
                      <div>Local GLB state: <strong>{row.localGlbGenerated ? "Generated locally" : localStatusLabel(row.status)}</strong></div>
                      <div>Local USDZ state: <strong>{localUsdzStatusLabel(row)}</strong></div>
                      <div>Android hosted state: <strong>{row.health.androidLaunchReady ? "Launch-ready" : row.health.validationStatus}</strong></div>
                      <div>iPhone/iPad hosted state: <strong>{iosStatusLabel(row)}</strong></div>
                      <div>Ready for iPad attach/test: <strong>{row.readyForIpadTest ? "Yes" : "No"}</strong></div>
                      <div>Recommended action: <strong>{row.needsReExport ? "Regenerate with tuned preset" : row.retestCandidate ? "Ready for iPad retest" : "Attach/validate then retest"}</strong></div>
                      <div>Manifest status: <strong>{row.health.manifestStatus}</strong></div>
                      {row.sizeBytes ? (
                        <div>Generated GLB size: {workflow.formatBytes(row.sizeBytes)}</div>
                      ) : null}
                      {row.usdzSizeBytes ? (
                        <div>Generated USDZ size: {workflow.formatBytes(row.usdzSizeBytes)}</div>
                      ) : null}
                      {row.fileName ? (
                        <div>Generated GLB file: <code>{row.fileName}</code></div>
                      ) : null}
                      {row.usdzFileName ? (
                        <div>Generated USDZ file: <code>{row.usdzFileName}</code></div>
                      ) : null}
                      {row.usdzExportProfileMode ? (
                        <div>USDZ profile: <strong>{row.usdzExportProfileMode}</strong></div>
                      ) : null}
                      <div>Wall placement mode: <strong>{row.usdzWallPlacementMode}</strong></div>
                      <div>Experiment mode: <strong>{row.usdzExperimentMode ? "Active" : "Inactive"}</strong></div>
                      <div>Orientation bias: <strong>{row.usdzOrientationBias}</strong></div>
                      <div>Pivot strategy: <strong>{row.usdzPivotStrategy}</strong></div>
                      <div>Initial transform preset: <strong>{row.usdzInitialTransformPreset}</strong></div>
                      <div>Interaction intent: <strong>{row.usdzInteractionIntent}</strong></div>
                      <div>Wall-first tuned: <strong>{row.usdzWallFirstTuned ? "Yes" : "No"}</strong></div>
                      <div>Regenerated after experiment: <strong>{row.usdzExperimentMode ? "Yes" : "No"}</strong></div>
                      <div>Needs final decision: <strong>{row.needsFinalDecision ? "Yes" : "No"}</strong></div>
                      <div>Object mode role: <strong>{row.usdzWallFirstTuned ? "Secondary inspection" : "Unknown / older export"}</strong></div>
                      <div>USDZ strategy: <strong>{row.usdzTextureStrategy}</strong></div>
                      <div>USDZ size tier: <strong>{row.usdzSizeTier}</strong></div>
                      <div>USDZ anchoring: <strong>{row.usdzAnchoringAlignment}</strong></div>
                      {row.oldIosExport ? (
                        <div className="ar-workflow-row-note">This local USDZ should be regenerated after the wall-first orientation/pivot pass.</div>
                      ) : null}
                      {row.usdzTextureOptimized ? (
                        <div>USDZ texture optimization: <strong>Applied</strong></div>
                      ) : null}
                      {row.usdzQualityWarnings.length ? (
                        <div className="ar-workflow-row-warn">
                          {row.usdzQualityWarnings.map((warning) => (
                            <p key={`${row.assetKey}-warn-${warning}`}>{warning}</p>
                          ))}
                        </div>
                      ) : null}
                      {row.health.bytes ? (
                        <div>Hosted GLB size: {workflow.formatBytes(row.health.bytes)}</div>
                      ) : null}
                      {row.health.iosBytes ? (
                        <div>Hosted USDZ size: {workflow.formatBytes(row.health.iosBytes)}</div>
                      ) : null}
                      {row.health.iosContentType ? (
                        <div>USDZ MIME: <code>{row.health.iosContentType}</code></div>
                      ) : null}
                      {row.error ? (
                        <div className="ar-workflow-row-error">{row.error}</div>
                      ) : null}
                      {row.usdzError ? (
                        <div className="ar-workflow-row-error">{row.usdzError}</div>
                      ) : null}
                      {row.mismatchNotes.length ? (
                        <div className="ar-workflow-row-warn">
                          {row.mismatchNotes.map((note) => (
                            <p key={`${row.assetKey}-${note}`}>{note}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="ar-workflow-row-actions">
                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={() => {
                          const ok = workflow.queueVariant(row.assetKey);
                          setNotice(ok ? "Variant queued." : "Variant was not queued.");
                        }}
                        disabled={row.health.androidLaunchReady || row.status === "generating"}
                      >
                        Queue
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={async () => {
                          const ok = await workflow.generateVariant(row.assetKey);
                          setNotice(ok ? "GLB generation completed." : "GLB generation did not start.");
                        }}
                        disabled={!!workflow.activeJobId || !!workflow.activeUsdzJobId}
                      >
                        Generate GLB
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={async () => {
                          const ok = await workflow.generateUsdzVariant(row.assetKey, {
                            mode: "wall-first-experiment",
                          });
                          setNotice(
                            ok
                              ? "Experimental USDZ generation completed."
                              : "Experimental USDZ generation did not start.",
                          );
                        }}
                        disabled={!!workflow.activeUsdzJobId || !!workflow.activeJobId}
                      >
                        Generate experiment USDZ
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={() => {
                          const ok = workflow.downloadGeneratedAsset(row.assetKey, "glb");
                          setNotice(ok ? "GLB download started." : "No local GLB file for this row.");
                        }}
                        disabled={!row.localGlbGenerated}
                      >
                        Download GLB
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={() => {
                          const ok = workflow.downloadGeneratedAsset(row.assetKey, "usdz");
                          setNotice(ok ? "USDZ download started." : "No local USDZ file for this row.");
                        }}
                        disabled={!row.localUsdzGenerated}
                      >
                        Download USDZ
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={async () => {
                          const result = await workflow.copySingleManifestSnippet(row.assetKey);
                          setNotice(
                            result.ok
                              ? "Android manifest record copied."
                              : "Unable to copy Android manifest record.",
                          );
                        }}
                      >
                        Copy Android record
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={async () => {
                          const result = await workflow.copySingleIosManifestSnippet(row.assetKey, {
                            preferGeneratedUsdz: true,
                          });
                          setNotice(
                            result.ok
                              ? "iOS manifest record copied."
                              : "Unable to copy iOS manifest record.",
                          );
                        }}
                        disabled={!row.localUsdzGenerated && !row.health.iosDeclared}
                      >
                        Copy iOS record
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small"
                        onClick={async () => {
                          const result = await workflow.copyCombinedPatchForAssetKeys([row.assetKey]);
                          setNotice(
                            result.ok
                              ? "Combined Android+iOS record copied."
                              : "Unable to copy combined record.",
                          );
                        }}
                      >
                        Copy combined record
                      </button>

                      <button
                        type="button"
                        className="ar-workflow-btn ar-workflow-btn--small ar-workflow-btn--ghost"
                        onClick={() => {
                          const ok = workflow.removeVariantJob(row.assetKey);
                          setNotice(ok ? "Job removed." : "No job to remove.");
                        }}
                      >
                        Remove job
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="ar-workflow-honesty">
                Generated GLBs and USDZs are browser outputs only. Move files manually into
                <code> /public/generated/ </code>
                , then paste the matching manifest patch into
                <code> hostedArAssets.js </code>
                . The panel helps generation, patch prep, and validation, but it does not claim automatic publishing.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
