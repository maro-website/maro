"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCheck, Copy, ExternalLink, Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { useToast } from "@/components/ui/Toast";

const integrations = {
  imazh: {
    name: "maroImazh", endpoint: "https://maro.al/api/mcp/imazh", count: "3 mjete",
    title: "Nga biseda, në imazh.",
    description: "Krijo imazhe në ChatGPT me maroImazh. Krijimet ruhen në llogarinë tënde Maro.",
    features: ["Imazhe në 4 formate, me ose pa tekst", "Brendi yt, kur kërkon ta përdorësh", "Statusi dhe rezultati i gjenerimit"],
    example: "Përdore maroImazh për një postim 4:5 për produktin tim. Përdore brendin nga workspace-i aktiv, pa tekst në imazh.",
    note: "Gjenerimi përdor kreditë e llogarisë Maro. Përdorimi i brendit kërkon akses në maroBrain.",
  },
  brain: {
    name: "maroBrain", endpoint: "https://maro.al/api/mcp/brain", count: "7 mjete",
    title: "Brendi yt. Gjithmonë në kontekst.",
    description: "Sille profilin dhe kujtesën e brendit në bisedë. Vazhdo aty ku ke mbetur, me të dhënat e ruajtura në Maro.",
    features: ["Profili dhe burimet e workspace-it aktiv", "Fakte e vendime me burim dhe versione", "Përditësime që shfaqen edhe në Maro"],
    example: "Lexoje brendin tim nga maroBrain. Mbaje mend që për këtë fushatë përdorim ton të qartë e miqësor; burimi është vendimi im për fushatën.",
    note: "Kërkon një plan me akses në maroBrain. Leximi dhe kujtimet nuk shpenzojnë kredi gjenerimi.",
  },
} as const;

