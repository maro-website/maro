import Image from "next/image";
import { copy, upcoming } from "./content";
import { ToolFooter } from "./ToolFooter";
import { FilmaPreview } from "./FilmaPreview";
import { WebHubPreview } from "./WebHubPreview";
import s from "./HubVision.module.css";

type UpcomingTool = (typeof upcoming)[number];

function EcosystemMedia({ motif }: { motif: string }) {
  if (motif === "film") {
    return (
      <div className={s.toolStudy}>
        <FilmaPreview />
      </div>
    );
  }
  if (motif === "web") {
    return (
      <div className={s.toolStudy}>
        <WebHubPreview />
      </div>
    );
  }
  return (
    <div className={s.toolStudy} aria-hidden="true">
      <Image
        src={motif === "audio" ? "/images/hub-vision/maroAudio_hub02.png" : "/images/hub-vision/maroMarketing_hub01.png"}
        alt=""
        fill
        sizes="(max-width: 600px) 100vw, 40vw"
        className={s.toolStudyImage}
      />
    </div>
  );
}

function FutureToolCard({ tool }: { tool: UpcomingTool }) {
  return (
    <article className={`${s.futureTool} ${s[tool.motif]}`}>
      <EcosystemMedia motif={tool.motif} />
      <ToolFooter name={tool.name} release={tool.version} heading="h3" />
    </article>
  );
}

export function Ecosystem() {
  const web = upcoming.find((t) => t.id === "web");
  const audio = upcoming.find((t) => t.id === "audio");
  const marketing = upcoming.find((t) => t.id === "marketing");
  const filma = upcoming.find((t) => t.id === "filma");
  if (!web || !audio || !marketing || !filma) return null;

  return (
    <section className={s.ecosystem} aria-labelledby="ecosystem-title">
      <div className={s.sectionHeading}>
        <h2 id="ecosystem-title">{copy.ecosystem}</h2>
      </div>
      <div className={s.ecosystemGrid}>
        <FutureToolCard tool={web} />
        <FutureToolCard tool={audio} />
        <div className={s.ecosystemBottomRow}>
          <FutureToolCard tool={marketing} />
          <FutureToolCard tool={filma} />
        </div>
      </div>
    </section>
  );
}
