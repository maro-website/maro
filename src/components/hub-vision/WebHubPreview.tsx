"use client";

import { ViewportVideo } from "./ViewportVideo";
import s from "./HubVision.module.css";

const WEB_VIDEO_SRC = "/images/hub-vision/maroWeb_hub01video.mp4";

export function WebHubPreview() {
  return (
    <div className={s.webVideoPreview} aria-hidden="true">
      <ViewportVideo
        className={s.webHubVideo}
        src={WEB_VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
      />
    </div>
  );
}
