# WHISPER

**WHISPER** is a premium interactive Web / XR exhibition built around the photo-film series **Whisper of the Sea** and **Whisper of the Forest**.

The project combines an editorial art website, a WebXR / Quest VR experience, a print catalog, shareable collector links, and an AR print preview flow.

It is designed as a quiet immersive installation rather than a conventional gallery or VR game.

---

## Project Type

WHISPER is closest to:

- Premium website
- Immersive WebXR experience
- Conceptual art / photography platform
- Product prototype
- Reusable XR system foundation
- Portfolio flagship case

---

## Core Idea

WHISPER turns two visual series into a guided digital exhibition.

The user can explore the project through:

- a cinematic landing page
- editorial series pages
- a print catalog
- a browser-based XR experience
- Quest VR mode
- AR preview for selected framed prints
- collector/share paths for artworks

The XR layer is built as an interactive installation: the space reacts to presence, gaze, movement, proximity, and progression.

---

## Current Status

The project is in an advanced working V1 state.

Implemented:

- Public website
- Home / Series / Prints / Notes / Credits / Contact pages
- Responsive mobile/tablet layout
- Premium mobile navigation drawer
- WebXR / Quest VR experience
- Stable Quest hand tracking
- Hand-based teleport navigation
- Desktop preview mode
- XR finale / collector flow
- Extracted XRCore V1.1 helper baseline
- Static AR print preview integration
- One real generated AR asset binding
- Cloudflare Pages deployment
- GitHub repository baseline

Still in progress:

- final site polish
- additional AR print assets
- AR asset visual fidelity pass
- optional viewing-progress / timing clarity pass in XR
- expansion of the XR exhibition with more photos/videos
- later XRCore V2 extraction after more use-cases

---

## Key Features

### Editorial Website

The website presents WHISPER as a premium art project, not as a generic image gallery.

Included sections:

- Home
- Series
- Prints
- Notes
- Credits
- Contact
- Experience / XR entry
- Share paths for individual prints

### WebXR / VR Experience

The XR experience is designed for Meta Quest Browser and desktop preview.

Main features:

- immersive exhibition space
- SEA → FOREST progression
- video and image staging
- gaze/proximity-driven experience logic
- ambient audio layers
- finale moment
- collector handoff
- Quest hand tracking
- hand-based teleport
- premium ghost-like hand presence

### AR Print Preview

The print catalog includes a customer-facing AR preview flow.

Implemented:

- static generated `.glb` / `.usdz` asset hosting
- exact print variant binding
- framed 3D preview modal
- Android Scene Viewer flow
- iPhone/iPad Quick Look fallback
- clean unavailable state for missing assets
- no backend / KV / internal generation UI

The current integration uses local static files inside:

```text
public/generated/

No runtime generation or backend session layer is required for the current WHISPER site.

Tech Stack
React
Vite
Three.js
WebXR
JavaScript
CSS Modules
Static assets
Cloudflare Pages
GitHub

Additional XR / AR architecture includes:

custom XR runtime layer
hand tracking systems
teleport locomotion
collector panel flow
AR preview module
hosted static GLB/USDZ registry
Architecture

The project is structured around three layers:

1. Website Layer

Responsible for:

public navigation
editorial content
series pages
prints
contact/credits
entry into XR
share/collector continuation
2. XR Experience Layer

Responsible for:

WHISPER-specific staging
SEA / FOREST progression
atmosphere
audio
finale
authored spatial logic
visual identity
3. XRCore Baseline

Reusable helper systems have started to be extracted into XRCore.

Current reusable areas include:

locomotion shell
interaction shell
environment shell
collector panel
ambient audio system
texture helpers
gate cue helpers
XR support handling

XRCore is not yet a fully universal engine, but the project already serves as a strong base for future reusable immersive exhibition systems.

Design Direction

The visual language is:

dark
cinematic
museum-like
quiet
premium
editorial
atmospheric
restrained

WHISPER avoids:

generic VR gallery aesthetics
game-like UI
bright neon sci-fi styling
dashboard-style technical interfaces
aggressive commercial overlays

The goal is to preserve the feeling of a controlled contemporary art installation.

AR Print Preview Notes

The current AR preview flow uses static assets.

Example asset pattern:

public/generated/forest-02-70x50-black-frame-warm-white-mat.glb
public/generated/forest-02-70x50-black-frame-warm-white-mat.usdz

Each AR asset is tied to an exact variant identity:

printId + paper size + frame preset + mat preset

This keeps the AR preview accurate and prevents approximate or incorrect print configurations.

Deployment

The project is deployed with Cloudflare Pages.

Typical build settings:

Build command: npm run build
Output directory: dist
Local Development

Install dependencies:

npm install

Run local development server:

npm run dev

Run production build:

npm run build

Preview production build:

npm run preview

For headset / local network testing, use HTTPS and host mode when required.

Production Priorities

Current recommended order:

Mobile/tablet final QA
AR print preview polish
Add more generated AR assets
XR viewing-progress / timing clarity pass
Final Quest QA pass
Expand XR exhibition with more works
Visual quality upgrade of the XR space
Later XRCore V2 extraction after additional use-cases
Professional Signal

WHISPER demonstrates:

premium interactive front-end development
immersive WebXR implementation
real Quest VR testing
hand-tracking UX
spatial interaction design
AR print preview integration
art-commerce bridge design
reusable runtime thinking
product-level presentation polish

The project is intended to serve as a flagship portfolio case for premium interactive web and immersive art systems.

Credits

Design and development by brenychstudio.

https://brenychstudio.com
