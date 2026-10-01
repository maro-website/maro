"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { destinations, photo, plans, questions, quotes } from "./data";
import { BlurWords, FadeLayer, ScrubValue, useReducedMotion } from "./bits";
import { ReelImage } from "./ReelImage";
import styles from "./Showreel.module.css";

const stats = [
  { label: "0–100", value: 3.2, kind: "tenth" as const, unit: "s" },
  { label: "Power", value: 612, kind: "int" as const, unit: "ps" },
  { label: "Torque", value: 780, kind: "int" as const, unit: "Nm" },
  { label: "Range", value: 540, kind: "int" as const, unit: "km" },
];

export function Vant() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);
  const dash = useTransform(scrollYProgress, [0, 0.55], [280, 0]);
  const statsOpacity = useTransform(scrollYProgress, [0.08, 0.22], [0, 1]);
  const numbers = [
    useTransform(scrollYProgress, [0.12, 0.4], [0, stats[0].value]),
    useTransform(scrollYProgress, [0.22, 0.5], [0, stats[1].value]),
    useTransform(scrollYProgress, [0.32, 0.62], [0, stats[2].value]),
    useTransform(scrollYProgress, [0.42, 0.74], [0, stats[3].value]),
  ];

  return (
    <section id="vant" ref={ref} className={styles.vantPin}>
      <div className={styles.vantSticky}>
        <motion.div className={styles.vantMedia} style={reduce ? undefined : { scale, y }}>
          <ReelImage
            src={photo("photo-1449965408869-eaa3f722e40d")}
            alt="A road seen from the driver's seat, moving through trees"
            tone="dark"
            position="center"
          />
        </motion.div>
        <div className={styles.vantShade} />
        <svg className={styles.vantLines} viewBox="0 0 1200 700" aria-hidden="true">
          <motion.path d="M80 120 H1120" style={{ strokeDashoffset: dash }} />
          <motion.path d="M80 120 V620" style={{ strokeDashoffset: dash }} />
          <motion.path d="M80 620 H520" style={{ strokeDashoffset: dash }} />
        </svg>
        <div className={styles.vantName}>
          <p className={styles.kickerLight}>Vant</p>
          <h2>Type 7</h2>
          <p>Rear-drive grand tourer. Limited to forty.</p>
        </div>
        <motion.div className={styles.vantStats} style={reduce ? undefined : { opacity: statsOpacity }}>
          {stats.map((stat, index) => (
            <p key={stat.label} className={styles.vantStat}>
              <span className={styles.vantStatLabel}>{stat.label}</span>
              <span className={styles.vantStatValue} aria-label={`${stat.value} ${stat.unit}`}>
                <span className={styles.scrub} aria-hidden="true">
                  {reduce ? stat.value.toFixed(stat.kind === "tenth" ? 1 : 0) : <ScrubValue value={numbers[index]} kind={stat.kind} />}
                </span>
                <span className={styles.staticNum} aria-hidden="true">
                  {stat.kind === "tenth" ? stat.value.toFixed(1) : stat.value}
                </span>
                <small>{stat.unit}</small>
              </span>
            </p>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function Meridian() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const local = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.max(0, Math.min(destinations.length - 1, Math.round(value * (destinations.length - 1))));
    setActive((current) => (current === next ? current : next));
  });

  const jump = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const start = el.getBoundingClientRect().top + window.scrollY;
    const distance = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: start + distance * (index / (destinations.length - 1)), behavior: "smooth" });
  };

  return (
    <section id="meridian" ref={ref} className={styles.merPin}>
      <div className={styles.merSticky}>
        {destinations.map((place, index) => (
          <FadeLayer key={place.id} index={index} count={destinations.length} progress={local} className={styles.merSlide}>
            <article id={place.id} className={styles.merArticle}>
              <ReelImage src={place.image} alt={place.city} tone="dark" />
              <div className={styles.merWash} style={{ backgroundColor: place.wash }} />
              <div className={styles.merCopy}>
                <p className={styles.kickerLight}>{place.coords}</p>
                <h2>{place.city}</h2>
                <p>{place.text}</p>
              </div>
            </article>
          </FadeLayer>
        ))}
        <div className={styles.merIndex}>
          <p>Meridian</p>
          {destinations.map((place, index) => (
            <button
              key={place.id}
              type="button"
              className={index === active ? styles.merBtnOn : styles.merBtn}
              onClick={() => jump(index)}
            >
              {place.city}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Voices() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", "-237vw"]);

  return (
    <section id="voices" ref={ref} className={styles.voicesPin}>
      <div className={styles.voicesSticky}>
        <div className={styles.voicesHead}>
          <p className={styles.kicker}>Margin</p>
          <h2>Said plainly.</h2>
        </div>
        <motion.div className={styles.voicesTrack} style={{ x }}>
          {quotes.map((quote, index) => (
            <article key={quote.id} className={index % 2 ? `${styles.voice} ${styles.voiceFlip}` : styles.voice}>
              <ReelImage className={styles.voicePhoto} src={quote.image} alt={quote.name} position="center top" />
              <div>
                <blockquote className={styles.voiceQuote}>{quote.quote}</blockquote>
                <p className={styles.voiceWho}>
                  {quote.name}
                  <span>{quote.meta}</span>
                </p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function Circle() {
  const [open, setOpen] = useState<(typeof plans)[number]["id"]>("member");

  return (
    <section id="circle" className={styles.circle}>
      <header className={styles.circleHead}>
        <p className={styles.kickerLight}>Circle</p>
        <h2>Membership for people who stay.</h2>
      </header>
      <div>
        {plans.map((plan) => {
          const on = plan.id === open;
          return (
            <button
              key={plan.id}
              type="button"
              className={on ? `${styles.plan} ${styles.planOn}` : styles.plan}
              aria-expanded={on}
              onClick={() => setOpen(plan.id)}
              onMouseEnter={() => setOpen(plan.id)}
            >
              <span className={styles.planRow}>
                <span className={styles.planName}>{plan.name}</span>
                <span className={styles.planPrice}>
                  {plan.price}
                  <small>{plan.cadence}</small>
                </span>
              </span>
              <span className={styles.planBody}>
                <span className={styles.planBodyInner}>{plan.benefits}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Holm() {
  const [open, setOpen] = useState<string>(questions[0].id);
  const reduce = useReducedMotion();

  return (
    <section id="holm" className={styles.holm}>
      <header className={styles.holmHead}>
        <p className={styles.kicker}>Holm</p>
        <h2>
          <BlurWords text="Questions, answered." />
        </h2>
      </header>
      <div className={styles.holmGrid}>
        <div>
          {questions.map((item) => {
            const on = item.id === open;
            return (
              <div key={item.id} className={styles.faqItem} data-open={on ? "true" : "false"}>
                <h3>
                  <button type="button" className={styles.faqQ} aria-expanded={on} onClick={() => setOpen(on ? "" : item.id)}>
                    <span>{item.q}</span>
                    <span className={styles.faqIcon} aria-hidden="true">
                      <i />
                      <i />
                    </span>
                  </button>
                </h3>
                <div className={styles.faqA}>
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.holmPhoto}>
          {questions.map((item) => (
            <motion.div
              key={item.id}
              className={styles.holmLayer}
              animate={{ opacity: item.id === open ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <ReelImage src={item.image} alt="" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
