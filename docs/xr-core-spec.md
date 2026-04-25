# XRCore — Spec (Freeze)

## Goals
- Separate engine (XR CORE) from project content (XR Experience).
- CORE must depend only on XRManifest (data contract), not on Whisper-specific assets or names.

## Project structure (fixed)
- src/xr-core/
  - runtime/ (XR host, device support, quality)
  - content/ (XRManifest schema + validation)
  - input/ (gaze, ray/select, proximity)
  - locomotion/ (teleport, comfort)
  - narrative/ (beats/state machine, guidance)
  - ui/ (caption rail, collector panel, kiosk shell)
  - fx/ (plug-in effects)
  - utils/ (math, easing, timing)
- src/xr-experiences/whisper/
  - manifest/ (build manifest from src/content/config.js)
  - scene/ (SeaZone, ForestZone, TransitionGate)
  - beats/ (directed sequence)
  - fx/ (whisper-specific wave/pollen)
  - assets/ (paths map only; files live in public)

## XRManifest (contract)
XRManifest = {
  experienceId: string,
  zones: Array<{ id: string, label: string }>,
  artworks: Array<{
    id: string,
    printId: string,
    zoneId: string,
    src: string,
    caption?: string,
    title?: string
  }>,
  beats: Array<{
    id: string,
    zoneId: string,
    artworkPrintId?: string,
    guidance?: { type: "beacon", intensity: number },
    onGaze?: string[],
    onProximity?: string[]
  }>,
  collect: { mode: "qr", shareBasePath: "/p/" }
}