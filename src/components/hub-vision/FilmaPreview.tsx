"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import s from "./HubVision.module.css";

export function FilmaPreview() {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const nextMuted = !muted;
    if (video.current) {
      video.current.muted = nextMuted;
      if (video.current.paused) void video.current.play().catch(() => undefined);
    }
    setMuted(nextMuted);
  }

  return <div className={s.filmaPreview}>
    <video
      ref={video}
      className={s.filmaVideo}
      src="/videos/hub-vision/maro-filma.mp4"
      autoPlay
      loop
      muted={muted}
      playsInline
      preload="metadata"
      disablePictureInPicture
      disableRemotePlayback
      aria-label="Video demonstrimi maroFilma"
    />
    <span className={s.filmaBadge}>generated with <strong>maroFilma</strong></span>
    <button type="button" className={s.filmaSound} onClick={toggleSound} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>
      {muted ? <VolumeX size={19} aria-hidden /> : <Volume2 size={19} aria-hidden />}
    </button>
  </div>;
}
