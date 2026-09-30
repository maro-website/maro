"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FortField } from "@/components/fort/fields";
import { getFortModuleSchema } from "@/lib/fort/schema";
import { BRAIN_TABS } from "@/lib/workspaces/brainTypes";
import type { FortValues } from "@/lib/fort/types";
import { HUB_TOOLS } from "@/components/hub/hubTools";
import { BrandMark, CoffeeArtwork, WebsiteArtwork } from "./BrandArtwork";
import s from "./HubLab.module.css";

const steps = [
  { title: "Ideja", tool: "NISJA", heading: "Gjithçka nis me një fjali.", copy: "Një coffee shop në Prishtinë. Kafe e mirë. Një vend që të bëhet i yti." },
  { title: "Identiteti", tool: "maroLogo", heading: "Jepi një emër. Një karakter.", copy: "“ditë.” Një shenjë e thjeshtë. Ngjyra të ngrohta. Një identitet që mbahet mend." },
  { title: "Kampanja", tool: "maroImazh", heading: "Tash, bëje me u pa.", copy: "I njëjti karakter, në paketim dhe në vizualin e parë të kampanjës." },
  { title: "Website", tool: "maroWeb", heading: "Një adresë për krejt idenë.", copy: "Identiteti merr hapësirën e vet. Një website që flet me të njëjtin zë." },
];

export function BrandStory() {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
  return <section className={s.story} id="nje-ide" aria-labelledby="story-title">
    <div className={s.sectionHeading}><div><p className={s.kicker}>01 / PREJ NJË IDEJE</p><h2 id="story-title">Mos u ndal<br />te <span>një rezultat.</span></h2></div><p>Logoja. Vizuali. Website-i.<br />Pjesë të së njëjtës ide.<br /><small>Demonstrim kreativ · brend fiktiv</small></p></div>
    <div className={s.storyWorkbench}>
      <div className={s.storySteps} role="group" aria-label="Hapat e demonstrimit">{steps.map((item, index) => <button key={item.title} onClick={() => setStep(index)} aria-pressed={step === index} aria-controls="brand-stage"><span>0{index + 1}</span>{item.title}<span>{index < step ? "✓" : "↗"}</span></button>)}</div>
      <div className={s.storyStage} id="brand-stage" data-step={step}>
        <div className={s.stageMeta}><span>PROJEKTI / DITË.</span><span>{steps[step].tool}</span></div>
        <AnimatePresence mode="wait" initial={false}><motion.div key={step} className={s.stageContent} initial={{ opacity: 0, y: reduced ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -12 }} transition={{ duration: reduced ? 0 : 0.28 }}>
          {step === 0 && <div className={s.ideaStage}><span className={s.ideaQuote}>“</span><p>Po hap një<br /><em>coffee shop</em><br />në Prishtinë.</p><span className={s.ideaTag}>IDEJA 001 / PA LIMIT NË AMBICIE</span></div>}
          {step === 1 && <div className={s.identityStage}><div className={s.identityMark}><BrandMark /><strong>ditë.</strong><span>COFFEE, EVERY DAY.</span></div><div className={s.identityNotes}><span>IDENTITETI / 01</span><h3>Ditë të mira<br />nisen këtu.</h3><div className={s.swatches}><i /><i /><i /></div><span>BLU E THELLË · KREM · TERRAKOTË</span></div></div>}
          {step === 2 && <div className={s.campaignStage}><div><span>DITË. / KAMPANJA E PARË</span><h3>Çdo ditë<br />e ka një<br /><i>fillim.</i></h3><span>KAFE PËR DITË TË MIRA.</span></div><CoffeeArtwork /></div>}
          {step === 3 && <div className={s.webStage}><WebsiteArtwork /><div className={s.brandStamp}><BrandMark /><span>Një ide.<br />I njëjti karakter.</span></div></div>}
        </motion.div></AnimatePresence>
      </div>
      <div className={s.storyCaption} aria-live="polite"><div><h3>{steps[step].heading}</h3><p>{steps[step].copy}</p></div><button onClick={() => setStep((step + 1) % steps.length)} aria-label={step === 3 ? "Rifillo demonstrimin" : "Shiko hapin tjetër"}>{step === 3 ? "Edhe një herë" : "Hapi tjetër"}<span>{step === 3 ? "↺" : "→"}</span></button></div>
    </div>
    <p className={s.storyFootnote}>Një shembull i drejtuar artistikisht. Në mjetet reale, secilin hap e krijon dhe e zgjedh ti.</p>
  </section>;
}

