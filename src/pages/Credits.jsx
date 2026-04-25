export default function Credits() {
  return (
    <div
      style={{
        width: "min(92vw, 900px)",
        margin: "0 auto",
        padding: "24px var(--pad) 80px",
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
        Credits
      </div>

      {/* core credits */}
      <div
        style={{
          marginTop: 18,
          lineHeight: 1.9,
          color: "rgba(255,255,255,0.78)",
          fontSize: 13,
        }}
      >
        Photo / Video / Sound — Rostyslav Brenych
        <br />
        Concept / Art direction / Style — Ekaterina Perekopskaya
      </div>

      {/* divider */}
      <div
        style={{
          marginTop: 26,
          height: 1,
          background: "rgba(255,255,255,0.08)",
          width: "100%",
        }}
      />

      {/* Concept2048 block (Variant 1) */}
      <div style={{ marginTop: 26 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          Concept2048
        </div>

        <div
          style={{
            marginTop: 10,
            color: "rgba(255,255,255,0.78)",
            fontSize: 13,
            lineHeight: 1.9,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.70)" }}>
            Ekaterina Perekopskaya · Rostyslav Brenych
          </div>

          <div style={{ marginTop: 14, color: "rgba(255,255,255,0.72)" }}>
            Concept2048 is a duo of visual artists working together since 2018,
            formally established as an artistic unity in 2021. Their practice spans
            art photography, moving image, and audio performance—merging conceptual
            art with fashion as a multidisciplinary language.
          </div>

          <div style={{ marginTop: 12, color: "rgba(255,255,255,0.72)" }}>
            Rather than providing fixed interpretations, their projects operate as
            open questions: invitations to reflect on perception, identity, and
            responsibility. At its core, Concept2048 addresses urgent global issues
            and proposes art as a catalyst for societal and environmental change.
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.64)",
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            <span style={{ letterSpacing: "0.12em" }}>2048</span> signifies a near
            future—an emblem of consequence, and a reminder that actions taken today
            shape the world of tomorrow.
          </div>

          <div style={{ marginTop: 14 }}>
            <a
              href="https://www.concept2048.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                color: "rgba(255,255,255,0.78)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.18)",
                paddingBottom: 2,
                letterSpacing: "0.12em",
                fontSize: 12,
              }}
            >
              concept2048.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
