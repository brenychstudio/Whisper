import { site } from "../content/config.js";
import SeriesGrid from "../components/SeriesGrid/SeriesGrid.jsx";

export default function SeriesIndex() {
  return <SeriesGrid series={site.series} />;
}
