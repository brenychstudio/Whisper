import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ width: "min(92vw, 900px)", margin: "0 auto", padding: "24px var(--pad) 80px" }}>
      <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.9 }}>
        Not found. <Link to="/series" style={{ borderBottom: "1px solid rgba(255,255,255,0.16)" }}>Go to Series</Link>
      </div>
    </div>
  );
}
