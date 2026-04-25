import { useMemo, useLayoutEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { site } from "../content/config.js";
import EditorialScroll from "../components/EditorialScroll/EditorialScroll.jsx";

export default function SeriesPage() {
  const { key } = useParams();

  // ✅ скидаємо scroll ДО першого рендера контенту серії
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const series = useMemo(() => site.series.find((s) => s.key === key), [key]);
  if (!series) return <Navigate to="/series" replace />;

  return (
    <EditorialScroll
      title={series.title}
      items={series.items}
      seriesKey={series.key}
      cta={site.seriesPrintCTA}
    />
  );
}
