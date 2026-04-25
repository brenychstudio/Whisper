// Compatibility wrapper. The reusable module exposes this as an internal-only surface.
import LegacyVariantGenerationWorkflowPanel from "../../../features/print-ar-host/generation/VariantGenerationWorkflowPanel.jsx";

export default function GenerationWorkflowPanel(props) {
  return <LegacyVariantGenerationWorkflowPanel {...props} />;
}
