// src/content/config.js
export const site = {
  eyebrow: "CONCEPTUAL ART PHOTOGRAPHY + FILM",
  title: "WHISPER",
  tagline: "A two-part meditation on nature, presence, and silence.",
  cta: "EXPLORE",

  // Used for absolute OG urls/images on /p/* share pages.
  // Prefer env var SITE_URL / VITE_SITE_URL during build.
  // Leave empty in repo.
  url: "",

  heroVideo: {
    mp4: "/media/hero.mp4",
    webm: "/media/hero.webm", // optional
    poster: "/media/poster.jpg",
  },

  audio: {
    src: "/media/soundscape.mp3", // optional
    label: "Play soundscape",
  },

  nav: [
    { label: "Series", to: "/series" },
    { label: "Prints", to: "/prints" },
    { label: "Notes", to: "__notes__" }, // special (opens drawer)
    { label: "Credits", to: "/credits" },
    { label: "Contact", to: "/contact" },
  ],

  // Series page CTA (Variant C)
  seriesPrintCTA: {
    enabled: true,
    showLabel: false,
    label: "Edition print",
    showPrice: true,
    fromPrice: 280,
    meta: "· COA",
  },

  // XR / XRCore-ready flags + budgets (CORE reads only manifest; site drives settings)
  xr: {
    enabled: true,
    experienceId: "whisper",
    experiencePath: "/experience",
    kioskPath: "/xr",
    questHint: "Works on Meta Quest Browser",

    // curated = what XR uses (do not auto-import everything)
    curated: {
      sea: ["sea-01", "sea-03", "sea-05a"],
      forest: ["forest-01", "forest-03", "forest-04"],
    },
    curatedRules: {
      // strategy:
      // - "first": бере перші N з flattenSeries (після include)
      // - "spread": рівномірно розподіляє вибір по серії (після include)
      sea: { strategy: "spread", count: 3 },
      forest: { strategy: "spread", count: 3 },
    },

    triggers: {
      // default behavior for all beats (can be extended later per-zone/per-beat)
      onGaze: ["advance"], // gaze-hold completes -> advance
      onProximity: ["whisper"], // near current beat -> micro-response (wave/pollen)
    },

    // “magic numbers” moved to config (Quest-first defaults)
    quality: { maxDpr: 1.6 },

    mobileGyro: {
      enabled: true,
      moveSpeed: 1.18,
      strafeSpeed: 0.92,
      hudFade: 0.92,
    },

    hands: {
      color: 0xd5dde0,
      opacity: 0.16,
      roughness: 0.82,
      metalness: 0.0,
      emissive: 0x7d8a8f,
      emissiveIntensity: 0.045,
    },

    handLocomotion: {
      pinchOnDist: 0.018,
      pinchOffDist: 0.028,
      teleportRay: true,
      fingertipResponse: true,
      contactReadiness: true,
    },

    timings: {
      // Slower overall gaze (calmer pacing)
      gazeHoldMs: 1900,

      // Video stages: keep the viewer longer before allowing advance
      // (runtime uses these to delay / slow the gaze meter for video beats)
      videoMinWatchMs: 3500,
      videoGazeHoldMs: 7000,

      // Smooth fade for cinematic staging (higher = slower/softer fades)
      stagingHalfLifeMs: 320,

      collectorPanelMs: 12000,

      // Gate + mood polish (XRRootThree reads these if present)
      moodHalfLifeMs: 520,
      gateCueMs: 950,
      gateFadeHalfLifeMs: 260,

      proximityRadius: 1.25,
      proximityHoldMs: 260,
      beatActionCooldownMs: 900,
    },

finale: {
  enabled: true,

  // Aquasouls
  soulsCount: 72,          // 48–96 (рекомендую 72 або 88)
  soulsSpawnR: 8.5,        // стартова дистанція (чим більше — тим “здалека”)
  soulsSpawnRJitter: 7.0,  // додатковий розкид по радіусу

  soulsAttract: 0.58,      // сила стягування до центру
  soulsSwirl: 1.15,        // сила вихору (вища = сильніший вихор)
  soulsDamp: 0.972,        // менше = швидше/енергійніше
  soulsRise: 0.26,         // підйом “вгору” (ефект зльоту)
  soulsOpacity: 0.78,      // фінальна видимість

  // де з’являється “згусток” відносно глядача після останнього artwork
  portalAheadM: 8.2,       // було близько — робимо видимо здалека
  portalDistance: 1.35,    // на якій відстані запускається перехід

  // Плавність переходу “ніч → молочний ранок”
  transitionMs: 4000,      // більше = повільніше (2800–4200)

  // Data rain (стрикси — преміум варіант)
  codeRain: "streaks",
  rainCount: 72,
  rainHeight: 5.2,
  rainRadius: 1.9,
},

seaSouls: {
  enabled: true,
  count: 18,
  bigCount: 6,
  opacity: 0.09,
  trailOpacity: 0.032,
  size: 0.11,
  bigSize: 0.22,
  speed: 0.95,
  proximityRadius: 2.2,
},

    layout: {
      spacing: 3.25, // більше відстані між роботами
      corridor: false,

      // розводить по X сильніше (менше “зажато”)
      curveAmp: 0.78,
      curveFreq: 0.42,

      // додатковий контроль “lane” позицій і порталу
      laneX: 1.45,
      portalScale: 1.62,

      // зсув stage-порталів (щоб Sea-stage менше перекривав)
      stageOffsetXSea: -0.65,
      stageOffsetXForest: 0,

      // рамки/фрейм (м’якіше)
      frameMargin: 1.06,
      frameOpacity: 0.14,
    },
  },

  // Prints (manual overrides). The rest will be auto-built from series.
  prints: [
    {
      id: "sea-01",
      series: "sea",
      title: "Whisper of the Sea — 01",
      image: "/sea/01.jpg",
      edition: "Limited Edition of 30",
      paper: "Hahnemühle Photo Rag 308 gsm",
      sizes: ["30×40", "50×70", "70×100"],
      priceFrom: 280,
      buyUrl: "",
    },
    {
      id: "forest-01",
      series: "forest",
      title: "Whisper of the Forest — 01",
      image: "/forest/01.jpg",
      edition: "Limited Edition of 30",
      paper: "Hahnemühle Photo Rag 308 gsm",
      sizes: ["30×40", "50×70", "70×100"],
      priceFrom: 280,
      buyUrl: "",
    },
  ],

  series: [
    {
      key: "sea",
      title: "Whisper of the Sea",
      shortLine: "Myth, tide, and a call to restore balance.",
      cover: "/sea/cover.jpg",
      notes: {
        statement:
          "A multimedia chapter where myth meets the ocean’s fragile reality — motion as memory, and a warning in the tide.",
        context:
          "Whisper of the Sea intertwines mythical narrative with urgent environmental concern. It follows the AquaSouls — ancient beings who store knowledge in their DNA and once guided humanity toward harmony with nature. As human disconnection deepens, their whispers fade and the ocean is left in peril. The AquaSouls are forced to leave the sea, urging a return to balance before the water rises again and washes away the scars of the Earth.\n\nThe project is composed as an immersive experience through photography, video, and sound.",
        sound:
          "Original sound design built as a continuous atmosphere — restrained, immersive, and meant to be felt as much as heard.",
        credits: [
          "Photo / Video / Sound — Rostyslav Brenych",
          "Concept / Art direction / Style — Ekaterina Perekopskaya",
        ],
        links: [],
        // If your drawer UI supports extra fields later, we can add: { label, href } objects here.
      },
      items: [
        { type: "full", src: "/sea/01.jpg", srcSmall: "/sea/01_s.jpg", alt: "Sea 01" },
        {
          type: "text",
          eyebrow: "Whisper of the Sea",
          headline: "Tide as memory.",
          body: "A slow descent — where motion becomes a form of remembering.",
          align: "center",
        },
        { type: "window", src: "/sea/02.jpg", srcSmall: "/sea/02_s.jpg", alt: "Sea 02" },

        {
          type: "video_stage",
          src: "/whisper/sea/sea-stage.mp4",
          poster: "/whisper/sea/sea-stage.jpg",
          caption: "Sea — motion fragment",
          heightVh: 240,
          topOffset: 24,
          introVh: 18,
        },

        { type: "full", src: "/sea/03.jpg", srcSmall: "/sea/03_s.jpg", alt: "Sea 03" },
        {
          type: "text",
          eyebrow: "AquaSouls",
          headline: "The ocean remembers.",
          body: "Ancient guardians carry knowledge in their DNA — a whisper calling for balance before the tide returns.",
          align: "center",
        },
        { type: "window", src: "/sea/04.jpg", srcSmall: "/sea/04_s.jpg", alt: "Sea 04" },
        {
          type: "diptych",
          items: [
            { src: "/sea/05a.jpg", srcSmall: "/sea/05a_s.jpg", alt: "Sea 05a" },
            { src: "/sea/05b.jpg", srcSmall: "/sea/05b_s.jpg", alt: "Sea 05b" },
          ],
        },
        { type: "full", src: "/sea/06.jpg", srcSmall: "/sea/06_s.jpg", alt: "Sea 06" },
        { type: "window", src: "/sea/07.jpg", srcSmall: "/sea/07_s.jpg", alt: "Sea 07" },
      ],
    },

    {
      key: "forest",
      title: "Whisper of the Forest",
      shortLine: "Stillness, breath, and hidden witnessing.",
      cover: "/forest/cover.jpg",
      notes: {
        statement: "A suspended walk through stillness — where presence becomes audible.",
        context:
          "Whisper of the Forest is in progress. This chapter explores the Silvans — ethereal forest spirits born from ancient roots and woven from the mists of dawn. They move at the edge of perception, quietly guiding the energies of the woods and whispering the forest’s secrets.\n\nThe work invites viewers into a silent world where the forgotten bond between humankind and nature is revealed to those ready to listen.",
        sound:
          "A restrained soundscape designed to be felt more than heard — subtle, spacious, and attentive to quiet.",
        credits: [
          "Photo / Video / Sound — Rostyslav Brenych",
          "Concept / Art direction / Style — Ekaterina Perekopskaya",
        ],
        links: [],
      },
      items: [
        { type: "full", src: "/forest/01.jpg", srcSmall: "/forest/01_s.jpg", alt: "Forest 01" },
        {
          type: "text",
          eyebrow: "Silvans",
          headline: "Stillness has weight.",
          body: "Ethereal forest spirits guide the energies of the woods — revealing the forgotten bond to those who listen.",
          align: "center",
        },
        { type: "window", src: "/forest/02.jpg", srcSmall: "/forest/02_s.jpg", alt: "Forest 02" },

        {
          type: "video_stage",
          src: "/whisper/forest/forest-stage.mp4",
          poster: "/whisper/forest/forest-stage.jpg",
          caption: "Forest — motion fragment",
          heightVh: 240,
          topOffset: 24,
          introVh: 22,
        },

        { type: "full", src: "/forest/03.jpg", srcSmall: "/forest/03_s.jpg", alt: "Forest 03" },
        { type: "window", src: "/forest/04.jpg", srcSmall: "/forest/04_s.jpg", alt: "Forest 04" },
        {
          type: "text",
          eyebrow: "Presence",
          headline: "A quiet agreement.",
          body: "Not a narrative — an encounter where breath, distance, and silence become language.",
          align: "center",
        },
        { type: "full", src: "/forest/05.jpg", srcSmall: "/forest/05_s.jpg", alt: "Forest 05" },
        { type: "window", src: "/forest/06.jpg", srcSmall: "/forest/06_s.jpg", alt: "Forest 06" },
      ],
    },
  ],
};
