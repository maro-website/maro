"use client";

import { useEffect, useRef } from "react";

// React Bits Pattern Waves by David Haz, adapted to native WebGL for the Hub.
// The ripple/dot shaders and parameters are retained without adding a dependency.
// Source: https://github.com/DavidHDev/react-bits
// License: ./PatternWaves.LICENSE.md
const SETTINGS = {
  spacing: 5, markSize: 0.6, depth: 0.6, shine: 1.65, contrast: 0.6,
  speed: 0.15, cursorSize: 65, cursorStrength: 0.15,
} as const;

const passVertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fieldFragment = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uSize;
uniform float uDpr;
uniform vec2 uOrigin;
uniform vec2 uPitch;
uniform int uWave;
uniform float uTime;
uniform float uUnit;
uniform vec2 uHeading;
uniform float uAmp;
uniform float uDepth;
uniform vec3 uLight;
uniform float uShine;
uniform float uContrast;
uniform float uInk;
uniform float uOpacity;
uniform int uFade;
uniform float uFadeSize;
uniform float uAppear;
uniform sampler2D tRipple;
uniform float uRipple;
out vec4 fragColor;

const float FOLDS = 5.5;

uvec3 scramble(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

vec3 lattice(vec3 corner) {
  uvec3 h = scramble(uvec3(ivec3(corner) + 4096));
  return vec3(h & 65535u) / 32767.5 - 1.0;
}

float gradientNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(lattice(i), f);
  float n100 = dot(lattice(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(lattice(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(lattice(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(lattice(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(lattice(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(lattice(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(lattice(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

vec2 turn(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

float surface(vec2 p, float t) {
  if (uWave == 0) {
    vec2 side = vec2(-uHeading.y, uHeading.x);
    float u = dot(p, uHeading);
    float v = dot(p, side);
    float bend = gradientNoise(vec3(v * 0.85, u * 0.3, t * 0.05)) * 1.7 + 0.4 * sin(v * 1.6 + t * 0.2);
    float phase = u * FOLDS + bend - t * 0.45;
    float swell = 0.6 + 0.4 * gradientNoise(vec3(u * 0.55 + 3.0, v * 0.45, t * 0.04));
    float fold = sin(phase) + 0.32 * sin(2.0 * phase + 1.3);
    float ripple = 0.16 * sin(u * FOLDS * 2.5 + bend * 1.9 - t * 0.9 + 2.1);
    return (fold + ripple) * swell;
  }
  if (uWave == 1) {
    float bend = gradientNoise(vec3(p * 0.6, t * 0.05)) * 0.6;
    float phase = dot(p, uHeading) * 15.0 + bend * 2.2 - t * 1.4;
    float swell = sin(phase) + 0.3 * sin(2.0 * phase - 0.8);
    float roll = 0.75 + 0.25 * gradientNoise(vec3(p * 0.9 + 11.0, t * 0.05));
    return 0.8 * swell * roll;
  }
  float r = length(p + uHeading * 1.2);
  float bend = gradientNoise(vec3(p * 1.2, t * 0.05)) * 0.1;
  return sin((r + bend) * 9.0 - t * 1.8) * (0.45 + 0.55 * exp(-(r - 0.6) * 0.8));
}

float heightAt(vec2 css) {
  float h = surface((css - 0.5 * uSize) / uUnit, uTime) * uAmp;
  if (uRipple > 0.0) h += texture(tRipple, css / uSize).r * uRipple;
  return h;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 center = uOrigin + (cell + 0.5) * uPitch;
  vec2 css = center / uDpr;
  vec2 uv = css / uSize;
  float e = max(uPitch.y / uDpr, 4.0);
  float h = heightAt(css);
  float hx = (heightAt(css + vec2(e, 0.0)) - heightAt(css - vec2(e, 0.0))) / (2.0 * e);
  float hy = (heightAt(css + vec2(0.0, e)) - heightAt(css - vec2(0.0, e))) / (2.0 * e);
  vec2 grad = vec2(hx, hy) * uUnit * uDepth * 0.4;
  vec3 n = normalize(vec3(-grad, 1.0));

  float diffuse = clamp(dot(n, uLight), 0.0, 1.0);
  vec3 halfway = normalize(uLight + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, halfway), 0.0, 1.0), 160.0) * uShine * 1.15;
  float hollow = 0.7 + 0.3 * clamp(h * 0.5 + 0.5, 0.0, 1.0);
  float tone = clamp(diffuse * hollow * 0.78 + spec, 0.0, 1.0);
  tone = clamp((tone - 0.42) * uContrast + 0.42, 0.0, 1.0);

  float level = uInk > 0.5 ? pow(clamp(1.0 - tone / 0.46, 0.0, 1.0), 2.4) * 0.72 : pow(tone, 2.2);
  float emphasis = uInk > 0.5 ? smoothstep(0.55, 0.95, level) : clamp(spec * 1.6, 0.0, 1.0);

  float fade = 1.0;
  vec2 c = uv * 2.0 - 1.0;
  if (uFade == 1) {
    fade = 1.0 - smoothstep(1.0 - uFadeSize, 1.18, length(c));
  } else if (uFade == 2) {
    fade = mix(0.05, 1.0, smoothstep(0.08, 0.08 + uFadeSize, length(c * vec2(1.0, 1.35))));
  } else if (uFade == 3) {
    fade = smoothstep(0.0, uFadeSize, uv.y);
  } else if (uFade == 4) {
    fade = smoothstep(0.0, uFadeSize, 1.0 - uv.y);
  }

  float reach = length(css - 0.5 * uSize) / max(0.5 * length(uSize), 1.0);
  float appear = smoothstep(reach - 0.05, reach + 0.3, uAppear * 1.35);

  float alpha = uOpacity * fade * appear * (0.22 + 0.78 * level);
  float lift = clamp(h * uDepth * 0.42, -0.48, 0.48);
  fragColor = vec4(level, alpha, emphasis, lift + 0.5);
}
`;

const rippleFragment = `#version 300 es
precision highp float;
uniform sampler2D tState;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uImpulse;
uniform float uDamping;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 state = texture(tState, uv).rg;
  float left = texture(tState, uv - vec2(uTexel.x, 0.0)).r;
  float right = texture(tState, uv + vec2(uTexel.x, 0.0)).r;
  float below = texture(tState, uv - vec2(0.0, uTexel.y)).r;
  float above = texture(tState, uv + vec2(0.0, uTexel.y)).r;
  float next = ((left + right + below + above) * 0.5 - state.g) * uDamping;
  vec2 p = uv * uSize;
  vec2 segment = uTo - uFrom;
  float along = clamp(dot(p - uFrom, segment) / max(dot(segment, segment), 1e-4), 0.0, 1.0);
  float d = length(p - uFrom - segment * along) / uRadius;
  next -= uImpulse * exp(-d * d * 2.0);
  fragColor = vec4(next, state.r, 0.0, 1.0);
}
`;

const markFragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D tField;
uniform vec2 uOrigin;
uniform vec2 uPitch;
uniform vec2 uGrid;
uniform float uMarkSize;
uniform vec3 uColor;
uniform vec3 uAccent;
out vec4 fragColor;

void main() {
  vec2 rel = gl_FragCoord.xy - uOrigin;
  float cx = floor(rel.x / uPitch.x);
  float row = floor(rel.y / uPitch.y);
  vec4 ink = vec4(0.0);
  if (cx >= 0.0 && cx < uGrid.x) {
    for (int k = -1; k <= 1; k++) {
      float cy = row + float(k);
      if (cy < 0.0 || cy >= uGrid.y) continue;
      vec4 f = texelFetch(tField, ivec2(int(cx), int(cy)), 0);
      if (f.g < 0.002) continue;
      vec2 center = (vec2(cx, cy) + 0.5) * uPitch + vec2(0.0, (f.a - 0.5) * uPitch.y);
      float span = uPitch.y * uMarkSize;
      float area = max(sqrt(f.r), 0.14);
      float coverage = clamp(0.5 - (length(rel - center) - 0.5 * span * area), 0.0, 1.0);
      float alpha = coverage * f.g;
      if (alpha > ink.a) ink = vec4(mix(uColor, uAccent, f.b) * alpha, alpha);
    }
  }
  // Transparent output lets Maro's existing canvas color show through.
  fragColor = ink;
}
`;

interface Target {
  width: number;
  height: number;
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
}

export function HubPatternWaves({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) return;
    let dispose = () => { gl.getExtension("WEBGL_lose_context")?.loseContext(); };

    try {
      const makeProgram = (fragment: string) => {
        const program = gl.createProgram();
        if (!program) throw new Error("WebGL program unavailable");
        for (const [kind, source] of [[gl.VERTEX_SHADER, passVertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
          const shader = gl.createShader(kind);
          if (!shader) throw new Error("WebGL shader unavailable");
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
          gl.attachShader(program, shader);
          gl.deleteShader(shader);
        }
        gl.bindAttribLocation(program, 0, "position");
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader link failed");
        const locations = new Map<string, WebGLUniformLocation | null>();
        const location = (name: string) => {
          if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
          return locations.get(name) ?? null;
        };
        return {
          program,
          i: (name: string, value: number) => gl.uniform1i(location(name), value),
          f: (name: string, value: number) => gl.uniform1f(location(name), value),
          v2: (name: string, x: number, y: number) => gl.uniform2f(location(name), x, y),
          v3: (name: string, x: number, y: number, z: number) => gl.uniform3f(location(name), x, y, z),
        };
      };
      const field = makeProgram(fieldFragment);
      const rippleProgram = makeProgram(rippleFragment);
      const marks = makeProgram(markFragment);
      const geometry = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
      const makeTarget = (width: number, height: number, floating = false): Target => {
        const texture = gl.createTexture();
        const framebuffer = gl.createFramebuffer();
        if (!texture || !framebuffer) throw new Error("WebGL target unavailable");
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, floating ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, floating ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, floating ? gl.RGBA16F : gl.RGBA8, width, height, 0, gl.RGBA, floating ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("WebGL target incomplete");
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return { width, height, texture, framebuffer };
      };
      const release = (target: Target) => { gl.deleteFramebuffer(target.framebuffer); gl.deleteTexture(target.texture); };
      const blank = makeTarget(1, 1);
      let fieldTarget = makeTarget(1, 1);
      let ripple: { read: Target; write: Target } | null = null;
      const texture = (value: WebGLTexture) => { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, value); };
      const target = (value: Target | null) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, value?.framebuffer ?? null);
        gl.viewport(0, 0, value?.width ?? canvas.width, value?.height ?? canvas.height);
      };
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let width = 1, height = 1, raf = 0, last = performance.now(), time = 0, intro = 0;
      let alive = true, visible = true, rippleUntil = 0, rippleLive = false, rippleClock = 0;
      const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, inside: false, placed: false, burst: 0 };
      const clearRipple = () => {
        if (!ripple) return;
        for (const value of [ripple.read, ripple.write]) { target(value); gl.clear(gl.COLOR_BUFFER_BIT); }
        rippleLive = false;
      };
      const frame = (now: number) => {
        raf = 0;
        if (!alive || !visible || document.hidden) return;
        const dt = Math.min(0.05, Math.max(1 / 240, (now - last) / 1000));
        last = now;
        if (!motion.matches) time += dt * SETTINGS.speed;
        intro = motion.matches ? 1 : Math.min(1, intro + dt / 2);
        const appear = 1 - Math.pow(1 - Math.min(intro / 0.75, 1), 3);
        const rise = Math.max(0, Math.min((intro - 0.1) / 0.9, 1));
        if (ripple && !motion.matches && pointer.inside && !pointer.placed) {
          pointer.lastX = pointer.x; pointer.lastY = pointer.y; pointer.placed = true;
        }
        if (!motion.matches && (pointer.inside || pointer.burst > 0)) rippleUntil = now + 5000;
        const rippleActive = !!ripple && !motion.matches && now < rippleUntil;
        if (rippleActive && ripple) {
          rippleClock = Math.min(rippleClock + dt * 60, 4);
          const moved = Math.hypot(pointer.x - pointer.lastX, pointer.y - pointer.lastY);
          let impulse = ((pointer.inside ? Math.min(moved / 14, 1) * 0.35 : 0) + pointer.burst) * SETTINGS.cursorStrength;
          pointer.burst = 0;
          gl.useProgram(rippleProgram.program);
          rippleProgram.i("tState", 0);
          rippleProgram.v2("uTexel", 1 / ripple.read.width, 1 / ripple.read.height);
          rippleProgram.v2("uSize", width, height);
          rippleProgram.v2("uFrom", pointer.lastX, height - pointer.lastY);
          rippleProgram.v2("uTo", pointer.x, height - pointer.y);
          rippleProgram.f("uRadius", SETTINGS.cursorSize);
          rippleProgram.f("uDamping", 0.975);
          while (rippleClock >= 1) {
            rippleClock -= 1;
            texture(ripple.read.texture);
            rippleProgram.f("uImpulse", impulse);
            target(ripple.write);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            [ripple.read, ripple.write] = [ripple.write, ripple.read];
            impulse = 0;
          }
          pointer.lastX = pointer.x; pointer.lastY = pointer.y;
          rippleLive = true;
        } else if (rippleLive) clearRipple();

        const dpr = canvas.width / width;
        const pitch = Math.max(4, Math.round(SETTINGS.spacing * dpr));
        const cols = Math.min(4096, Math.ceil(canvas.width / pitch) + 1);
        const rows = Math.min(4096, Math.ceil(canvas.height / pitch) + 2);
        const originX = Math.floor((canvas.width - cols * pitch) / 2);
        const originY = Math.floor((canvas.height - rows * pitch) / 2);
        if (fieldTarget.width !== cols || fieldTarget.height !== rows) {
          release(fieldTarget); fieldTarget = makeTarget(cols, rows);
        }
        const heading = 20 * Math.PI / 180;
        const light = 200 * Math.PI / 180;
        gl.useProgram(field.program);
        field.v2("uSize", width, height);
        field.f("uDpr", dpr);
        field.v2("uOrigin", originX, originY);
        field.v2("uPitch", pitch, pitch);
        field.i("uWave", 2);
        field.f("uTime", time);
        field.f("uUnit", 520);
        field.v2("uHeading", Math.cos(heading), Math.sin(heading));
        field.f("uAmp", rise * rise * (3 - 2 * rise));
        field.f("uDepth", SETTINGS.depth);
        field.v3("uLight", Math.cos(light) * 0.78, Math.sin(light) * 0.78, 0.62);
        field.f("uShine", SETTINGS.shine);
        field.f("uContrast", SETTINGS.contrast);
        field.f("uInk", 0);
        field.f("uOpacity", 1);
        field.i("uFade", 3);
        field.f("uFadeSize", 0.5);
        field.f("uAppear", appear);
        field.i("tRipple", 0);
        field.f("uRipple", rippleLive ? 0.32 : 0);
        texture(ripple && rippleLive ? ripple.read.texture : blank.texture);
        target(fieldTarget);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.useProgram(marks.program);
        marks.i("tField", 0);
        marks.v2("uOrigin", originX, originY);
        marks.v2("uPitch", pitch, pitch);
        marks.v2("uGrid", cols, rows);
        marks.f("uMarkSize", SETTINGS.markSize);
        marks.v3("uColor", 0, 1, 114 / 255);
        marks.v3("uAccent", 0.55, 1, 114 / 255 + (1 - 114 / 255) * 0.55);
        texture(fieldTarget.texture);
        target(null);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!motion.matches) raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (!raf && alive && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
      };
      const resize = () => {
        width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.5e6 / (width * height)));
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        const rw = Math.max(4, Math.min(512, Math.ceil(width / 8)));
        const rh = Math.max(4, Math.min(512, Math.ceil(height / 8)));
        if (floatTargets && (!ripple || ripple.read.width !== rw || ripple.read.height !== rh)) {
          if (ripple) { release(ripple.read); release(ripple.write); }
          ripple = { read: makeTarget(rw, rh, true), write: makeTarget(rw, rh, true) };
          rippleLive = false;
        }
        start();
      };
      const locate = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
      };
      const move = (event: PointerEvent) => {
        const spot = locate(event);
        if (spot.inside !== pointer.inside) pointer.placed = false;
        Object.assign(pointer, spot);
        if (spot.inside && !motion.matches) start();
      };
      const down = (event: PointerEvent) => {
        const spot = locate(event);
        if (!spot.inside || motion.matches) return;
        if (!pointer.inside) { pointer.lastX = spot.x; pointer.lastY = spot.y; }
        Object.assign(pointer, spot); pointer.burst = 1.2; start();
      };
      const leave = () => { pointer.inside = false; pointer.placed = false; };
      const out = (event: PointerEvent) => { if (!event.relatedTarget) leave(); };
      const up = (event: PointerEvent) => { if (event.pointerType === "touch") leave(); };
      const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); };
      const changeMotion = () => { clearRipple(); pointer.burst = 0; start(); };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start(); else { cancelAnimationFrame(raf); raf = 0; }
      });
      intersectionObserver.observe(canvas);
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", down, { passive: true });
      window.addEventListener("pointerout", out, { passive: true });
      window.addEventListener("pointerup", up, { passive: true });
      window.addEventListener("blur", leave);
      document.addEventListener("visibilitychange", visibility);
      motion.addEventListener("change", changeMotion);
      dispose = () => {
        alive = false; cancelAnimationFrame(raf);
        resizeObserver.disconnect(); intersectionObserver.disconnect();
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerout", out); window.removeEventListener("pointerup", up);
        window.removeEventListener("blur", leave); document.removeEventListener("visibilitychange", visibility);
        motion.removeEventListener("change", changeMotion);
        release(blank); release(fieldTarget);
        if (ripple) { release(ripple.read); release(ripple.write); }
        for (const value of [field, rippleProgram, marks]) gl.deleteProgram(value.program);
        gl.deleteBuffer(geometry);
        target(null);
        gl.clear(gl.COLOR_BUFFER_BIT);
      };
      resize();
    } catch {
      // Decorative only: the original Hub still works if WebGL is unavailable.
      dispose();
    }
    return dispose;
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
