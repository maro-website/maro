import Link from "next/link";
import { copy, upcoming } from "./content";
import { ToolFooter } from "./ToolFooter";
import { UpcomingToolPreview } from "./UpcomingToolPreview";
import { TOP_BAR_DESTINATIONS } from "@/lib/nav/destinations";
import { getProductBrand } from "@/lib/design/maro-system";
import TechText from "./TechText";
import s from "./HubVision.module.css";

type UpcomingTool = (typeof upcoming)[number];

function FutureToolCard({ tool }: { tool: UpcomingTool }) {
  const href = TOP_BAR_DESTINATIONS.find((destination) => destination.id === tool.id)?.route;
  return (
    <article className={`${s.futureTool} ${s[tool.motif]}`}>
      <div className={`${s.toolStudy} relative`}>
        <UpcomingToolPreview motif={tool.motif} />
        {href && <Link href={href} className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" aria-label={`Hap ${getProductBrand(tool.name)?.displayName ?? tool.name}`} />}
      </div>
      <ToolFooter name={tool.name} release={tool.version} href={TOP_BAR_DESTINATIONS.find((destination) => destination.id === tool.id)?.route} heading="h3" />
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
      <h2 id="ecosystem-title" className="sr-only">{copy.ecosystem}</h2>
      <div className={s.ecosystemIntro} aria-hidden="true">
        <TechText text={copy.ecosystem} fontSize={420} />
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
