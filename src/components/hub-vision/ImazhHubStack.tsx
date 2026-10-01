"use client";

import { useMemo } from "react";
import Stack from "./Stack";
import s from "./HubVision.module.css";

const IMAGES = [
  "/images/hub-vision/imazh-bounce/01.jpg",
  "/images/hub-vision/imazh-bounce/02.jpg",
  "/images/hub-vision/imazh-bounce/03.jpg",
  "/images/hub-vision/imazh-bounce/04.jpg",
  "/images/hub-vision/imazh-bounce/05.jpg",
];

export function ImazhHubStack() {
  const cards = useMemo(
    () =>
      IMAGES.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} className="card-image" src={src} alt="" draggable={false} />
      )),
    []
  );

  return (
    <div className={s.imazhStackHost}>
      <div className={s.imazhStackFrame}>
        <Stack
          randomRotation
          sensitivity={180}
          sendToBackOnClick
          mobileClickOnly
          cards={cards}
        />
      </div>
    </div>
  );
}
