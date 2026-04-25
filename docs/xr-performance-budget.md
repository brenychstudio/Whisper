# XR Performance Budget (Quest-first)

- Target: stable 72fps on Meta Quest Browser.
- Textures:
  - artworks: 1K–2K max
  - UI/FX: 512–1K
- PostFX: avoid heavy DOF/blur; keep fog/particles very cheap.
- Lighting: 1–2 lights max, “baked feel”.
- Lazy-load zones: SEA first, FOREST during transition.
- Quality tiers: low/high (default low for weak devices).