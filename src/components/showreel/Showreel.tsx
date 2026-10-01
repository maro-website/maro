"use client";

import { useEffect } from "react";
import { Close, Contact } from "./close";
import { Circle, Holm, Meridian, Vant, Voices } from "./late";
import { Lume, Marell, Northline, Oru } from "./mid";
import { Bridge, Halden, Kline, Orris } from "./open";
import styles from "./Showreel.module.css";

export function Showreel() {
  useEffect(() => {
    document.documentElement.classList.add("showreel-on");
    return () => document.documentElement.classList.remove("showreel-on");
  }, []);

  return (
    <main className={styles.root} lang="en">
      <Orris />
      <Bridge word="HALDEN" from="#e6e0d4" to="#eceae4" ink="#1a1a1a" inkTo="#1a1a1a" face="grotesk" />
      <Halden />
      <Bridge word="Kline" from="#eceae4" to="#0e0e0e" ink="#1a1a1a" inkTo="#e7ff3d" face="serif" />
      <Kline />
      <Bridge word="NORTHLINE" from="#0e0e0e" to="#f3f2ef" ink="#f4f1ea" inkTo="#17191c" face="grotesk" />
      <Northline />
      <Bridge word="Marell" from="#f3f2ef" to="#e7dccb" ink="#17191c" inkTo="#2a2118" face="display" />
      <Marell />
      <Oru />
      <Lume />
      <Bridge word="VANT" from="#f3eadf" to="#050607" ink="#3c1c18" inkTo="#f3f1ea" face="grotesk" />
      <Vant />
      <Meridian />
      <Voices />
      <Circle />
      <Bridge word="Holm" from="#1c2420" to="#f4f4f2" ink="#efe7d6" inkTo="#161616" face="serif" />
      <Holm />
      <Contact />
      <Close />
    </main>
  );
}
