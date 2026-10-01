"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { courses, events, looks, pieces } from "./data";
import { FadeLayer, ScrubValue, Spotlight, Tilt, useReducedMotion } from "./bits";
import { ReelImage } from "./ReelImage";
import styles from "./Showreel.module.css";

function Metric() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 26, damping: 16 });
  useEffect(() => {
    if (inView) raw.set(12.4);
  }, [inView, raw]);

  return (
    <div ref={ref} className={`${styles.cell} ${styles.span5} ${styles.cellBare}`}>
      <p className={styles.cellLabel}>Median response</p>
      <p className={styles.metricValue}>
        <ScrubValue value={spring} kind="tenth" />
        <span>ms</span>
      </p>
      <p className={styles.metricNote}>Last hour, four regions. No dropped writes.</p>
      <div className={styles.ticks} aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <i key={index} data-on={index < 18 ? "true" : "false"} />
        ))}
      </div>
    </div>
  );
}

function Routes() {
  const [flags, setFlags] = useState([
    { id: "edge", label: "Public edge", on: true },
    { id: "draft", label: "Draft previews", on: false },
    { id: "audit", label: "Audit trail", on: true },
  ]);

  return (
    <div className={styles.routes}>
      {flags.map((flag) => (
        <button
          key={flag.id}
          type="button"
          className={styles.route}
          aria-pressed={flag.on}
          onClick={() =>
            setFlags((current) => current.map((item) => (item.id === flag.id ? { ...item, on: !item.on } : item)))
          }
        >
          <span>{flag.label}</span>
          <span className={flag.on ? styles.routeOn : styles.routeOff}>{flag.on ? "On" : "Off"}</span>
        </button>
      ))}
    </div>
  );
}

