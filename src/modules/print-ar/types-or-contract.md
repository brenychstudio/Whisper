# Print AR Contract

This file is the compact contract reference for the reusable package in `src/modules/print-ar/`.

## Canonical Package Boundary

- canonical module source: `src/modules/print-ar/`
- recommended entrypoint: `src/modules/print-ar/index.js`
- runtime dependencies still outside the boundary are documented in `README.md`

## Public Imports

Use these imports for host integration:

- `PrintArOverlay`
- `buildPrintArPayload`
- `applyFramePresetToPayload`
- `buildPrintArAssetKey`
- hosted asset helpers
- `resolveAssetHealth`
- Android launch helpers

Internal-only imports:

- `InternalPrintArOverlay`
- `InternalGenerationWorkflowPanel`
- `useInternalGenerationWorkflow`
- `useInternalVariantGenerationWorkflow`

## Host Input Contract

`buildPrintArPayload({ print, size, shareUrl, framePresetId })` expects:

```js
{
  print: {
    id: string,
    title: string,
    image: string,
    sizes: Array<string | { key?: string, label?: string, price?: number }>,
    series?: string,
    edition?: string,
    paper?: string,
    priceFrom?: number,
    buyUrl?: string,
  },
  size: string | { key?: string, label?: string, price?: number },
  shareUrl?: string,
  framePresetId?: "black" | "white" | "oak",
}
```

## Payload Guarantees

The built payload guarantees:

```js
{
  productId,
  variantId,
  assetKey,
  title,
  artwork: { imageUrl, aspectRatio },
  print: { widthMm, heightMm },
  imageArea,
  printBorder,
  frame,
  mat,
  outerSize,
  assets,
  bridgeAssets,
  customerPreview,
  framePresetOptions,
  androidAr,
  cta,
  sourceMeta,
  preview,
}
```

## Variant Identity Rules

- paper size is the source of truth
- borders are already included in paper size
- no crop is introduced by the module
- frame preset changes variant identity
- mat currently remains fixed as `warm-white-mat`
- one exact `assetKey` represents one exact framed print variant

Current asset key shape:

`<printId>-<sizeKey>-<framePreset>-frame-warm-white-mat`

## Hosted Asset Contract

Hosted manifest records are normalized to:

```js
{
  assetKey,
  fileName,
  glbUrl,
  iosSrc,
  status: "draft" | "ready" | "disabled",
  platform: {
    android: {
      enabled: boolean,
      scaleMode: "fixed" | "auto",
    },
    ios: {
      enabled: boolean,
      quickLookMode?: "ar" | "object",
    },
  },
  meta: {
    updatedAt,
    note,
    source,
  },
}
```

## Runtime Behavior Expectations

Customer runtime currently guarantees:

- interactive 3D preview modal
- atmospheric backdrop
- frame preset switching
- Android-first readiness and launch policy
- iPhone/iPad fallback preservation
- no internal generation UI in customer mode

Internal tooling currently guarantees:

- local-first generation workflow
- manifest prep helpers
- attach/export review surfaces

## Non-Goals In The Current Package

- no backend automation
- no public generator UI
- no server-required architecture
- no native iOS wall-preview product

## Extraction Notes

If extracted later into its own repo/package, take:

1. all files in `src/modules/print-ar/`
2. documented runtime dependencies from `src/features/print-ar-host/`
3. optional internal tooling only if the destination also needs prep workflows

Do not treat the Whisper page layer as required package code.
