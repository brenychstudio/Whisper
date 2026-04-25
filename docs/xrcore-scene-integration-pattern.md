# XRCore Scene Integration Pattern — V1.1

## Goal
This document defines how a new XR scene should be built on top of XRCore V1.1 without breaking the boundary between core systems and authored experience behavior.

---

## Recommended Structure

### Core layer
Reusable systems live in:

`src/xr-core/runtime/helpers/`

Examples:
- texture helpers
- ambient audio
- collector shell
- gate cue
- locomotion
- interaction UI shell
- environment shell

### Experience layer
Authored scene logic stays in the experience runtime and related experience files.

Examples:
- artwork list
- placement strategy
- sequencing logic
- mood values
- authored environmental identity
- finale behavior
- collector meaning
- authored narrative progression

---

## Integration Pattern

A new scene should follow this pattern:

### 1. Create or reuse runtime host
A runtime host wires XRCore systems together.

Responsibilities:
- create Three.js scene
- create camera / rig / renderer
- initialize helpers
- keep animation loop
- forward authored logic into runtime updates

### 2. Attach XRCore helpers
Helpers should be created as thin reusable modules:
- environment shell
- interaction shell
- locomotion shell
- ambient audio shell
- collector shell
- gate cue shell

### 3. Keep authored scene logic local
The following should remain scene-local:
- artwork anchors
- placement math
- progression logic
- gaze semantics
- transition dramaturgy
- mood identity
- authored special layers

### 4. Add optional finale controller
Finale must remain an experience-specific controller unless proven reusable across multiple projects.

---

## Minimal Runtime Contract

A new scene runtime should provide at least:

- `scene`
- `camera`
- `renderer`
- `rig`
- `floor`
- `sharePathForId(pid)`
- `absShareUrlForId(pid)`
- authored update methods
- authored sequencing state

---

## Core Helper Usage Guidelines

### createEnvironmentShell
Use when:
- you need base atmosphere geometry
- you want reusable open-space environment primitives

Do not use it as a replacement for authored mood logic.

### createInteractionShell
Use when:
- you need rail / desktop hint / VR hint UI

Do not move authored gaze logic into it yet.

### createAmbientAudioSystem
Use when:
- you need base dual-layer ambience
- you want mood-driven crossfade

Do not encode project-specific narrative audio timing into it.

### createCollectorPanel
Use when:
- the scene has a collect / scan / open handoff moment

Do not hardcode project-specific copy into the helper unless proven reusable.

### createGateCue
Use when:
- the scene has a spatial threshold / transition event

Do not move authored gate dramaturgy into the helper prematurely.

### createLocomotionShell
Use when:
- you need desktop movement
- VR controllers
- teleport
- snap-turn

This should remain general and scene-agnostic.

---

## Recommended Build Order for a New Scene

1. Start from working XRCore runtime baseline
2. Add authored artworks and placement
3. Add progression / gaze semantics
4. Add authored mood logic
5. Add collector meaning
6. Add finale controller if needed
7. Validate desktop
8. Validate VR
9. Only then refactor deeper

---

## Validation Checklist

Before considering a new scene stable:

### Desktop
- scene opens
- click-to-look works
- WASD works
- interaction rail works
- collect/open works
- audio starts correctly

### VR
- session starts without black screen
- controllers visible
- teleport works
- snap-turn works
- collector works
- audio works

### Experience
- staging works
- progression works
- finale works
- environment feels correct
- extraction helpers do not alter authored identity

---

## Guardrails

### Do not
- universalize too early
- move authored staging into core
- move finale into core unless reused multiple times
- rewrite environment values during extraction
- combine multiple major extraction/refactor steps at once

### Do
- extract literally first
- validate after each step
- keep authored logic local
- treat XRCore as a baseline, not as a finished universal engine

---

## Current Practical Rule

Use XRCore V1.1 for real new scenes now.
Refine universality only after at least one more production-like XR experience is built on top of it.