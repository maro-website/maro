import { ArrowUpRight, AudioLines, ScanLine } from "lucide-react";
import { copy, upcoming } from "./content";
import { IdentityMark } from "./Launchpad";
import { ToolFooter } from "./ToolFooter";
import { FilmaPreview } from "./FilmaPreview";
import s from "./HubVision.module.css";

function ToolStudy({ motif }: { motif: string }) {
  if (motif === "web") return <div className={s.webStudy}><div className={s.browserBar}><span /><span /><span /><small>një ide, një adresë.</small></div><div className={s.miniWebsite}><span>forma®</span><div><strong>Less,<br />but better.</strong><IdentityMark /></div><i>Discover the collection <ArrowUpRight size={11} /></i></div></div>;
  if (motif === "audio") return <div className={s.audioStudy}><span>IDEJA JOTE, ME ZË.</span><div className={s.waveform}>{Array.from({ length: 39 }, (_, i) => <i key={i} style={{ height: `${Math.round(12 + Math.abs(Math.sin(i * .76) * Math.sin(i * .19)) * 72)}px` }} />)}</div><div className={s.audioBottom}><span>00:00</span><AudioLines size={20} /><span>maroAudio</span></div></div>;
  return <div className={s.marketingStudy}><div className={s.strategyOrbit} /><div className={s.campaignNote}><span>IDEJA</span><strong>Bëje të<br />mbahet mend.</strong><ArrowUpRight size={22} /></div><div className={s.audienceNote}><ScanLine size={24} /><span>NJERËZIT E DUHUR</span></div></div>;
}

export function Ecosystem() {
  return <section className={s.ecosystem} aria-labelledby="ecosystem-title">
    <div className={s.sectionHeading}><h2 id="ecosystem-title">{copy.ecosystem}</h2></div>
    <div className={s.ecosystemGrid}>
      {upcoming.map((tool) => <article className={`${s.futureTool} ${s[tool.motif]}`} key={tool.id}>
        {tool.motif === "film" ? <div className={s.toolStudy}><FilmaPreview /></div> : <div className={s.toolStudy} aria-hidden="true"><div className={s.studyArtwork}><ToolStudy motif={tool.motif} /></div></div>}
        <ToolFooter name={tool.name} release={tool.version} heading="h3" />
      </article>)}
    </div>
  </section>;
}
