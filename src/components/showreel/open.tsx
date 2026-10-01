"use client";

import { useRef, useState, type MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { services, works } from "./data";
import { SplitWords, useReducedMotion } from "./bits";
import { ReelImage } from "./ReelImage";
import styles from "./Showreel.module.css";

export function Bridge({
  word,
  from,
  to,
  ink,
  inkTo,
  face,
}: {
  word: string;
  from: string;
  to: string;
  ink: string;
  inkTo: string;
  face: "serif" | "grotesk" | "display";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["10%", "-14%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.14, 0.8, 1], [0, 1, 1, 0.15]);
  const tracking = useTransform(scrollYProgress, [0, 0.75], face === "grotesk" ? [-0.07, 0.16] : [-0.05, 0.02]);
  const letterSpacing = useTransform(tracking, (value) => `${value}em`);
  const color = useTransform(scrollYProgress, [0, 1], [ink, inkTo]);
  const backgroundColor = useTransform(scrollYProgress, [0, 1], [from, to]);
  const faceClass =
    face === "serif" ? styles.bridgeSerif : face === "display" ? styles.bridgeDisplay : styles.bridgeGrotesk;

  return (
    <section ref={ref} className={styles.bridge} aria-hidden="true">
      <motion.div className={styles.bridgeSticky} style={reduce ? { backgroundColor: to } : { backgroundColor }}>
        <motion.p
          className={`${styles.bridgeWord} ${faceClass}`}
          data-long={word.length > 8 ? "true" : "false"}
          style={reduce ? { color: inkTo } : { y, opacity, letterSpacing, color }}
        >
          {word}
        </motion.p>
      </motion.div>
    </section>
  );
}

export function Orris() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const imgX = useSpring(useTransform(px, (value) => value * -28), { stiffness: 70, damping: 18 });
  const imgY = useSpring(useTransform(py, (value) => value * -20), { stiffness: 70, damping: 18 });
  const typeX = useSpring(useTransform(px, (value) => value * 16), { stiffness: 70, damping: 18 });
  const typeY = useSpring(useTransform(py, (value) => value * 10), { stiffness: 70, damping: 18 });

  const onMove = (event: MouseEvent<HTMLElement>) => {
    if (reduce) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - bounds.left) / bounds.width - 0.5);
    py.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  return (
    <section
      id="orris"
      className={styles.orris}
      onMouseMove={onMove}
      onMouseLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <div className={styles.grain} />
      <div className={styles.orrisTop}>
        <span>Maison Orris</span>
        <span>Paris</span>
        <span>No. 04</span>
      </div>
      <div className={styles.orrisStage}>
        <motion.div className={styles.orrisCopy} style={reduce ? undefined : { x: typeX, y: typeY }}>
          <h1 className={styles.orrisTitle}>
            <SplitWords text="Night" />
            <SplitWords text="Bloom" delay={0.08} />
          </h1>
          <p className={styles.orrisLede}>A green chypre cut with iris and cold smoke. Worn close, then forgotten until someone else notices.</p>
          <ul className={styles.orrisNotes}>
            <li>Iris absolute</li>
            <li>Vetiver</li>
            <li>Bergamot</li>
            <li>50 ml</li>
          </ul>
          <p className={styles.orrisScroll}>
            <span className={styles.orrisLine} />
            Scroll
          </p>
        </motion.div>
        <div className={styles.orrisFigure}>
          <motion.div className={styles.fill} style={reduce ? undefined : { x: imgX, y: imgY }}>
            <motion.div
              className={styles.orrisStill}
              initial={reduce ? false : { clipPath: "inset(16% 12% 16% 12%)", scale: 1.06 }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1 }}
              transition={{ duration: 1.45, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
            >
              <svg className={styles.orrisSvg} viewBox="0 0 420 680" role="img" aria-label="Night Bloom bottle">
                <defs>
                  <linearGradient id="orris-liquid" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f6efe4" />
                    <stop offset="42%" stopColor="#e7b48a" />
                    <stop offset="100%" stopColor="#8d4b34" />
                  </linearGradient>
                  <linearGradient id="orris-cap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f3ecdf" />
                    <stop offset="100%" stopColor="#b89b6e" />
                  </linearGradient>
                </defs>
                <rect x="168" y="78" width="84" height="28" fill="url(#orris-cap)" />
                <rect x="188" y="106" width="44" height="46" fill="#efe6d6" />
                <path d="M132 168h156l18 36v332c0 18-16 32-36 32H150c-20 0-36-14-36-32V204z" fill="url(#orris-liquid)" />
                <path d="M150 196h18v340h-8c-12 0-20-8-22-18z" fill="#fff" opacity="0.34" />
                <path d="M250 214c22 30 28 90 18 180" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="8" strokeLinecap="round" />
                <rect x="156" y="318" width="108" height="132" fill="#f7f1e7" />
                <text x="210" y="366" textAnchor="middle" fill="#1c1915" fontSize="13" letterSpacing="3">
                  ORRIS
                </text>
                <text x="210" y="402" textAnchor="middle" fill="#1c1915" fontSize="34" fontFamily="Instrument Serif, Georgia, serif">
                  04
                </text>
                <text x="210" y="428" textAnchor="middle" fill="#1c1915" fontSize="10" letterSpacing="1.5">
                  NIGHT BLOOM
                </text>
              </svg>
            </motion.div>
          </motion.div>
          <p className={styles.orrisVertical}>Eau de Parfum</p>
        </div>
      </div>
    </section>
  );
}

export function Halden() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const top = useTransform(scrollYProgress, [0, 0.62], [12, 0]);
  const right = useTransform(scrollYProgress, [0, 0.62], [40, 0]);
  const bottom = useTransform(scrollYProgress, [0, 0.62], [26, 0]);
  const left = useTransform(scrollYProgress, [0, 0.62], [5, 0]);
  const clipPath = useMotionTemplate`inset(${top}% ${right}% ${bottom}% ${left}%)`;
  const sideOpacity = useTransform(scrollYProgress, [0.12, 0.42], [1, 0]);
  const numOpacity = useTransform(scrollYProgress, [0, 0.36], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.7], ["0vh", "-4vh"]);
  const titleX = useTransform(scrollYProgress, [0.15, 0.7], ["0vw", "6vw"]);
  const titleColor = useTransform(scrollYProgress, [0.32, 0.52], ["#161616", "#f6f3ee"]);
  const scrim = useTransform(scrollYProgress, [0.28, 0.58], [0, 1]);
  const feature = works[0];

  return (
    <div className={styles.halden}>
      <section id="halden" ref={ref} className={styles.haldenPin} aria-labelledby="halden-title">
        <div className={styles.haldenSticky}>
          <motion.div className={styles.haldenClip} style={reduce ? undefined : { clipPath }}>
            <ReelImage src={feature.image} alt={feature.title} tone="light" position="center" />
            <motion.div className={styles.haldenScrim} style={{ opacity: reduce ? 0.55 : scrim }} />
          </motion.div>
          <motion.figure className={`${styles.haldenSide} ${styles.haldenSideTop}`} style={{ opacity: sideOpacity }}>
            <ReelImage src={works[1].image} alt={works[1].title} />
            <figcaption>02 {works[1].title}</figcaption>
          </motion.figure>
          <motion.figure className={`${styles.haldenSide} ${styles.haldenSideBot}`} style={{ opacity: sideOpacity }}>
            <ReelImage src={works[2].image} alt={works[2].title} />
            <figcaption>03 {works[2].title}</figcaption>
          </motion.figure>
          <motion.p className={styles.haldenNum} style={{ opacity: numOpacity }}>
            01
          </motion.p>
          <motion.div className={styles.haldenTitle} style={reduce ? undefined : { x: titleX, y: titleY, color: titleColor }}>
            <p className={styles.kicker}>Halden — Selected works</p>
            <h2 id="halden-title">{feature.title}</h2>
            <p>
              {feature.place} · {feature.year}
            </p>
          </motion.div>
        </div>
      </section>
      <div className={styles.haldenFollow}>
        {works.slice(1).map((work, index) => (
          <article key={work.num} className={index % 2 ? styles.haldenSpreadAlt : styles.haldenSpread}>
            <div>
              <p className={styles.haldenSpreadNum}>{work.num}</p>
              <h3>{work.title}</h3>
              <p className={styles.haldenMeta}>
                {work.place} · {work.year}
              </p>
              <p className={styles.haldenNote}>{work.note}</p>
            </div>
            <motion.div
              className={styles.haldenSpreadMedia}
              initial={reduce ? false : { clipPath: "inset(14% 10% 14% 10%)" }}
              whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <ReelImage src={work.image} alt={work.title} />
            </motion.div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Kline() {
  const [activeId, setActiveId] = useState<(typeof services)[number]["id"]>(services[0].id);
  const [cursor, setCursor] = useState(false);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 280, damping: 28, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 280, damping: 28, mass: 0.4 });
  const active = services.find((service) => service.id === activeId) ?? services[0];
  const ticker = "Strategy — Identity — Digital — Campaigns — Motion — ";

  return (
    <section
      id="kline"
      className={styles.kline}
      style={{ backgroundColor: active.bg, color: active.fg }}
      onMouseMove={(event) => {
        x.set(event.clientX);
        y.set(event.clientY);
      }}
      onMouseEnter={() => setCursor(true)}
      onMouseLeave={() => setCursor(false)}
    >
      <div className={styles.klineTop}>
        <h2>Kline</h2>
        <p>Studio, since 2014</p>
      </div>
      <div className={styles.klineLayout}>
        <div className={styles.klineList}>
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              className={service.id === active.id ? styles.klineOn : styles.klineService}
              onMouseEnter={() => setActiveId(service.id)}
              onFocus={() => setActiveId(service.id)}
            >
              {service.name}
            </button>
          ))}
          <p className={styles.klineCopy} key={active.id}>
            {active.text}
          </p>
        </div>
        <div className={styles.klineFigure}>
          {services.map((service) => (
            <div key={service.id} className={styles.klineShot} style={{ opacity: service.id === active.id ? 1 : 0 }}>
              <ReelImage src={service.image} alt={`${service.name} study`} tone="dark" />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.klineMarquee} aria-hidden="true">
        <div className={styles.klineMarqueeTrack}>
          <span>{ticker.repeat(4)}</span>
          <span>{ticker.repeat(4)}</span>
        </div>
      </div>
      <motion.div
        className={styles.klineCursor}
        style={{ x: sx, y: sy, opacity: cursor ? 1 : 0 }}
        aria-hidden="true"
      >
        Open
      </motion.div>
    </section>
  );
}