const brainExamples: Record<string, { label: string; value: string; explanation: string }> = {
  brand: { label: "Brendi", value: "ditë. / Coffee shop / Prishtinë", explanation: "Emri, përshkrimi dhe vendi i biznesit." },
  target: { label: "Audienca", value: "Njerëz që e nisin ditën me kafe të mirë.", explanation: "Kujt po i flet dhe çka i intereson." },
  goal: { label: "Qëllimi", value: "Me e njoftu lagjen me vendin e ri.", explanation: "Çka don me arritë me përmbajtjen." },
  market: { label: "Pozicionimi", value: "Pjekje lokale. Ritëm i ngadalshëm.", explanation: "Tregu dhe çka e dallon biznesin tënd." },
  content: { label: "Toni", value: "I ngrohtë. I thjeshtë. Në shqip.", explanation: "Si flet brendi dhe çka duhet me shmangë." },
  sources: { label: "Burimet", value: "Dokumente + fjalë kyçe", explanation: "Burimet përkatëse zgjidhen kur fjalët kyçe përputhen me kërkesën." },
};

export function BrainStory() {
  const [active, setActive] = useState("brand");
  const example = brainExamples[active];
  return <section className={s.brainSection} aria-labelledby="brain-title">
    <div className={s.brainCopy}><p className={s.kicker}>02 / KONTEKSTI QË MBETET</p><h2 id="brain-title">Ide e re.<br /><span>Jo prej zeros.</span></h2><p>Brendin e shpjegon te maroBrain. Kur e aktivizon në mjetet që e mbështesin, ai kontekst hyn në kërkesën tënde.</p><Link href="/brain" prefetch={false} className={s.textLink}>Njihe Maro me brendin tënd <span>↗</span></Link></div>
    <div className={s.brainSystem}><div className={s.brainTop}><span>maroBrain</span><small>SHEMBULL KONTEKSTI</small></div><div className={s.brainTabs} role="group" aria-label="Konteksti i maroBrain">{BRAIN_TABS.map(tab => <button key={tab.id} aria-pressed={tab.id === active} onClick={() => setActive(tab.id)}>{brainExamples[tab.id].label}</button>)}</div><div className={s.contextCard} aria-live="polite"><span>{example.label}</span><strong>{example.value}</strong><p>{example.explanation}</p></div><div className={s.contextBus}><span>KONTEKST I PËRBASHKËT</span><div>{HUB_TOOLS.filter(t => !t.locked && t.toolId === "reklama").map(t => <span key={t.id}>{t.label}<i /></span>)}</div></div></div>
  </section>;
}

const demoFields = getFortModuleSchema("imazh", {}).sections.flatMap(section => section.fields);
const fieldGroups = [
  { label: "Drejtimi", ids: ["creativeFreedom", "lighting"] },
  { label: "Përbërja", ids: ["composition", "referenceStrength"] },
  { label: "Detajet", ids: ["mustInclude", "avoid", "outputGoal"] },
];

