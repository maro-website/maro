"use client";

import s from "./HubVision.module.css";

const WEB_VIDEO_SRC = "/videos/hub-vision/maroWeb-hub05.mp4";

export function WebHubPreview() {
  return (
    <div className={s.webVideoPreview} aria-hidden="true">
      <video
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
