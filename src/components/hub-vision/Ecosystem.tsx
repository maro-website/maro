import { ArrowUpRight, AudioLines, ScanLine } from "lucide-react";
import { copy, upcoming } from "./content";
import { ToolFooter } from "./ToolFooter";
import { FilmaPreview } from "./FilmaPreview";
import { WebHubPreview } from "./WebHubPreview";
import s from "./HubVision.module.css";

type UpcomingTool = (typeof upcoming)[number];

function ToolStudy({ motif }: { motif: string }) {
  if (motif === "audio")
    return (
      <div className={s.audioStudy}>
        <span>IDEJA JOTE, ME ZË.</span>
        <div className={s.waveform}>
          {Array.from({ length: 39 }, (_, i) => (
            <i key={i} style={{ height: `${Math.round(12 + Math.abs(Math.sin(i * 0.76) * Math.sin(i * 0.19)) * 72)}px` }} />
          ))}
        </div>
        <div className={s.audioBottom}>
          <span>00:00</span>
          <AudioLines size={20} />
          <span>maroZo</span>
        </div>
      </div>
    );
  return (
    <div className={s.marketingStudy}>
      <div className={s.strategyOrbit} />
      <div className={s.campaignNote}>
        <span>IDEJA</span>
        <strong>
          Bëje të
          <br />
          mbahet mend.
        </strong>
        <ArrowUpRight size={22} />
      </div>
      <div className={s.audienceNote}>
        <ScanLine size={24} />
        <span>NJERËZIT E DUHUR</span>
      </div>
    </div>
  );
}

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
      <div className={s.studyArtwork}>
        <ToolStudy motif={motif} />
      </div>
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
