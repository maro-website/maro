"use client";

import { useRef, useState, type FormEvent } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { footerNav } from "./data";
import { Magnetic, ProximityWord, SplitWords, useReducedMotion } from "./bits";
import styles from "./Showreel.module.css";

const budgets = ["Under €20k", "€20–60k", "€60k and above"] as const;

export function Contact() {
  const [budget, setBudget] = useState<(typeof budgets)[number] | "">("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !email || !message) {
      setError("Add a name, an email, and a few words about the project.");
      return;
    }
    setError("");
    setSent(true);
  };

  return (
    <section id="contact" className={styles.contact}>
      <h2 className={styles.contactTitle}>
        <span>Let’s make</span>
        <span>something</span>
        <span>unexpected.</span>
      </h2>
      {sent ? (
        <p className={styles.sent} role="status">
          The note is in. We’ll reply within two days.
        </p>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.field}>
            <span>Name</span>
            <input name="name" autoComplete="name" placeholder="Your name" />
          </label>
          <label className={styles.field}>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="you@studio.com" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Project</span>
            <input name="project" placeholder="A house, a film, a fragrance" />
          </label>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span id="budget-label">Budget</span>
            <div className={styles.budget} role="radiogroup" aria-labelledby="budget-label">
              {budgets.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={budget === item}
                  className={budget === item ? styles.budgetOn : styles.budgetBtn}
                  onClick={() => setBudget(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Message</span>
            <textarea name="message" rows={3} placeholder="What should it feel like?" />
          </label>
          <div className={styles.sendRow}>
            <p className={styles.formNote} role="status">
              {error || "We reply within two days."}
            </p>
            <Magnetic>
              <button className={styles.send} type="submit">
                Send the brief
              </button>
            </Magnetic>
          </div>
        </form>
      )}
    </section>
  );
}

export function Close() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 0.55], [1, 0.94]);
  const y = useTransform(scrollYProgress, [0, 0.55], ["0%", "-3%"]);

  return (
    <div ref={ref} className={styles.ctaWrap}>
      <section id="begin" className={styles.cta}>
        <motion.div className={styles.ctaInner} style={reduce ? undefined : { scale, y }}>
          <p className={styles.kickerLight}>Index</p>
          <h2 className={styles.ctaTitle}>
            <SplitWords text="The next" inView />
            <SplitWords text="project" delay={0.08} inView />
            <SplitWords text="starts here." delay={0.16} inView />
          </h2>
          <Magnetic>
            <a className={styles.ctaBtn} href="#contact">
              Write to the studio
            </a>
          </Magnetic>
        </motion.div>
      </section>
      <footer className={styles.footer}>
        <p className={styles.footerMark}>
          <ProximityWord text="INDEX" />
        </p>
        <div className={styles.footerGrid}>
          <div>
            <p className={styles.kicker}>Studio</p>
            <p>14 Rue des Archives</p>
            <p>75004 Paris</p>
          </div>
          <div>
            <p className={styles.kicker}>Write</p>
            <a href="mailto:studio@index.example">studio@index.example</a>
          </div>
          <div>
            <p className={styles.kicker}>Social</p>
            <a href="#contact">Instagram</a>
            <a href="#contact">Are.na</a>
          </div>
        </div>
        <nav className={styles.footerLinks} aria-label="Index">
          {footerNav.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <p className={styles.footerLegal}>© 2026 Index. All rights reserved.</p>
      </footer>
    </div>
  );
}
