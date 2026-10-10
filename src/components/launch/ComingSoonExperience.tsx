"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import { isValidLaunchEmail } from "@/lib/launch/waitlist";
import styles from "./ComingSoonExperience.module.css";

type FormState = "idle" | "loading" | "success" | "error";

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  size: number;
  radius: number;
  dragged: boolean;
};

type DragState = {
  index: number;
  offsetX: number;
  offsetY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
} | null;

const SHAPES = ["fins", "triangle", "arc", "circle"] as const;

function SymbolShape({ shape }: { shape: (typeof SHAPES)[number] }) {
  if (shape === "fins") {
    return (
      <svg viewBox="0 0 113.71 113.71" aria-hidden="true">
        <polygon points="56.85 113.71 0 113.71 28.43 0 56.85 113.71" />
        <polygon points="113.71 113.71 56.85 113.71 85.28 0 113.71 113.71" />
      </svg>
    );
  }

  if (shape === "triangle") {
    return (
      <svg viewBox="0 0 113.7 113.71" aria-hidden="true">
        <polygon points="113.7 113.71 0 113.71 56.85 0 113.7 113.71" />
      </svg>
    );
  }

  if (shape === "arc") {
    return (
      <svg viewBox="0 118.7 113.71 113.71" aria-hidden="true">
        <path d="M0,232.41h33.17c.05-21.49,8.44-41.69,23.64-56.9,15.2-15.2,35.4-23.59,56.9-23.64v-33.17C50.95,118.8.1,169.66,0,232.41Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 113.7 113.7" aria-hidden="true">
      <circle cx="56.85" cy="56.85" r="56.85" />
    </svg>
  );
}

function FallingMaroSymbol() {
  const layerRef = React.useRef<HTMLDivElement>(null);
  const pieceRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const bodiesRef = React.useRef<Body[]>([]);
  const dragRef = React.useRef<DragState>(null);

  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    let frame = 0;
    let previous = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initialize() {
      if (!layer) return;
      const width = layer.clientWidth;
      const height = layer.clientHeight;
      const unit = Math.min(Math.max(width * 0.2, 150), 330);
      const sizes = [unit * 0.72, unit * 0.88, unit, unit * 0.84];
      const xPositions = [0.14, 0.37, 0.63, 0.84];
      const rotations = [-8, 5, -12, 0];

      bodiesRef.current = sizes.map((size, index) => ({
        x: width * xPositions[index],
        y: reducedMotion ? height - size * 0.54 : -size * (0.7 + index * 0.42),
        vx: 0,
        vy: reducedMotion ? 0 : 20 + index * 22,
        rotation: rotations[index],
        angularVelocity: reducedMotion ? 0 : (index - 1.5) * 5,
        size,
        radius: size * (index === 2 ? 0.43 : 0.39),
        dragged: false,
      }));

      bodiesRef.current.forEach((body, index) => {
        const element = pieceRefs.current[index];
        if (!element) return;
        element.style.width = `${body.size}px`;
        element.style.height = `${body.size}px`;
        element.style.transform = `translate3d(${body.x - body.size / 2}px, ${body.y - body.size / 2}px, 0) rotate(${body.rotation}deg)`;
      });
    }

    function resolveCollisions() {
      const bodies = bodiesRef.current;
      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          const first = bodies[i];
          const second = bodies[j];
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const distance = Math.hypot(dx, dy) || 0.001;
          const minimum = first.radius + second.radius;
          if (distance >= minimum) continue;

          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minimum - distance;
          const firstShare = first.dragged ? 0 : second.dragged ? 1 : 0.5;
          const secondShare = second.dragged ? 0 : first.dragged ? 1 : 0.5;
          first.x -= nx * overlap * firstShare;
          first.y -= ny * overlap * firstShare;
          second.x += nx * overlap * secondShare;
          second.y += ny * overlap * secondShare;

          const relativeVelocity = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
          if (relativeVelocity >= 0) continue;
          const impulse = -(1.32 * relativeVelocity) / 2;
          if (!first.dragged) {
            first.vx -= impulse * nx;
            first.vy -= impulse * ny;
          }
          if (!second.dragged) {
            second.vx += impulse * nx;
            second.vy += impulse * ny;
          }
        }
      }
    }

    function animate(now: number) {
      if (!layer) return;
      const delta = Math.min((now - previous) / 1000, 0.032);
      previous = now;
      const width = layer.clientWidth;
      const height = layer.clientHeight;

      if (!reducedMotion) {
        bodiesRef.current.forEach((body) => {
          if (body.dragged) return;
          body.vy += 1180 * delta;
          body.vx *= 0.994;
          body.angularVelocity *= 0.995;
          body.x += body.vx * delta;
          body.y += body.vy * delta;
          body.rotation += body.angularVelocity * delta;

          const half = body.size / 2;
          if (body.x < half) {
            body.x = half;
            body.vx = Math.abs(body.vx) * 0.42;
          } else if (body.x > width - half) {
            body.x = width - half;
            body.vx = -Math.abs(body.vx) * 0.42;
          }

          if (body.y > height - half) {
            body.y = height - half;
            body.vy = Math.abs(body.vy) < 28 ? 0 : -Math.abs(body.vy) * 0.28;
            body.vx *= 0.96;
            body.angularVelocity *= 0.88;
          }
        });
        resolveCollisions();
      }

      bodiesRef.current.forEach((body, index) => {
        const element = pieceRefs.current[index];
        if (!element) return;
        element.style.transform = `translate3d(${body.x - body.size / 2}px, ${body.y - body.size / 2}px, 0) rotate(${body.rotation}deg)`;
      });

      frame = requestAnimationFrame(animate);
    }

    initialize();
    frame = requestAnimationFrame(animate);
    window.addEventListener("resize", initialize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", initialize);
    };
  }, []);

  function beginDrag(event: React.PointerEvent<HTMLDivElement>, index: number) {
    const body = bodiesRef.current[index];
    if (!body) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    body.dragged = true;
    body.vx = 0;
    body.vy = 0;
    dragRef.current = {
      index,
      offsetX: event.clientX - body.x,
      offsetY: event.clientY - body.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
    };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const body = bodiesRef.current[drag.index];
    if (!body) return;
    const now = performance.now();
    const delta = Math.max((now - drag.lastTime) / 1000, 0.016);
    body.x = event.clientX - drag.offsetX;
    body.y = event.clientY - drag.offsetY;
    body.vx = (event.clientX - drag.lastX) / delta;
    body.vy = (event.clientY - drag.lastY) / delta;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;
  }

  function endDrag() {
    const drag = dragRef.current;
    if (drag) {
      const body = bodiesRef.current[drag.index];
      if (body) body.dragged = false;
    }
    dragRef.current = null;
  }

  return (
    <div ref={layerRef} className={styles.symbolField} aria-hidden="true">
      {SHAPES.map((shape, index) => (
        <div
          key={shape}
          ref={(element) => {
            pieceRefs.current[index] = element;
          }}
          className={styles.symbolPiece}
          onPointerDown={(event) => beginDrag(event, index)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <SymbolShape shape={shape} />
        </div>
      ))}
    </div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [state, setState] = React.useState<FormState>("idle");
  const [message, setMessage] = React.useState("");
  const submittingRef = React.useRef(false);
  const honeypotRef = React.useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!isValidLaunchEmail(email)) {
      setState("error");
      setMessage("Shkruaje një e-mail adresë të vlefshme.");
      return;
    }

    if (!consent) {
      setState("error");
      setMessage("Konfirmoje që mundemi me ta dërgu 1 email kur të lansohet.");
      return;
    }

    submittingRef.current = true;
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/launch-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: honeypotRef.current?.value ?? "" }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (response.ok && result?.ok) {
        setState("success");
        return;
      }

      setState("error");
      setMessage(
        response.status === 429
          ? "Pak më ngadalë. Provo përsëri pas pak."
          : result?.error === "invalid_email"
            ? "Shkruaje një e-mail adresë të vlefshme."
            : "S’u regjistru. Provo edhe një herë."
      );
    } catch {
      setState("error");
      setMessage("S’u regjistru. Kontrollo lidhjen dhe provo përsëri.");
    } finally {
      submittingRef.current = false;
    }
  }

  if (state === "success") {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <strong>U kry.</strong>
        <span>Ta dërgojmë vetëm 1 email kur të lansohet.</span>
      </div>
    );
  }

  return (
    <form className={styles.waitlist} onSubmit={submit} noValidate>
      <input
        ref={honeypotRef}
        className={styles.honeypot}
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className={styles.emailBox} data-invalid={state === "error" || undefined}>
        <label className="sr-only" htmlFor="launch-email">
          E-mail adresa
        </label>
        <input
          id="launch-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="Shkruje e-mail adresën tonde"
          value={email}
          disabled={state === "loading"}
          aria-invalid={state === "error"}
          aria-describedby="launch-consent launch-email-message"
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === "error") {
              setState("idle");
              setMessage("");
            }
          }}
        />
        <button type="submit" disabled={state === "loading"}>
          <span>{state === "loading" ? "Prit…" : "Abonohu"}</span>
          <i className={styles.generateIcon} aria-hidden="true" />
        </button>
      </div>

      <label id="launch-consent" className={styles.consent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            if (state === "error") {
              setState("idle");
              setMessage("");
            }
          }}
        />
        <span>Pranoj që maro mundet me m’dërgu vetëm 1 email kur të lansohet.</span>
      </label>

      <p id="launch-email-message" className={styles.formMessage} role={state === "error" ? "alert" : undefined}>
        {message || "\u00a0"}
      </p>
    </form>
  );
}

export function ComingSoonExperience() {
  return (
    <main className={styles.page}>
      <FallingMaroSymbol />

      <section className={styles.content} aria-labelledby="launch-title">
        <h1 id="launch-title" className={styles.title} aria-label="po marohet">
          <span>po</span>
          {/* Official text-only wordmark must stay an SVG, not a recreated font treatment. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/maro-logo-textonly.svg" alt="" aria-hidden="true" draggable={false} />
          <span>het</span>
        </h1>
        <WaitlistForm />
      </section>
    </main>
  );
}