export function Northline() {
  const dragField = useRef<HTMLDivElement>(null);
  const loop = [...events, ...events];

  return (
    <section id="northline" className={styles.north}>
      <header className={styles.northIntro}>
        <p className={styles.kicker}>Northline</p>
        <h2>Quiet instruments for people who ship.</h2>
      </header>
      <div className={styles.bento}>
        <Metric />
        <Spotlight className={`${styles.cell} ${styles.span7} ${styles.cellDark}`}>
          <p className={styles.cellLabel}>Throughput</p>
          <svg className={styles.chart} viewBox="0 0 640 220" aria-hidden="true">
            <path
              className={styles.chartPath}
              d="M8 150 C 70 150, 90 40, 150 70 S 250 190, 320 120 S 430 20, 500 64 S 590 120, 632 48"
            />
          </svg>
          <ul className={styles.regions}>
            <li><i data-state="quiet" /> eu-central · quiet</li>
            <li><i data-state="quiet" /> us-east · quiet</li>
            <li><i data-state="warm" /> ap-south · warm</li>
            <li><i data-state="quiet" /> sa-east · quiet</li>
          </ul>
        </Spotlight>
        <Tilt className={`${styles.cell} ${styles.span5} ${styles.cellPhoto}`}>
          <ReelImage
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80"
            alt="A quiet work room with a long table and daylight"
            tone="dark"
          />
          <p className={styles.photoCap}>Field kit, Lisbon</p>
        </Tilt>
        <div className={`${styles.cell} ${styles.span4} ${styles.cellList}`}>
          <p className={styles.cellLabel}>Ledger</p>
          <div className={styles.listWindow}>
            <div className={styles.listTrack}>
              {loop.map(([time, label], index) => (
                <p key={`${time}-${label}-${index}`}>
                  <span>{time}</span>
                  {label}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div ref={dragField} className={`${styles.cell} ${styles.span3} ${styles.cellDrag}`}>
          <p className={styles.cellLabel}>Place the region</p>
          <motion.button
            type="button"
            className={styles.token}
            drag
            dragConstraints={dragField}
            dragElastic={0.12}
            dragMomentum={false}
            aria-label="Drag the eu-central region"
          >
            EU-C
          </motion.button>
        </div>
        <div className={`${styles.cell} ${styles.span12} ${styles.statement}`}>
          <h3>The interface stays out of the work.</h3>
          <Routes />
        </div>
      </div>
    </section>
  );
}

function Piece({
  piece,
  index,
  progress,
}: {
  piece: (typeof pieces)[number];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const drift = useTransform(progress, [0, 1], index % 2 ? ["7%", "-9%"] : ["-5%", "8%"]);
  const textX = useTransform(progress, [0, 1], index % 2 ? ["-2%", "3%"] : ["3%", "-2%"]);
  return (
    <article className={index % 2 ? `${styles.marellPanel} ${styles.marellFlip}` : styles.marellPanel}>
      <div className={styles.marellPhoto}>
        <motion.div className={styles.marellDrift} style={{ x: drift }}>
          <ReelImage src={piece.image} alt={`${piece.name} by ${piece.designer}`} />
        </motion.div>
      </div>
      <motion.div className={styles.marellMeta} style={{ x: textX }}>
        <p className={styles.kicker}>
          {piece.num} / 04
        </p>
        <h3 className={styles.marellName}>{piece.name}</h3>
        <p>{piece.designer}</p>
        <p className={styles.marellYear}>{piece.year}</p>
        <p>{piece.material}</p>
      </motion.div>
    </article>
  );
}

export function Marell() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", "-300vw"]);

  return (
    <section id="marell" ref={ref} className={styles.marellPin}>
      <div className={styles.marellSticky}>
        <motion.div className={styles.marellTrack} style={{ x }}>
          {pieces.map((piece, index) => (
            <Piece key={piece.num} piece={piece} index={index} progress={scrollYProgress} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function Oru() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const local = useTransform(scrollYProgress, [0.12, 1], [0, 1]);
  const inset = useTransform(scrollYProgress, [0, 0.18], [12, 0]);
  const clipPath = useTransform(inset, (value) => `inset(${value}% ${value * 0.85}% ${value}% ${value * 0.85}%)`);
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1]);

  return (
    <section id="oru" ref={ref} className={styles.oruPin}>
      <div className={styles.oruSticky}>
        <div className={styles.oruBrand}>
          <p>Oru</p>
          <p>Autumn / Winter</p>
        </div>
        <motion.div className={styles.oruStage} style={reduce ? undefined : { clipPath, scale }}>
          {looks.map((look, index) => (
            <FadeLayer key={look.id} index={index} count={looks.length} progress={local} className={styles.oruSlide}>
              <ReelImage className={styles.oruImg} src={look.image} alt={look.title} tone="dark" position="center top" />
              <div className={styles.oruCaptionMobile}>
                <p className={styles.kickerLight}>{look.kicker}</p>
                <h2>{look.title}</h2>
                <p>{look.text}</p>
              </div>
            </FadeLayer>
          ))}
        </motion.div>
        <div className={styles.oruCaptions}>
          {looks.map((look, index) => (
            <FadeLayer key={look.id} index={index} count={looks.length} progress={local} className={styles.oruCaption}>
              <p className={styles.kickerLight}>{look.kicker}</p>
              <h2>{look.title}</h2>
              <p>{look.text}</p>
            </FadeLayer>
          ))}
        </div>
        <div className={styles.oruIndex}>
          {looks.map((look, index) => (
            <FadeLayer key={look.id} index={index} count={looks.length} progress={local} floor={0.35} className={styles.oruIndexItem}>
              <span>{look.kicker}</span>
            </FadeLayer>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Lume() {
  const [activeId, setActiveId] = useState<(typeof courses)[number]["id"]>("starters");
  const active = courses.find((course) => course.id === activeId) ?? courses[0];

  return (
    <section id="lume" className={styles.lume}>
      <div className={styles.lumeGrid}>
        <div className={styles.lumePhoto}>
          {courses.map((course) => (
            <motion.div
              key={course.id}
              className={styles.lumePhotoLayer}
              animate={{ opacity: course.id === active.id ? 1 : 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <ReelImage src={course.image} alt="" />
            </motion.div>
          ))}
          <p className={styles.lumeMark}>Casa Lume</p>
        </div>
        <div className={styles.lumeMenu}>
          <p className={styles.kicker}>Evening service</p>
          <h2>The room holds twenty-four.</h2>
          <div className={styles.lumeCats} role="tablist" aria-label="Menu">
            {courses.map((course) => {
              const on = course.id === active.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={on ? styles.lumeCatOn : styles.lumeCat}
                  onClick={() => setActiveId(course.id)}
                >
                  {on ? <motion.i layoutId="lume-mark" className={styles.lumeDot} /> : <i className={styles.lumeDotGhost} />}
                  {course.name}
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.ul
              key={active.id}
              className={styles.dishes}
              role="tabpanel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {active.dishes.map((dish) => (
                <li key={dish[0]} className={styles.dish}>
                  <div>
                    <p className={styles.dishName}>{dish[0]}</p>
                    <p className={styles.dishNote}>{dish[1]}</p>
                  </div>
                  <p className={styles.dishPrice}>{dish[2]}</p>
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
      <div className={styles.lumeReserve}>
        <div>
          <p className={styles.kickerLight}>Thursday is open</p>
          <h3>A table for two, near the window.</h3>
        </div>
        <a className={styles.reserveBtn} href="#contact">
          Reserve
        </a>
      </div>
    </section>
  );
}
