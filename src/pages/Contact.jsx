export default function Contact() {
  const email = "artproject@concept2048.com";
  const instagramLabel = "@concept_2048";
  const instagramUrl = "https://www.instagram.com/concept_2048/";
  const websiteUrl = "https://www.concept2048.com";

  async function copyEmail() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        return;
      }
    } catch {
      // fallback below
    }

    // Fallback (works even without clipboard permissions)
    try {
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // no-op
    }
  }

  return (
    <div
      style={{
        width: "min(92vw, 900px)",
        margin: "0 auto",
        padding: "84px var(--pad) 90px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        Contact
      </div>

      <div
        className="contactGrid"
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* Left: primary contact */}
        <div>
          <div
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 13,
              lineHeight: 1.9,
              maxWidth: "46ch",
            }}
          >
            For inquiries, collaborations, and print requests.
          </div>

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.52)",
              }}
            >
              Email
            </div>

            <a
              className="contactLink"
              href={`mailto:${email}`}
              style={{
                display: "inline-block",
                marginTop: 10,
                fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
                fontSize: 18,
                letterSpacing: "0.02em",
                color: "rgba(255,255,255,0.92)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.18)",
                paddingBottom: 2,
              }}
            >
              {email}
            </a>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {/* Less prominent */}
              <button
                type="button"
                onClick={copyEmail}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  padding: "10px 12px",
                  color: "rgba(255,255,255,0.62)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Copy email
              </button>

              {/* Primary */}
              <a
                href={`mailto:${email}`}
                style={{
                  display: "inline-block",
                  border: "1px solid rgba(255,255,255,0.18)",
                  padding: "10px 12px",
                  color: "rgba(255,255,255,0.92)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontSize: 10,
                  textDecoration: "none",
                }}
              >
                Open email
              </a>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.62)",
              fontSize: 12,
              lineHeight: 1.8,
              maxWidth: "60ch",
            }}
          >
            Please include a short brief, timeline, and a budget range if relevant.
          </div>
        </div>

        {/* Right: inquiries + links */}
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.52)",
            }}
          >
            Inquiries
          </div>

          <div
            style={{
              marginTop: 12,
              color: "rgba(255,255,255,0.74)",
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            Commissions / Editorial / Commercial
            <br />
            Exhibitions / Collaborations
            <br />
            Prints / Licensing
            <br />
            Press / Interviews
          </div>

          <div
            style={{
              marginTop: 22,
              height: 1,
              background: "rgba(255,255,255,0.08)",
              width: "100%",
            }}
          />

          <div
            style={{
              marginTop: 18,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.52)",
            }}
          >
            Links
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <a
              className="contactLink"
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "rgba(255,255,255,0.78)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.14)",
                paddingBottom: 2,
                width: "fit-content",
                fontSize: 12,
                letterSpacing: "0.12em",
              }}
            >
              Instagram — {instagramLabel}
            </a>

            <a
              className="contactLink"
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "rgba(255,255,255,0.70)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                paddingBottom: 2,
                width: "fit-content",
                fontSize: 12,
                letterSpacing: "0.12em",
              }}
            >
              Website — concept2048.com
            </a>

            <div
              style={{
                marginTop: 6,
                color: "rgba(255,255,255,0.52)",
                fontSize: 12,
                letterSpacing: "0.06em",
              }}
            >
              Barcelona · Spain
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px){
          .contactGrid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        .contactLink:hover{
          border-bottom-color: rgba(255,255,255,0.28) !important;
        }
      `}</style>
    </div>
  );
}
