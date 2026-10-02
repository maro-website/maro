import Image from "next/image";
import { FilmaPreview } from "./FilmaPreview";
import { WebHubPreview } from "./WebHubPreview";
import s from "./HubVision.module.css";

/** The same official Hub imagery on the product preview pages. */
export function UpcomingToolPreview({ motif }: { motif: string }) {
  if (motif === "film") return <FilmaPreview />;
  if (motif === "web") return <WebHubPreview />;
  return <Image
    src={motif === "audio" ? "/images/hub-vision/maroAudio_hub04.png" : "/images/hub-vision/maroMarketing_hub01.png"}
    alt=""
    fill
    sizes="(max-width: 700px) 100vw, 480px"
    className={s.toolStudyImage}
  />;
}
