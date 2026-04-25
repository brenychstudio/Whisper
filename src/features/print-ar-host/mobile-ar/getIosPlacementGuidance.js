export function getIosPlacementGuidance(input = {}) {
  const lowLight = input.lowLight === true;
  const objectFirst = input.preferObjectModeFirst !== false;
  const heavyAsset = input.heavyAsset === true;
  const wallFirst = input.wallFirst !== false;
  const experimentMode = input.experimentMode === true;

  const tips = [];

  if (lowLight) {
    tips.push("Use brighter light so wall/plane detection can lock faster.");
  } else {
    tips.push("Good ambient light helps Quick Look hold wall tracking.");
  }

  if (wallFirst) {
    tips.push(
      experimentMode
        ? "This iOS export is pre-oriented for wall placement as an experiment."
        : "This iOS export is tuned for wall-facing placement first.",
    );
  }

  if (objectFirst) {
    tips.push("Use object mode mainly for inspection, then relaunch AR if needed.");
  }

  tips.push("Face the wall more squarely and move the device slowly during scan.");

  if (heavyAsset) {
    tips.push("This USDZ is heavy; initial load and wall lock can take longer.");
  }

  return tips.slice(0, 4);
}
