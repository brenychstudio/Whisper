// src/xr-core/content/manifestContract.js

/**
 * XRManifest — contract (Freeze)
 *
 * XRManifest = {
 *   experienceId: string,
 *   zones: Array<{ id: string, label: string }>,
 *   artworks: Array<{
 *     id: string,
 *     printId: string,
 *     zoneId: string,
 *     src: string,
 *     caption?: string,
 *     title?: string
 *   }>,
 *   beats: Array<{
 *     id: string,
 *     zoneId: string,
 *     artworkPrintId?: string,
 *     guidance?: { type: "beacon", intensity: number },
 *     onGaze?: string[],
 *     onProximity?: string[]
 *   }>,
 *   collect: { mode: "qr", shareBasePath: "/p/" }
 * }
 */

export const XR_MANIFEST_SCHEMA_VERSION = 1;

// kept as a constant “shape reminder” (docs-in-code)
export const XR_MANIFEST_CONTRACT = Object.freeze({
  experienceId: "string",
  zones: [{ id: "string", label: "string" }],
  artworks: [
    {
      id: "string",
      printId: "string",
      zoneId: "string",
      src: "string",
      caption: "string?",
      title: "string?",
    },
  ],
  beats: [
    {
      id: "string",
      zoneId: "string",
      artworkPrintId: "string?",
      guidance: { type: "beacon", intensity: "number" },
      onGaze: ["string"],
      onProximity: ["string"],
    },
  ],
  collect: { mode: "qr", shareBasePath: "/p/" },
});