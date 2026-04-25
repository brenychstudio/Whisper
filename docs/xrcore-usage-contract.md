# XRCore Usage Contract — V1.1

## Status
XRCore V1.1 is a reusable runtime baseline extracted from WHISPER XR after the first stable production-style experience.

It is **not** a fully universal engine yet.
It is a **working reusable core baseline** for authorial XR scenes with:
- desktop preview
- VR locomotion
- gate cue
- collector panel
- ambient audio crossfade
- interaction UI shell
- environment shell
- texture helpers

---

## Core vs Experience Boundary

### XRCore owns
XRCore is responsible for reusable runtime systems:

- texture helpers
- ambient audio shell
- collector panel shell
- gate cue helper
- locomotion shell
- interaction UI shell
- environment shell
- base scene/runtime wiring patterns

### Experience layer owns
Each experience is responsible for authored content and authored behavior:

- artwork placement
- sequencing / beats
- gaze progression meaning
- staging curves
- mood color values
- special ambience layers specific to the project
- finale controller behavior
- collector content / copy specifics
- narrative logic

---

## Important Principle

**XRCore should provide systems.**
**Experience layer should provide authored implementation.**

Do not move authored scene-specific behavior into XRCore too early.

---

## Current Extracted Helpers

Current XRCore helper layer:

- `src/xr-core/runtime/helpers/xrTextureHelpers.js`
- `src/xr-core/runtime/helpers/createAmbientAudioSystem.js`
- `src/xr-core/runtime/helpers/createCollectorPanel.js`
- `src/xr-core/runtime/helpers/createGateCue.js`
- `src/xr-core/runtime/helpers/createLocomotionShell.js`
- `src/xr-core/runtime/helpers/createEnvironmentShell.js`
- `src/xr-core/runtime/helpers/createInteractionShell.js`

---

## What is intentionally still NOT in XRCore

The following still stays in the experience runtime:

- `updateCinematicStaging()`
- beat / journey progression logic
- authored artwork visibility logic
- authored mood tuning values
- Whisper-specific sea souls
- Whisper-specific finale behavior
- Whisper-specific collector semantics
- authored scene dramaturgy

This is intentional.

---

## Safe Development Rules

### Rule 1 — preserve working experience
XRCore improvements must never break the currently working experience.

### Rule 2 — extract literally first
When extracting a system:
1. move it 1:1
2. confirm no visual / behavior change
3. refactor only after validation

### Rule 3 — one layer at a time
Do not extract multiple large systems in one pass.

### Rule 4 — experience-first validation
A helper is only considered valid if the actual scene still works in:
- desktop
- VR
- finale path
- collector path
- audio path

### Rule 5 — avoid premature universalization
Do not generalize authored scene behavior until it has been validated across multiple different XR scenes.

---

## What XRCore V1.1 is good for right now

XRCore V1.1 is ready to be used as a baseline for:

- a second authored XR scene
- a new exhibition-like XR experience
- environment-driven XR storytelling prototypes
- desktop + VR gallery-like guided journeys

---

## What XRCore V1.1 is NOT yet

It is not yet:

- a fully universal plug-and-play engine
- a generic CMS-driven XR platform
- a fully abstracted sequencing framework
- a full mobile/gyro runtime

---

## Recommended Next Phase

Recommended future direction:

1. build one more real XR experience on top of XRCore
2. observe where Whisper-specific assumptions still leak
3. only then extract:
   - deeper interaction shell
   - deeper journey shell
   - deeper sequencing shell
   - mobile / gyro adaptation

---

## Working Definition

XRCore V1.1 = reusable authored XR runtime baseline.

That is the correct scope for this version.