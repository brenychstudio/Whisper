import { useEffect, useRef } from "react";
import styles from "./AmbientField.module.css";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export default function AmbientField({
  enabled = false,
  preset = "forest", // "forest" | "sea"
  intensity = 1.25,  // 1.0..2.0
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  const particlesRef = useRef([]);
  const ripplesRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, px: 0, py: 0, active: false });

  useEffect(() => {
    if (!enabled) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const finePointer = window.matchMedia?.("(pointer: fine)")?.matches;
    if (reduceMotion || !finePointer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = pointerRef.current;

    let W = 0;
    let H = 0;
    let last = performance.now();

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function spawnParticles() {
      const base = preset === "sea" ? 110 : 90;
      const count = Math.floor(base * intensity);

      const arr = [];
      const slow = preset === "sea" ? 0.22 : 0.18;

      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * slow,
          vy: (Math.random() - 0.5) * slow,
          s: 0.35 + Math.random() * 0.75,
          r: preset === "sea" ? (1.2 + Math.random() * 2.8) : (0.9 + Math.random() * 2.2),
          a: preset === "sea" ? (0.06 + Math.random() * 0.10) : (0.05 + Math.random() * 0.09),
        });
      }
      particlesRef.current = arr;
    }

    function addRipple(x, y, power = 1) {
      ripplesRef.current.push({
        x,
        y,
        r: 10,
        max: preset === "sea" ? 420 : 320,
        a: (preset === "sea" ? 0.16 : 0.12) * power,
      });
      if (ripplesRef.current.length > 10) ripplesRef.current.shift();
    }

    function onMove(e) {
      const x = e.clientX;
      const y = e.clientY;

      if (!pointer.active) {
        pointer.px = x;
        pointer.py = y;
      }

      pointer.x = x;
      pointer.y = y;
      pointer.active = true;

      // (опційно) ripple від швидкого руху тільки для "sea"
      const d = Math.hypot(x - pointer.px, y - pointer.py);
      if (preset === "sea" && d > 30) {
        addRipple(x, y, clamp(d / 140, 0.6, 1.25));
      }

      pointer.px = x;
      pointer.py = y;
    }

    function onDown(e) {
      addRipple(e.clientX, e.clientY, 1.2);
    }

    function onLeave() {
      pointer.active = false;
    }

    // легке “flow field” (без градієнтів/ореолів)
    function fieldAngle(x, y, time) {
      const f1 = 0.0018;
      const f2 = 0.0026;
      const a =
        Math.sin((y * f1) + time * 0.0007) +
        Math.cos((x * f1) - time * 0.0006) +
        0.7 * Math.sin((x * f2 + y * f2) + time * 0.00045);
      return a * Math.PI;
    }

    function draw(now) {
      const dt = clamp((now - last) / 16.666, 0.5, 2.0);
      last = now;

      // trail fade (жодних світлих заливок/градієнтів!)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, W, H);

      // ripples
      const ripples = ripplesRef.current;
      ctx.globalCompositeOperation = "lighter";
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += (preset === "sea" ? 9.0 : 7.0) * dt;

        const k = r.r / r.max;
        const alpha = r.a * (1 - k);
        if (alpha <= 0.001 || r.r > r.max) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle =
          preset === "sea"
            ? `rgba(200,230,255,${alpha})`
            : `rgba(235,255,235,${alpha})`;
        ctx.lineWidth = preset === "sea" ? 1.1 : 0.95;
        ctx.stroke();
      }

      // particles
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // flow acceleration
        const ang = fieldAngle(p.x, p.y, now);
        const ax = Math.cos(ang) * 0.08 * p.s * intensity;
        const ay = Math.sin(ang) * 0.08 * p.s * intensity;

        p.vx = p.vx * 0.96 + ax;
        p.vy = p.vy * 0.96 + ay;

        // cursor interaction: vortex + soft repulsion
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;

          const R = preset === "sea" ? 260 : 220;
          const R2 = R * R;

          if (d2 < R2) {
            const d = Math.max(22, Math.sqrt(d2));
            const n = 1 - d / R;

            const tx = -dy / d;
            const ty = dx / d;
            const spin = (preset === "sea" ? 0.55 : 0.42) * n * intensity;

            p.vx += tx * spin * 0.33;
            p.vy += ty * spin * 0.33;

            const rep = (preset === "sea" ? 0.22 : 0.18) * n * intensity;
            p.vx += (dx / d) * rep;
            p.vy += (dy / d) * rep;
          }
        }

        const ox = p.x;
        const oy = p.y;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // wrap
        if (p.x < -40) p.x = W + 40;
        if (p.x > W + 40) p.x = -40;
        if (p.y < -40) p.y = H + 40;
        if (p.y > H + 40) p.y = -40;

        // draw streak + dot (видимість без “плями”)
        const aa = Math.min(0.22, p.a * 1.18);

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle =
          preset === "sea"
            ? `rgba(190,225,255,${aa})`
            : `rgba(220,255,220,${aa})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          preset === "sea"
            ? `rgba(210,235,255,${aa * 0.9})`
            : `rgba(235,255,235,${aa * 0.85})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    // init
    resize();
    spawnParticles();

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });

    // стартовий імпульс (без хмари)
    addRipple(window.innerWidth * 0.52, window.innerHeight * 0.44, 1.0);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, preset, intensity]);

  if (!enabled) return null;

  return (
    <div className={styles.wrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
