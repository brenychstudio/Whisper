import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { site } from "../../content/config.js";
import NotesDrawer from "../NotesDrawer/NotesDrawer.jsx";
import AudioToggle from "../AudioToggle/AudioToggle.jsx";
import AmbientField from "../AmbientField/AmbientField.jsx";
import styles from "./Shell.module.css";

const PAGE_TRANSITION_FALLBACK_MS = 450;
const NAV_CUT_FALLBACK_MS = 200;

function readVarMs(name, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notesOpen, setNotesOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const PAGE_TRANSITION_MS = useMemo(() => readVarMs("--t-page", PAGE_TRANSITION_FALLBACK_MS), []);
  const NAV_CUT_MS = useMemo(() => readVarMs("--t-cut", NAV_CUT_FALLBACK_MS), []);

  const [uiPath, setUiPath] = useState(location.pathname);
  const uiTimer = useRef(null);
  const mobileNavTimer = useRef(null);

  const prefersReduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    window.clearTimeout(uiTimer.current);

    if (prefersReduced()) {
      uiTimer.current = window.setTimeout(() => {
        setUiPath(location.pathname);
      }, 0);
      return;
    }

    uiTimer.current = window.setTimeout(() => {
      setUiPath(location.pathname);
    }, PAGE_TRANSITION_MS);

    return () => window.clearTimeout(uiTimer.current);
  }, [location.pathname, PAGE_TRANSITION_MS]);

  const isHome = uiPath === "/";
  // Kiosk must be clean immediately (no delayed uiPath gating).
  const isXRKiosk = location.pathname === "/xr";

  /* full-bleed рахуємо по реальному pathname */
  const isFullBleed =
    location.pathname === "/" || location.pathname === "/series" || location.pathname === "/xr";

  const ambientOn = uiPath === "/credits" || uiPath === "/contact" || uiPath === "/prints";
  const ambientPreset = uiPath === "/contact" ? "forest" : "sea";
  const ambientIntensity = uiPath === "/prints" ? 1.05 : 1.35;

  const activeSeriesKey = useMemo(() => {
    const m = uiPath.match(/^\/series\/([^/]+)/);
    return m?.[1] ?? null;
  }, [uiPath]);

  const notesPayload = useMemo(() => {
    const s = site.series.find((x) => x.key === activeSeriesKey);
    return s?.notes ?? null;
  }, [activeSeriesKey]);

  const activePath = useMemo(() => {
    if (uiPath.startsWith("/series")) return "/series";
    return uiPath;
  }, [uiPath]);

  useEffect(() => {
    window.clearTimeout(mobileNavTimer.current);
    mobileNavTimer.current = window.setTimeout(() => {
      setMobileNavOpen(false);
    }, 0);

    return () => window.clearTimeout(mobileNavTimer.current);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const [curtainOn, setCurtainOn] = useState(false);
  const navLock = useRef(false);
  const navTimer = useRef(null);
  const offTimer = useRef(null);

  const cinematicNavigate = useCallback(
    (to) => {
      if (!to) return;
      if (to === location.pathname) return;

      if (prefersReduced()) {
        navigate(to);
        return;
      }

      if (navLock.current) return;
      navLock.current = true;

      setCurtainOn(true);

      window.clearTimeout(navTimer.current);
      navTimer.current = window.setTimeout(() => {
        navigate(to);
      }, NAV_CUT_MS);
    },
    [navigate, location.pathname, NAV_CUT_MS]
  );

  useEffect(() => {
    if (!navLock.current) return;

    window.clearTimeout(offTimer.current);
    offTimer.current = window.setTimeout(() => {
      setCurtainOn(false);
      navLock.current = false;
    }, PAGE_TRANSITION_MS);

    return () => window.clearTimeout(offTimer.current);
  }, [location.pathname, PAGE_TRANSITION_MS]);

  useEffect(() => {
    return () => {
      window.clearTimeout(navTimer.current);
      window.clearTimeout(offTimer.current);
      window.clearTimeout(uiTimer.current);
      window.clearTimeout(mobileNavTimer.current);
    };
  }, []);

  function onNavClick(item) {
    setMobileNavOpen(false);

    if (item.to === "__notes__") {
      setNotesOpen(true);
      return;
    }
    cinematicNavigate(item.to);
  }

  return (
    <div className={styles.shell}>
      {!isXRKiosk ? (
        <div className={isHome ? styles.overlayHome : styles.overlayInner} aria-hidden="true" />
      ) : null}

      {!isXRKiosk ? (
        <div className={styles.ambientWrap} aria-hidden="true">
          <AmbientField enabled={ambientOn} preset={ambientPreset} intensity={ambientIntensity} />
        </div>
      ) : null}

      {!isXRKiosk ? (
        <div className={`${styles.curtain} ${curtainOn ? styles.curtainOn : ""}`} aria-hidden="true" />
      ) : null}

      {!isXRKiosk ? (
        <>
          <header className={styles.header}>
            <div
              className={styles.brand}
              onClick={() => cinematicNavigate("/")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") cinematicNavigate("/");
              }}
              role="button"
              tabIndex={0}
            >
              <span className={styles.brandTitle}>{site.title}</span>
            </div>

            <button
              className={`${styles.mobileNavToggle} ${mobileNavOpen ? styles.mobileNavToggleOpen : ""}`}
              type="button"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((value) => !value)}
            >
              {mobileNavOpen ? "Close" : "Menu"}
            </button>

            <nav
              className={`${styles.nav} ${mobileNavOpen ? styles.navOpen : ""}`}
              aria-label="Main navigation"
            >
              {site.nav.map((item) => {
                const isNotes = item.to === "__notes__";
                const isActive = !isNotes && item.to === activePath;

                return (
                  <button
                    key={item.label}
                    className={`${styles.navBtn} ${isActive ? styles.navBtnActive : ""}`}
                    onClick={() => onNavClick(item)}
                    type="button"
                  >
                    {item.label}
                  </button>
                );
              })}
              <AudioToggle />
            </nav>
          </header>

          <button
            className={`${styles.mobileNavBackdrop} ${mobileNavOpen ? styles.mobileNavBackdropOpen : ""}`}
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}

      <main className={`${styles.main} ${isFullBleed ? styles.mainFullBleed : ""}`}>
        <div className={`${styles.routeWrap} ${styles.routeIn}`}>{children}</div>
      </main>

      {!isXRKiosk ? (
        <NotesDrawer
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          payload={notesPayload}
          fallbackTitle={activeSeriesKey ? "Notes" : "Select a series to view notes"}
        />
      ) : null}
    </div>
  );
}
