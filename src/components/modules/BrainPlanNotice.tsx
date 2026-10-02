"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clock3, Images, Layers, Target } from "lucide-react";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { Button } from "@/components/ui/Button";
import { MARO_PRODUCTS } from "@/lib/design/maro-system";
import type { AccountPolicy } from "@/lib/workspaces/accountPolicy";
import { BRAIN_RETENTION_DAYS, brainRetentionView } from "@/lib/workspaces/brainRetentionView";
import s from "./BrainPlanNotice.module.css";

const phases = [
  { label: "Në pauzë", title: "Një pauzë, jo një fillim nga zero.", text: "Pa plan aktiv, maroBrain nuk përdoret në gjenerime. Profili dhe burimet ruhen gjatë periudhës 60-ditore." },
  { label: "Rikthimi", title: "Vazhdo aty ku e le.", text: "Aktivizo maroStandard ose maroPro para afatit. Profili, fotot dhe burimet e ruajtura bëhen sërish gati për t'u përdorur." },
  { label: "Pas afatit", title: "Çfarë resetohet pas 60 ditësh?", text: "Resetohen profili maroBrain dhe burimet/fotot e tij. Gjenerimet që ke krijuar mbeten te Asetet." },
] as const;
const benefits = [
  { icon: Layers, title: "Identiteti yt", text: "Brandi, gjuha dhe toni në një vend." },
  { icon: Target, title: "Audienca jote", text: "Kontekst për njerëzit që do të arrish." },
  { icon: Images, title: "Burimet e tua", text: "Foto dhe produkte për referencat e tua." },
] as const;
const brandStyle: React.CSSProperties & { "--brain-accent": string } = { "--brain-accent": MARO_PRODUCTS.maroBrain.color };
const months = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
const dateLabel = (value: number, year = false) => {
  const date = new Date(value);
  return `${date.getDate()} ${year ? months[date.getMonth()] : months[date.getMonth()].slice(0, 3)}${year ? ` ${date.getFullYear()}` : ""}`;
};

export function BrainPlanNotice({ policy, onRefresh }: {
  policy: Pick<AccountPolicy, "brainDeleteAt" | "brainResetAt">;
  onRefresh: () => void;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  const [phase, setPhase] = React.useState(1);
  React.useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const retention = brainRetentionView(policy.brainDeleteAt, policy.brainResetAt, now);
  const retained = retention.kind === "retained";
  const urgent = retained && retention.daysLeft !== null && retention.daysLeft <= 7;
  const hasTimeline = retention.deadline !== null && retention.startedAt !== null;

  return <section className={s.page} style={brandStyle} aria-labelledby="brain-plan-title">
    <div className={s.layout}>
      <div className={s.intro}>
        <ProductLogo product="maroBrain" naturalWidth className={s.logo} />
        <span className={s.status}><span aria-hidden />Pa plan aktiv</span>
        <h1 id="brain-plan-title">{retained ? <>Vazhdo me<br />brandin tënd.</> : <>Më pak shpjegime.<br />Më shumë krijime.</>}</h1>
        <p className={s.description}>{retained
          ? "Mos e nis çdo ide nga zero. Rikthe maroBrain që identiteti, audienca dhe burimet e brandit tënd të jenë sërish pjesë e gjenerimeve."
          : "Jepi Maros kontekstin e brandit tënd një herë. Përdore identitetin, audiencën dhe burimet në gjenerimet që vijnë."}</p>
        <Link href="/pricing" className={`maro-button ${s.cta}`} data-variant="inverse" data-size="lg">
          {retained ? "Riaktivizo maroBrain" : "Aktivizo maroBrain"}<ArrowUpRight size={19} aria-hidden />
        </Link>
        <p className={s.planNote}><Check size={14} aria-hidden />Përfshihet në maroStandard dhe maroPro.</p>
        <div className={s.benefits}>{benefits.map(({ icon: Icon, title, text }) => <div key={title} className={s.benefit}>
          <Icon size={19} aria-hidden /><strong>{title}</strong><p>{text}</p>
        </div>)}</div>
      </div>

      <section className={s.retention} aria-labelledby="brain-retention-title" data-urgent={urgent || undefined}>
        <div className={s.cardHeading}><span className={s.clock}><Clock3 size={19} aria-hidden /></span><h2 id="brain-retention-title">{urgent ? "Afati po afrohet." : retained ? "Brandi yt është ende këtu." : retention.kind === "due" ? "Afati ka përfunduar." : retention.kind === "reset" ? "Një fillim i ri për brandin tënd." : "Bëje Maron të njohë brandin tënd."}</h2></div>
        {hasTimeline ? <>
          <div className={s.countdown} aria-live="polite"><strong>{retention.daysLeft}</strong><span>{retention.daysLeft === 1 ? "ditë e mbetur" : "ditë të mbetura"}<small>nga periudha {BRAIN_RETENTION_DAYS}-ditore</small></span></div>
          <p className={s.deadline}>{retained ? "Profili dhe burimet ruhen deri më" : "Periudha e ruajtjes përfundoi më"} <time dateTime={policy.brainDeleteAt!}>{dateLabel(retention.deadline!, true)}</time>.</p>
          <div className={s.timeline}>
            <div className={s.timelineCaption}><span>Periudha e ruajtjes</span><strong>Dita {retention.elapsedDays} / {BRAIN_RETENTION_DAYS}</strong></div>
            <div className={s.track} role="progressbar" aria-label="Periudha e ruajtjes së maroBrain" aria-valuemin={0} aria-valuemax={BRAIN_RETENTION_DAYS} aria-valuenow={retention.elapsedDays} aria-valuetext={`${retention.daysLeft} ditë të mbetura`}><span style={{ width: `${retention.progress}%` }} /></div>
            <div className={s.timelineDates}><span>{dateLabel(retention.startedAt!)}</span><span>{dateLabel(retention.deadline!)}</span></div>
          </div>
          <div className={s.phases} aria-label="Hapat e ruajtjes së maroBrain">{phases.map((item, index) => <button key={item.label} type="button" aria-pressed={phase === index} aria-controls="brain-phase-detail" onClick={() => setPhase(index)}><span aria-hidden>{index + 1}</span>{item.label}</button>)}</div>
          <div id="brain-phase-detail" className={s.detail} aria-live="polite">{phases.map((item, index) => <div key={item.label} className={s.detailPanel} data-active={phase === index || undefined} aria-hidden={phase !== index}><h3>{item.title}</h3><p>{item.text}</p></div>)}</div>
          {retention.kind === "due" && <Button variant="secondary" onClick={onRefresh} className={s.refresh}>Përditëso gjendjen</Button>}
        </> : <>
          <p className={s.emptyDescription}>{retention.kind === "reset"
            ? "Periudha 60-ditore ka përfunduar dhe profili me burimet e maroBrain është resetuar. Gjenerimet e tua mbeten te Asetet."
            : "Ruaj identitetin, audiencën, tonin dhe referencat e brandit në workspace-in tënd. maroBrain është gati sapo të aktivizosh një plan."}</p>
          <div className={s.readyList}><span><Check size={16} aria-hidden />Një profil për brandin tënd</span><span><Check size={16} aria-hidden />Kontekst për gjenerimet e ardhshme</span><span><Check size={16} aria-hidden />Burime e foto në një vend</span></div>
          <Link href="/krijimet" className={s.assetsLink}>Shiko asetet e tua<ArrowUpRight size={16} aria-hidden /></Link>
        </>}
      </section>
    </div>
  </section>;
}
