import CustomerPrintArOverlay from "./CustomerPrintArOverlay.jsx";
import InternalPrintArOverlay from "./InternalPrintArOverlay.jsx";
import "./PrintArOverlay.css";

function resolveOverlayMode(explicitMode) {
  if (explicitMode === "customer" || explicitMode === "internal") {
    return explicitMode;
  }

  if (typeof window === "undefined") {
    return "customer";
  }

  const params = new URLSearchParams(window.location.search);
  const internalByQuery =
    params.get("ar_mode") === "internal" || params.get("ar_internal") === "1";

  return internalByQuery ? "internal" : "customer";
}

export default function PrintArOverlay({ mode = "auto", ...props }) {
  const resolvedMode = resolveOverlayMode(mode);

  if (resolvedMode === "internal") {
    return <InternalPrintArOverlay {...props} />;
  }

  return <CustomerPrintArOverlay {...props} />;
}
