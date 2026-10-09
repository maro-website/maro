"use client";
import * as React from "react";

/** Existing previews load/play only while the user can see them. */
export const ViewportVideo = React.forwardRef<HTMLVideoElement, React.VideoHTMLAttributes<HTMLVideoElement>>(function ViewportVideo({ src, autoPlay, ...props }, forwardedRef) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [foreground, setForeground] = React.useState(true);
  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      const shown = entry.isIntersecting;
      setVisible(shown);
    }, { threshold: 0.05 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    const update = () => setForeground(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => {
      if (!visible || !foreground || motion.matches || connection?.saveData || !autoPlay) video.pause();
      else void video.play().catch(() => undefined);
    };
    update();
    motion.addEventListener("change", update);
    return () => { motion.removeEventListener("change", update); video.pause(); };
  }, [visible, foreground, autoPlay]);
  React.useEffect(() => {
    // load() cancels the old media fetch/buffer after src leaves the DOM.
    if (!visible || !foreground) ref.current?.load();
  }, [visible, foreground]);
  return <video {...props} src={visible && foreground ? src : undefined} autoPlay={false} preload="none" ref={node => {
    ref.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }} />;
});
