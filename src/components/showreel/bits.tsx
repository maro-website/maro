"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import styles from "./Showreel.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

export function band(index: number, count: number, floor = 0) {
  const step = 1 / Math.max(1, count - 1);
  const center = index * step;
  const half = step * 0.42;
  if (index <= 0) {
    return {
      input: [0, step * 0.42, step],
      output: [1, 1, floor],
    };
  }
  if (index >= count - 1) {
    return {
      input: [Math.max(0, center - step), Math.max(0, center - half), 1],
      output: [floor, 1, 1],
    };
  }
  return {
    input: [
      Math.max(0, center - step * 0.9),
      center - half,
      center + half,
      Math.min(1, center + step * 0.9),
    ],
    output: [floor, 1, 1, floor],
  };
}

export function SplitWords({
  text,
  className,
  delay = 0,
  inView = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={`${styles.splitBlock} ${className ?? ""}`}>
      {words.map((word, index) => {
        const hidden = { y: "110%" };
        const shown = { y: "0%" };
        const transition = { duration: 0.9, delay: delay + index * 0.06, ease: EASE };
        return (
          <span className={styles.splitItem} key={`${word}-${index}`}>
            <span className={styles.splitMask}>
              {reduce ? (
                <span className={styles.splitWord}>{word}</span>
              ) : (
                <motion.span
                  className={styles.splitWord}
                  initial={hidden}
                  animate={inView ? undefined : shown}
                  whileInView={inView ? shown : undefined}
                  viewport={inView ? { once: true, margin: "-10%" } : undefined}
                  transition={transition}
                >
                  {word}
                </motion.span>
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function BlurWords({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, index) =>
        reduce ? (
          <span className={styles.blurWord} key={`${word}-${index}`}>
            {word}{" "}
          </span>
        ) : (
          <motion.span
            className={styles.blurWord}
            key={`${word}-${index}`}
            initial={{ filter: "blur(14px)", opacity: 0, y: 16 }}
            whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12%" }}
            transition={{ duration: 0.85, delay: index * 0.05, ease: EASE }}
          >
            {word}{" "}
          </motion.span>
        ),
      )}
    </span>
  );
}

export function Magnetic({
  children,
  className,
  strength = 0.38,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 230, damping: 18, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 230, damping: 18, mass: 0.35 });

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    x.set((event.clientX - (bounds.left + bounds.width / 2)) * strength);
    y.set((event.clientY - (bounds.top + bounds.height / 2)) * strength);
  };

  return (
    <motion.div
      ref={ref}
      className={className ?? styles.magnet}
      style={reduce ? undefined : { x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(120);
  const y = useMotionValue(80);
  const background = useMotionTemplate`radial-gradient(440px circle at ${x}px ${y}px, rgba(255,255,255,0.16), transparent 58%)`;

  return (
    <div
      ref={ref}
      className={`${styles.spot} ${className ?? ""}`}
      onMouseMove={(event) => {
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds) return;
        x.set(event.clientX - bounds.left);
        y.set(event.clientY - bounds.top);
      }}
    >
      <motion.div className={styles.spotGlow} style={{ background }} />
      {children}
    </div>
  );
}

export function Tilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });

  return (
    <motion.div
      ref={ref}
      className={`${styles.tilt} ${className ?? ""}`}
      style={reduce ? undefined : { rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onMouseMove={(event) => {
        if (reduce || !ref.current) return;
        const bounds = ref.current.getBoundingClientRect();
        const px = (event.clientX - bounds.left) / bounds.width - 0.5;
        const py = (event.clientY - bounds.top) / bounds.height - 0.5;
        ry.set(px * 5);
        rx.set(-py * 5);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function ScrubValue({
  value,
  kind,
}: {
  value: MotionValue<number>;
  kind: "int" | "tenth";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const format = (n: number) => (kind === "tenth" ? n.toFixed(1) : String(Math.round(n)));
    const write = (n: number) => {
      node.textContent = format(n);
    };
    write(value.get());
    return value.on("change", write);
  }, [kind, value]);
  return <span ref={ref}>{kind === "tenth" ? "0.0" : "0"}</span>;
}

export function ProximityWord({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const chars = useMemo(() => text.split(""), [text]);

  const paint = (clientX: number | null) => {
    const root = ref.current;
    if (!root) return;
    const bounds = root.getBoundingClientRect();
    const nodes = root.querySelectorAll("span");
    nodes.forEach((node, index) => {
      const el = node as HTMLSpanElement;
      if (clientX == null || reduce) {
        el.style.fontVariationSettings = `"wght" 520`;
        return;
      }
      const center = ((index + 0.5) / chars.length) * bounds.width;
      const dist = Math.abs(clientX - bounds.left - center);
      const weight = Math.max(430, Math.min(700, 760 - dist * 1.05));
      el.style.fontVariationSettings = `"wght" ${Math.round(weight)}`;
    });
  };

  return (
    <span
      ref={ref}
      className={className}
      onMouseMove={(event) => paint(event.clientX)}
      onMouseLeave={() => paint(null)}
    >
      {chars.map((char, index) => (
        <span key={`${char}-${index}`} style={{ fontVariationSettings: `"wght" 520` }}>
          {char}
        </span>
      ))}
    </span>
  );
}

export function FadeLayer({
  index,
  count,
  progress,
  className,
  children,
  floor = 0,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  className?: string;
  children: ReactNode;
  floor?: number;
}) {
  const range = useMemo(() => band(index, count, floor), [index, count, floor]);
  const opacity = useTransform(progress, range.input, range.output);
  return (
    <motion.div className={className} style={{ opacity }}>
      {children}
    </motion.div>
  );
}

export { useReducedMotion };