export function FortStory() {
  const [enabled, setEnabled] = useState(false);
  const [group, setGroup] = useState(0);
  const [values, setValues] = useState<FortValues>({ creativeFreedom: "balanced", lighting: "studio", composition: "center", referenceStrength: "60", mustInclude: "Paketimi ditë. dhe hapësirë për titullin.", avoid: "Tekst shtesë. Elemente që e mbulojnë produktin.", outputGoal: "brand" });
  return <section id="marofort" className={s.fortSection} aria-labelledby="fort-title">
    <div className={s.sectionHeading}><div><p className={s.kicker}>03 / TI E KE DREJTIMIN</p><h2 id="fort-title">Lehtë me nisë.<br /><span>Thellë, kur don ti.</span></h2></div><p>Një kërkesë kur don thjeshtësi.<br />maroFort kur e din saktë çka don.<br /><small>Expert Mode · Sipas planit dhe mjetit</small></p></div>
    <div className={s.fortWorkbench} data-enabled={enabled}>
      <div className={s.fortDemo}><div className={s.fortDemoHead}><span>maroImazh <small>/ DEMONSTRIM</small></span><button className={s.fortSwitch} role="switch" aria-checked={enabled} aria-controls="fort-controls" onClick={() => setEnabled(!enabled)}>maroFort <span><i /></span></button></div><p className={s.demoPrompt}>“Krijo një reklamë për kafen ditë.<br />Produkti në qendër. Ndjenjë mëngjesi.”</p>
        {enabled ? <div id="fort-controls" className={s.fortControls}><div className={s.fortTabs} role="group" aria-label="Grupet e kontrolleve maroFort">{fieldGroups.map((item, index) => <button key={item.label} aria-pressed={index === group} onClick={() => setGroup(index)}>{item.label}</button>)}</div>{fieldGroups[group].ids.map(id => {
          const field = demoFields.find(f => f.id === id);
          if (!field) return null;
          // Reuse the actual schema and fields; only local React state, no generation or persistence.
          const control = <FortField field={field} value={values[id]} onChange={value => setValues(v => ({ ...v, [id]: value }))} />;
          const needsLabel = ["text", "textarea", "slider"].includes(field.type);
          return <fieldset className={s.fortField} key={id}><legend>{field.label}</legend>{needsLabel ? <label><span className={s.srOnly}>{field.label}</span>{control}</label> : control}</fieldset>;
        })}</div> : <div id="fort-controls" className={s.fortInvitation}><span>+</span><p>E ke një pamje në mendje?<br /><strong>Hape maroFort. Jepi drejtim.</strong></p><button onClick={() => setEnabled(true)} aria-label="Aktivizo demonstrimin maroFort">Provoje ↗</button></div>}
        <div className={s.demoNote}><span>DEMO</span> Provo kontrollet. Nuk gjeneron dhe nuk harxhon kredite.</div>
      </div>
      <div className={s.fortExplanation}><div className={s.fortDiagram} aria-hidden="true"><span className={s.fortCrossOne}>+</span><span className={s.fortCrossTwo}>+</span><BrandMark /><span className={s.fortDiagramLabel}>{enabled ? "DREJTIMI / NË DUART E TUA" : "NISJA / NJË KËRKESË"}</span>{enabled && <><i className={s.measureHorizontal} /><i className={s.measureVertical} /></>}</div><h3>{enabled ? "Çdo zgjedhje ka peshë." : "Prej kërkesës te drejtimi kreativ."}</h3><p>{enabled ? "Zgjedhjet e tua, të mbledhura në një drejtim kreativ. Në gjenerimin real, këto i shtohen kërkesës." : "Ti vendos sa liri i jep modelit, çka duhet të përmbajë rezultati dhe çka duhet të shmangë."}</p>{enabled && <dl className={s.briefSummary} aria-live="polite">{fieldGroups[group].ids.map(id => {
        const field = demoFields.find(f => f.id === id);
        const value = values[id];
        return <div key={id}><dt>{field?.label}</dt><dd>{field?.options?.find(o => o.id === value)?.label ?? (value ? `${String(value)}${field?.type === "slider" ? "%" : ""}` : "Pa përcaktuar")}</dd></div>;
      })}</dl>}<Link className={s.textLink} href="/imazh" prefetch={false}>Hape maroImazh <span>↗</span></Link></div>
    </div>
  </section>;
}
