"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { fetchPrompts, fetchPromptDetail } from "@/lib/services/promptsService";
import { PROMPT_ATTACH_KEY, type PromptItem } from "@/lib/prompts/types";
import { PRESET_TOOL_META } from "@/lib/presets/model";
import { StableImage } from "@/components/app/StableImage";
import { useToast } from "@/components/ui/Toast";
import { copy } from "./content";
import s from "./HubVision.module.css";

type Tool = "imazh" | "logo";
const preferenceKey = "maro:hub-vision:preset-tool";

export function PresetDiscovery() {
  const [tool, setTool] = useState<Tool>("imazh");
  const [catalog, setCatalog] = useState<Record<Tool, PromptItem[]>>({ imazh: [], logo: [] });
  const [loaded, setLoaded] = useState(false);
  const [using, setUsing] = useState<string | null>(null);
  const pending = useRef(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try { if (localStorage.getItem(preferenceKey) === "logo") setTool("logo"); } catch { /* Device preference is optional. */ }
    let active = true;
    void Promise.allSettled([fetchPrompts({ tool: "imazh", limit: 5 }), fetchPrompts({ tool: "logo", limit: 5 })]).then(([imazh, logo]) => {
      if (!active) return;
      setCatalog({ imazh: imazh.status === "fulfilled" ? imazh.value.items : [], logo: logo.status === "fulfilled" ? logo.value.items : [] });
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const choose = (next: Tool) => { setTool(next); try { localStorage.setItem(preferenceKey, next); } catch { /* Optional. */ } };
  const apply = async (item: PromptItem) => {
    if (pending.current) return;
    pending.current = true;
    setUsing(item.id);
    try {
      const detail = await fetchPromptDetail(item.id);
      if (detail.tool !== item.tool || detail.target_tool !== PRESET_TOOL_META[item.tool].targetTool) throw new Error("tool-mismatch");
      sessionStorage.setItem(PROMPT_ATTACH_KEY, JSON.stringify({ id: detail.id, code: detail.code, title: detail.title, tool: detail.tool, targetTool: detail.target_tool, thumbnailUrl: detail.featured_url, config: detail.config }));
      router.push(PRESET_TOOL_META[item.tool].route);
    } catch { toast(copy.presetError, "error"); }
    finally { pending.current = false; setUsing(null); }
  };

  // Empty catalogs do not turn the Hub into an empty-state dashboard.
  if (loaded && !catalog.imazh.length && !catalog.logo.length) return <div className={s.presetInvitation}><h2>{copy.presets}</h2><Link href="/prompts">Eksploro drejtime kreative<ArrowUpRight size={20} /></Link></div>;
  return <section className={s.presets} aria-labelledby="presets-title">
    <div className={s.sectionHeading}><h2 id="presets-title">{copy.presets}</h2><Link href={`/prompts?tool=${tool}`} className={s.textLink}>{copy.browse}<ArrowUpRight size={17} /></Link></div>
    <div className={s.presetToolbar}><div className={s.presetTabs} role="group" aria-label="Lloji i preseteve">{(["imazh", "logo"] as const).map((id) => <button type="button" key={id} onClick={() => choose(id)} aria-pressed={tool === id}>{PRESET_TOOL_META[id].label}</button>)}</div></div>
    <div className={s.presetGrid} data-compact={loaded && catalog[tool].length < 3 || undefined} aria-busy={!loaded}>
      {!loaded ? Array.from({ length: 5 }, (_, i) => <div className={s.presetSkeleton} key={i} />) : catalog[tool].map((item) => <button type="button" className={s.presetCard} key={item.id} disabled={using !== null} onClick={() => void apply(item)} aria-label={`${copy.usePreset}: ${item.title || item.code}`}>
        <div className={s.presetImage}>{item.featured_url ? <StableImage src={item.featured_url} alt="" className={s.presetMedia} /> : <div className={s.presetNoMedia} aria-hidden="true"><span>{item.category || PRESET_TOOL_META[item.tool].shortLabel}</span><small>MARO PRESET</small></div>}<span className={s.presetUse}>{using === item.id ? <Loader2 className={s.spinner} size={20} /> : <ArrowUpRight size={20} />}</span>{item.access_level === "premium" && <span className={s.premium}>Premium</span>}</div><span className={s.presetName}>{item.title || item.code}</span><span className={s.presetCategory}>{item.category}</span>
      </button>)}
    </div>
    {loaded && !catalog[tool].length && <Link className={s.emptyCategory} href={`/prompts?tool=${tool}`}>Eksploro katalogun {PRESET_TOOL_META[tool].label}<ArrowUpRight size={16} /></Link>}
  </section>;
}
