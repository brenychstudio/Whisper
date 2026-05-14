import { useEffect, useRef } from "react";
import styles from "./WebGLAmbientField.module.css";

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

#define MAX_SOULS 48
#define SEGMENTS 8
#define PI 3.14159265359
#define TAU 6.28318530718

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_intensity;
uniform float u_preset;
uniform float u_pointerEnergy;
uniform float u_readability;
uniform float u_soulCount;
uniform vec4 u_soulA[MAX_SOULS];
uniform vec4 u_soulB[MAX_SOULS];

float saturate(float v) {
  return clamp(v, 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.62, 1.17, -1.17, 1.62);

  for (int i = 0; i < 4; i++) {
    v += noise(p) * a;
    p = m * p + 0.17;
    a *= 0.5;
  }

  return v;
}

float readingZone(vec2 uv) {
  float x = 1.0 - smoothstep(0.23, 0.37, abs(uv.x - 0.5));
  float y = smoothstep(0.52, 0.68, uv.y) * (1.0 - smoothstep(0.96, 1.04, uv.y));
  return x * y;
}

float sdSegmentSq(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  vec2 d = pa - ba * h;
  return dot(d, d);
}

vec2 rotate2(vec2 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 curvePoint(float id, vec2 h0, vec2 h1, vec2 h2, float q, float time, float aspect) {
  float forest = step(0.5, u_preset);
  float depth = mix(0.48, 1.62, h1.x);
  float speed = mix(0.012, 0.05, h0.y) / depth;
  float lane = fract(time * speed + h2.x + q * mix(0.12, 0.24, forest));

  vec2 seaBase = vec2(
    fract(h0.x + time * speed * mix(-0.42, 0.44, h1.y) + q * 0.034),
    fract(h1.x + time * speed * mix(-0.22, 0.36, h2.y) - q * 0.024)
  );
  seaBase = seaBase * 1.34 - 0.17;

  float forestX = fract(h0.x + sin(time * 0.018 + id) * 0.018);
  float forestY = fract(h1.x + time * speed * 0.38);
  vec2 forestBase = vec2(
    forestX + q * mix(-0.028, 0.028, h1.y),
    forestY - q * 0.055
  );
  forestBase = forestBase * vec2(1.12, 1.38) + vec2(-0.06, -0.19);

  vec2 base = mix(seaBase, forestBase, forest);
  base.x *= aspect;

  float angle = h2.x * TAU + sin(time * mix(0.045, 0.17, h0.x) + h1.y * TAU) * mix(1.35, 0.45, forest);
  float radius = mix(0.03, 0.19, h2.y) / depth;
  float bend = mix(-1.0, 1.0, h0.x);
  float phase = lane * TAU + q * mix(1.2, 3.8, h1.y) * bend;

  vec2 tideArc = vec2(cos(phase), sin(phase * mix(0.72, 1.22, h0.y))) * radius;
  vec2 rootArc = vec2(
    sin(phase * 0.72 + h2.y * TAU) * radius * 0.42,
    cos(phase * 1.18) * radius * 1.26
  );

  vec2 wave = vec2(
    sin(time * mix(0.16, 0.26, forest) + id * 2.9 + q * 5.5),
    cos(time * mix(0.13, 0.22, forest) + id * 3.7 - q * 4.1)
  ) * (mix(0.016, 0.011, forest) / depth);

  return base + rotate2(mix(tideArc, rootArc, forest) + wave, angle);
}

float seaMemoryField(vec2 uv, float time) {
  vec2 c1 = vec2(0.25 + 0.045 * sin(time * 0.055), 0.62);
  vec2 c2 = vec2(0.73, 0.42 + 0.055 * cos(time * 0.048));
  float d1 = abs(sin(length(uv - c1) * 128.0 - time * 0.42));
  float d2 = abs(sin(length(uv - c2) * 96.0 + time * 0.28));
  float rings = pow(1.0 - d1, 17.0) * 0.055 + pow(1.0 - d2, 15.0) * 0.04;
  float tide = pow(saturate(1.0 - abs(sin((uv.y * 8.0 + uv.x * 1.8) + time * 0.12))), 18.0) * 0.018;
  return rings + tide;
}

float forestMemoryField(vec2 uv, float time) {
  float field = 0.0;

  for (int i = 0; i < 6; i++) {
    float id = float(i);
    float seed = hash12(vec2(id, 7.3));
    float x = mix(0.09, 0.91, seed);
    float y = uv.y;
    float path =
      x +
      sin(y * mix(3.2, 5.4, seed) + time * 0.035 + id) * 0.028 +
      sin(y * mix(8.0, 12.0, seed) - time * 0.022 + id * 2.1) * 0.012;
    float d = abs(uv.x - path);
    float root = exp(-(d * d) / mix(0.00009, 0.00022, seed));
    float fade = smoothstep(0.04, 0.24, y) * (1.0 - smoothstep(0.72, 0.98, y));
    field += root * fade * mix(0.014, 0.034, seed);
  }

  float mist = pow(fbm(uv * vec2(2.2, 5.4) + vec2(time * 0.018, -time * 0.026)), 2.4) * 0.04;
  return field + mist;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 pointer = vec2(u_pointer.x * aspect, u_pointer.y);
  float forest = step(0.5, u_preset);

  float vignette = smoothstep(1.02, 0.18, distance(uv, vec2(0.5)));
  float quiet = readingZone(uv) * u_readability;
  float peripheral = smoothstep(0.16, 0.58, distance(uv, vec2(0.5, 0.58)));
  float lowerDrift = 1.0 - smoothstep(0.08, 0.56, uv.y);
  float breath = fbm(uv * mix(2.2, 3.6, forest) + vec2(u_time * 0.018, -u_time * 0.014));
  float field = mix(seaMemoryField(uv, u_time), forestMemoryField(uv, u_time), forest);
  field *= mix(0.58, 1.0, vignette);

  vec3 seaTint = vec3(0.50, 0.72, 0.95);
  vec3 seaPearl = vec3(0.88, 0.95, 1.0);
  vec3 forestTint = vec3(0.62, 0.90, 0.68);
  vec3 forestAmber = vec3(0.95, 0.82, 0.56);
  vec3 tint = mix(seaTint, forestTint, forest);
  vec3 accent = mix(seaPearl, forestAmber, forest);

  vec3 color = vec3(0.0);
  color += field * mix(vec3(0.28, 0.42, 0.58), vec3(0.30, 0.46, 0.34), forest);
  color += pow(breath, 5.0) * tint * 0.022 * vignette;
  float hush = 1.0 - quiet * 0.68;
  float livingVeil =
    pow(fbm(uv * vec2(6.0, 3.8) + vec2(-u_time * 0.024, u_time * 0.012)), 4.2) * 0.034 +
    pow(fbm(uv * vec2(18.0, 11.0) + vec2(u_time * 0.035, -u_time * 0.02)), 8.0) * 0.018;
  color += livingVeil * tint * (0.32 + peripheral * 0.5 + lowerDrift * 0.44) * hush * vignette;

  float bloom = 0.0;
  float ghost = 0.0;
  float trace = 0.0;

  for (int i = 0; i < MAX_SOULS; i++) {
    float id = float(i);
    if (id >= u_soulCount) {
      continue;
    }

    vec4 soulA = u_soulA[i];
    vec4 soulB = u_soulB[i];
    vec2 h0 = soulA.xy;
    vec2 h1 = soulA.zw;
    vec2 h2 = soulB.xy;
    vec2 seed = soulB.zw;
    float depth = mix(0.42, 1.45, seed.y);
    float width = mix(0.00135, 0.0044, pow(seed.x, 1.18)) / depth * mix(0.94, 0.8, forest);
    float widthSq = width * width;
    float alphaNoise = fract(seed.x * 1.371 + seed.y * 2.113);
    float alpha = mix(0.18, 0.64, alphaNoise) * mix(0.72, 1.05, depth);
    float trail = 0.0;
    float core = 0.0;
    float veil = 0.0;

    vec2 prev = curvePoint(id, h0, h1, h2, 0.0, u_time, aspect);
    vec2 head = prev;

    for (int j = 1; j <= SEGMENTS; j++) {
      float q0 = float(j - 1) / float(SEGMENTS);
      float q1 = float(j) / float(SEGMENTS);
      vec2 cur = curvePoint(id, h0, h1, h2, q1, u_time, aspect);
      float d2 = sdSegmentSq(p, prev, cur);
      float fade = pow(1.0 - q0, 1.7);
      float line = exp(-d2 / (widthSq * 2.0)) * fade;
      float haze = exp(-d2 / (widthSq * mix(28.0, 42.0, forest))) * fade;
      float memory = exp(-d2 / (widthSq * mix(74.0, 56.0, forest))) * fade;
      core += line;
      trail += haze;
      veil += memory;
      prev = cur;
    }

    vec2 headDelta = p - head;
    float headD2 = dot(headDelta, headDelta);
    float headGlow = exp(-headD2 / (widthSq * mix(22.0, 30.0, forest)));
    float headCore = exp(-headD2 / (widthSq * 2.6));

    float pointerD = length(head - pointer);
    float pull = smoothstep(0.42, 0.0, pointerD) * (0.14 + u_pointerEnergy * 0.28);

    float pulse = 0.74 + 0.26 * sin(u_time * mix(0.72, 1.65, seed.x) + id * 4.3);
    float soul = (core * 0.5 + trail * 0.16 + veil * 0.035 + headGlow * 0.24 + headCore * 0.72) * alpha;
    soul *= pulse;
    soul += pull * (trail + veil * 0.55) * alpha;
    soul *= mix(1.0, 0.28, quiet);

    float headMix = saturate(headCore * 0.8 + pull * 1.4);
    vec3 soulColor = mix(tint, accent, headMix);
    color += soul * soulColor;
    bloom += soul;
    ghost += (trail + veil * 0.35) * alpha;
    trace += veil * alpha;
  }

  float listenerD = length(p - pointer);
  float listener = exp(-(listenerD * listenerD) / 0.012) * u_pointerEnergy;
  float listenerRing = pow(saturate(1.0 - abs(sin(listenerD * 72.0 - u_time * 1.8))), 18.0) * u_pointerEnergy;

  bloom = bloom / (1.0 + bloom * 0.82);

  color += pow(max(bloom, 0.0), 1.62) * accent * 0.085;
  color += ghost * tint * 0.018;
  color += trace * accent * 0.009;
  color += (listener * 0.055 + listenerRing * 0.025) * accent * vignette;

  color *= u_intensity;
  color *= mix(0.58, 1.0, vignette);
  color *= smoothstep(1.0, 0.82, uv.y);
  color *= mix(1.0, 0.46, quiet);

  float grain = hash12(uv * u_resolution + fract(u_time) * 19.0) - 0.5;
  color += grain * 0.012 * vignette;
  color = max(color, vec3(0.0));

  float alpha = clamp(max(max(color.r, color.g), color.b) * 1.12, 0.0, mix(0.82, 0.5, quiet));
  gl_FragColor = vec4(color, alpha);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader compile error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown WebGL link error";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function fract(value) {
  return value - Math.floor(value);
}

function hash21(x, y) {
  let px = fract(x * 0.1031);
  let py = fract(y * 0.1031);
  let pz = fract(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px += d;
  py += d;
  pz += d;
  return fract((px + py) * pz);
}

function hash22(x, y) {
  const n = hash21(x, y);
  return [n, hash21(x + n + 19.19, y + n + 19.19)];
}

function buildSoulUniforms() {
  const soulA = new Float32Array(48 * 4);
  const soulB = new Float32Array(48 * 4);

  for (let i = 0; i < 48; i += 1) {
    const h0 = hash22(i, 1.7);
    const h1 = hash22(i, 9.3);
    const h2 = hash22(i, 21.8);
    const seed = hash22(i, 4.7);
    const base = i * 4;

    soulA[base] = h0[0];
    soulA[base + 1] = h0[1];
    soulA[base + 2] = h1[0];
    soulA[base + 3] = h1[1];
    soulB[base] = h2[0];
    soulB[base + 1] = h2[1];
    soulB[base + 2] = seed[0];
    soulB[base + 3] = seed[1];
  }

  return { soulA, soulB };
}

const SOUL_UNIFORMS = buildSoulUniforms();

export default function WebGLAmbientField({
  enabled = false,
  preset = "sea",
  intensity = 1,
  maxDpr = 1.25,
  maxRenderPixels = 1200000,
  fps = 60,
  soulScale = 1,
  readability = 0,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false, energy: 0 });

  useEffect(() => {
    if (!enabled) return undefined;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      }) || canvas.getContext("experimental-webgl", { alpha: true });

    if (!gl) return undefined;

    let program;
    try {
      program = createProgram(gl);
    } catch (error) {
      if (import.meta.env.DEV) console.warn("[WebGLAmbientField]", error);
      return undefined;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const locations = {
      position: gl.getAttribLocation(program, "a_position"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      pointer: gl.getUniformLocation(program, "u_pointer"),
      time: gl.getUniformLocation(program, "u_time"),
      intensity: gl.getUniformLocation(program, "u_intensity"),
      preset: gl.getUniformLocation(program, "u_preset"),
      pointerEnergy: gl.getUniformLocation(program, "u_pointerEnergy"),
      readability: gl.getUniformLocation(program, "u_readability"),
      soulCount: gl.getUniformLocation(program, "u_soulCount"),
      soulA: gl.getUniformLocation(program, "u_soulA[0]"),
      soulB: gl.getUniformLocation(program, "u_soulB[0]"),
    };

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform4fv(locations.soulA, SOUL_UNIFORMS.soulA);
    gl.uniform4fv(locations.soulB, SOUL_UNIFORMS.soulB);

    let width = 1;
    let height = 1;
    let dpr = 1;
    let last = performance.now();
    const frameInterval = fps > 0 && fps < 60 ? 1000 / fps : 0;
    const soulCount = Math.max(8, Math.min(48, Math.floor((preset === "forest" ? 42 : 48) * soulScale)));
    let visible = document.visibilityState !== "hidden";

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelBudgetDpr = Math.sqrt(maxRenderPixels / Math.max(width * height, 1));
      dpr = Math.max(0.55, Math.min(window.devicePixelRatio || 1, maxDpr, pixelBudgetDpr));

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function onPointerMove(event) {
      const pointer = pointerRef.current;
      const nextX = event.clientX / Math.max(width, 1);
      const nextY = 1 - event.clientY / Math.max(height, 1);
      const velocity = Math.hypot(nextX - pointer.x, nextY - pointer.y);

      pointer.x = nextX;
      pointer.y = nextY;
      pointer.energy = Math.min(1, pointer.energy + velocity * 7.5);
      pointer.active = true;
    }

    function onPointerLeave() {
      pointerRef.current.active = false;
    }

    function onVisibilityChange() {
      visible = document.visibilityState !== "hidden";
      if (visible && !rafRef.current) {
        last = performance.now();
        rafRef.current = requestAnimationFrame(render);
      }
    }

    function render(now) {
      rafRef.current = 0;
      if (!visible) return;

      if (frameInterval && now - last < frameInterval) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      last = now;

      const pointer = pointerRef.current;
      if (!pointer.active) {
        pointer.x += (0.5 - pointer.x) * 0.015;
        pointer.y += (0.5 - pointer.y) * 0.015;
      }
      pointer.energy *= pointer.active ? 0.925 : 0.955;

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(locations.resolution, canvas.width, canvas.height);
      gl.uniform2f(locations.pointer, pointer.x, pointer.y);
      gl.uniform1f(locations.time, now * 0.001);
      gl.uniform1f(locations.intensity, intensity);
      gl.uniform1f(locations.preset, preset === "forest" ? 1 : 0);
      gl.uniform1f(locations.pointerEnergy, pointer.energy);
      gl.uniform1f(locations.readability, readability);
      gl.uniform1f(locations.soulCount, soulCount);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [enabled, preset, intensity, maxDpr, maxRenderPixels, fps, soulScale, readability]);

  if (!enabled) return null;

  return (
    <div className={styles.wrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