export function McpOverview() {
  const [selected, setSelected] = useState<keyof typeof integrations>("imazh");
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); toast("Adresa u kopjua."); }
    catch { toast("Kopjoje adresën nga fusha e lidhjes.", "error"); }
  }
  const current = integrations[selected];
  return (
    <div className="maro-page-shell pb-16 pt-8 sm:pt-12">
      <header className="mb-8 max-w-2xl sm:mb-10">
        <div className="mb-5 flex items-center gap-2 text-[14px] font-semibold text-ink-2"><Link2 className="h-5 w-5 text-brand" aria-hidden /> Integrimet Maro <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px]">MCP</span></div>
        <h1 className="maro-text-h1 text-ink">Maro, aty ku punon.</h1>
        <p className="maro-text-body-lg mt-4 max-w-xl text-ink-2">Krijo me maroImazh dhe mbaje brendin në kontekst me maroBrain, direkt nga ChatGPT. Dy lidhje të veçanta. Një llogari Maro.</p>
      </header>

      <section aria-label="Integrimet me ChatGPT" className="grid gap-5 lg:grid-cols-2">
        {Object.entries(integrations).map(([id, item]) => (
          <article key={id} className="flex min-w-0 flex-col rounded-maro20 bg-surface p-6 sm:p-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><ProductLogo product={item.name} className="h-10 w-40" /><span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[12px] text-ink-2">MCP për ChatGPT</span></div>
            <h2 className="maro-text-h3 text-ink">{item.title}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{item.description}</p>
            <ul className="my-6 space-y-3 text-[14px] text-ink">{item.features.map(feature => <li key={feature} className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />{feature}</li>)}</ul>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <a href="#lidhe-maro" onClick={() => setSelected(id as keyof typeof integrations)} className="maro-button" data-variant="brand" data-size="md">Lidhe {item.name}<ArrowRight className="h-4 w-4" aria-hidden /></a>
              <span className="text-[12px] text-ink-2">{item.count}</span>
            </div>
          </article>
        ))}
      </section>

      <section id="lidhe-maro" className="scroll-mt-24 py-10 sm:py-12" aria-labelledby="connect-title">
        <div className="mb-6"><h2 id="connect-title" className="maro-text-h2 text-ink">Lidhe një herë. Puno më lehtë.</h2><p className="mt-3 text-[14px] text-ink-2">Shto secilin integrim veçmas dhe autorizoje me llogarinë tënde Maro.</p></div>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <ol className="space-y-6">
            {[
              ["Hape ChatGPT", "Te Plugins, shtyp + dhe zgjidh Add custom MCP server. Mundësia për lidhje varet nga plani dhe lejet e workspace-it tënd në ChatGPT."],
              ["Shto integrimin", "Vendose emrin maroImazh ose maroBrain dhe adresën përkatëse. Zgjidh OAuth për autentikim."],
              ["Lidhe llogarinë Maro", "Hyr në Maro, shiko lejet dhe autorizo lidhjen. Pastaj zgjidhe integrimin me @ në një bisedë të re."],
            ].map(([title, description], index) => <li key={title} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[14px] font-semibold text-ink">{index + 1}</span><div><h3 className="text-[16px] font-semibold text-ink">{title}</h3><p className="mt-2 text-[14px] leading-relaxed text-ink-2">{description}</p></div></li>)}
          </ol>
          <div className="min-w-0 rounded-maro20 bg-surface p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap gap-2" aria-label="Zgjidh integrimin">{Object.entries(integrations).map(([id, item]) => <Button key={id} variant={selected === id ? "primary" : "ghost"} aria-pressed={selected === id} onClick={() => setSelected(id as keyof typeof integrations)}>{item.name}</Button>)}</div>
            <label htmlFor="mcp-endpoint" className="mb-2 block text-[14px] font-semibold text-ink">Adresa e serverit</label>
            <div className="flex min-w-0 items-center gap-2 rounded-maro12 bg-canvas p-2"><input id="mcp-endpoint" value={current.endpoint} readOnly onFocus={event => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[16px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" /><Button size="icon" variant="ghost" aria-label={`Kopjo adresën e ${current.name}`} onClick={() => copy(current.endpoint)}>{copied === current.endpoint ? <CheckCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</Button></div>
            <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-2"><ShieldCheck className="h-4 w-4" aria-hidden /> OAuth · llogaria jote Maro</div>
            <p className="mt-5 text-[14px] leading-relaxed text-ink-2">{current.note}</p>
            <a href="https://chatgpt.com" target="_blank" rel="noreferrer" className="maro-button mt-6" data-variant="secondary" data-size="md">Hape ChatGPT<ExternalLink className="h-4 w-4" aria-hidden /></a>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-8" aria-labelledby="examples-title">
        <h2 id="examples-title" className="maro-text-h2 text-ink">Nise me një kërkesë.</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">{Object.values(integrations).map(item => <div key={item.name} className="rounded-maro16 bg-surface p-6"><p className="mb-3 text-[12px] font-semibold text-ink-2">@{item.name}</p><p className="text-[14px] leading-relaxed text-ink">“{item.example}”</p></div>)}</div>
      </section>

      <section className="border-t border-line pt-8" aria-labelledby="details-title">
        <h2 id="details-title" className="maro-text-h2 text-ink">Mirë me ditë.</h2>
        <div className="mt-5 divide-y divide-line">
          {[
            ["A janë dy lidhje të ndryshme?", "Po. maroImazh krijon imazhe; maroBrain lexon dhe ruan kontekstin e brendit. Mund ta lidhësh njërin ose të dy, sipas nevojës."],
            ["Çka mban mend maroBrain?", "Profilin e ruajtur në Maro dhe faktet që kërkon t’i mbajë mend. Kujtimet kanë burim dhe versione. Historia e profilit fillon nga aktivizimi i MCP-së; nuk importohet automatikisht historia e ChatGPT."],
            ["A ndryshojnë të dhënat e mia në Maro?", "Leximi nuk e ndryshon profilin e brendit. Kur kërkon një përditësim përmes maroBrain, ai ruhet edhe në Maro. Kujtimet e veçanta nuk e mbishkruajnë profilin; fshirja e një kujtimi heq edhe versionet e tij."],
            ["Si funksionojnë privatësia dhe plani?", "Lidhjet përdorin autorizim OAuth dhe workspace-in tënd aktiv. Promptet e sistemit dhe kredencialet mbeten private. Aksesi, limitet dhe politika ekzistuese e ruajtjes së maroBrain vlejnë edhe këtu."],
          ].map(([title, description]) => <details key={title} className="py-5"><summary className="cursor-pointer text-[16px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{title}</summary><p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-2">{description}</p></details>)}
        </div>
        <p className="mt-6 text-[14px] text-ink-2">Të duhet ndihmë me lidhjen? <Link href="/contact" className="font-semibold text-brand underline underline-offset-4">Na shkruaj.</Link></p>
      </section>
    </div>
  );
}
