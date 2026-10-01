"use client";

import { useState } from "react";
import styles from "./Showreel.module.css";

export function ReelImage({
  src,
  alt,
  className,
  priority = false,
  position = "center",
  tone = "light",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  position?: string;
  tone?: "light" | "dark";
}) {
  const [current, setCurrent] = useState(src);

  return (
    <div className={`${styles.frame} ${tone === "dark" ? styles.frameDark : ""} ${className ?? ""}`}>
      <img
        src={current}
        alt={alt}
        className={styles.cover}
        style={{ objectPosition: position }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onError={() => {
          if (!current.includes("picsum.photos")) {
            setCurrent(`https://picsum.photos/seed/${encodeURIComponent(alt)}/1600/1100`);
          }
        }}
      />
    </div>
  );
}
