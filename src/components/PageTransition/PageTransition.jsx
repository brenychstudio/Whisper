import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const FALLBACK_PAGE_MS = 450;
const FALLBACK_Y = 6;

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

function readVarPx(name, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default function PageTransition({ children }) {
  const reduce = useReducedMotion();
  const location = useLocation();

  const dur = useMemo(() => readVarMs("--t-page", FALLBACK_PAGE_MS) / 1000, []);
  const y = useMemo(() => readVarPx("--y-page", FALLBACK_Y), []);

  // each page starts at top (do it before paint to avoid a visible “jump”)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  if (reduce) return <div>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -y }}
      transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
