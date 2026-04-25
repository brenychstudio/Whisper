// Compatibility wrapper. Canonical internal module entry lives in src/modules/print-ar/.
import LegacyPrintARHostOverlay from "../../../features/print-ar-host/PrintARHostOverlay.jsx";
import "./InternalPrintArOverlay.css";

export default function InternalPrintArOverlay(props) {
  return <LegacyPrintARHostOverlay {...props} internalMode />;
}
