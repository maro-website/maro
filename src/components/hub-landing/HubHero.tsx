"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Layers, Pause, Play } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { useTheme } from "@/context/theme";
import { useMenuKeyboard } from "@/components/ui/useMenuKeyboard";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StableImage } from "@/components/app/StableImage";
import { PresetQuickView } from "@/components/presets/PresetQuickView";
import { fetchPromptDetail, fetchPrompts, toggleLike } from "@/lib/services/promptsService";
import { PROMPT_ATTACH_KEY, type PromptItem } from "@/lib/prompts/types";
import { PRESET_TOOL_META } from "@/lib/presets/model";
import { MARO_PRODUCTS } from "@/lib/design/maro-system";
import LightTunnel from "./reactbits/LightTunnel";
import { latestHubPresets } from "./model";
import s from "./HubLanding.module.css";
import "@/components/presets/presets.css";

const tunnelBrands = [MARO_PRODUCTS.maroImazh, MARO_PRODUCTS.maroLogo, MARO_PRODUCTS.maroBrain, MARO_PRODUCTS.maroPresets, MARO_PRODUCTS.maroWeb, MARO_PRODUCTS.maroFilma, MARO_PRODUCTS.maroAudio, MARO_PRODUCTS.maroMarketing];
const tunnelIcons = tunnelBrands.map(brand => brand.icon);
const tunnelColors = tunnelBrands.map(brand => brand.color);

function WorkspacePicker() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  useMenuKeyboard(open, panel, trigger, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  async function choose(id: string) {
    if (busy || id === activeWorkspace?.id) { setOpen(false); return; }
    setBusy(true);
    try { await setActiveWorkspace(id); setOpen(false); }
    catch { toast("Hapësira nuk u ndryshua. Provo përsëri.", "error"); }
    finally { setBusy(false); }
  }
  return <div className={s.workspace} ref={root} id="workspace">
    <span className={s.workspaceLabel} id="hub-workspace-label">Hapësira jote</span>
    {!activeWorkspace ? <div className={s.workspaceLoading} role="status" aria-label="Duke ngarkuar hapësirën" /> : <>
      <button ref={trigger} className={s.workspaceTrigger} type="button" aria-labelledby="hub-workspace-label hub-workspace-name" aria-haspopup="listbox" aria-expanded={open} disabled={busy} onClick={() => setOpen(value => !value)}>
        {activeWorkspace.iconUrl ? <StableImage src={activeWorkspace.iconUrl} alt="" className={s.workspaceImage} loading="eager" /> : <Layers size={20} className={s.workspaceLayers} aria-hidden />}
        <span id="hub-workspace-name" className={s.workspaceTriggerName}>{activeWorkspace.name}</span><ChevronDown size={16} aria-hidden />
      </button>
      {open && <ul ref={panel} className={`maro-menu ${s.workspaceMenu}`} role="listbox" aria-label="Workspace-et">{workspaces.map(item => <li key={item.id} role="none"><button type="button" role="option" aria-selected={item.id === activeWorkspace.id} disabled={busy} className="maro-menu__item" onClick={() => void choose(item.id)}><span className={s.workspaceGlyph} aria-hidden>{item.iconUrl ? <StableImage src={item.iconUrl} alt="" className={s.workspaceImage} /> : item.name.charAt(0)}</span><span className={s.workspaceName}>{item.name}</span>{item.id === activeWorkspace.id && <Check size={16} className={s.workspaceLayers} aria-hidden />}</button></li>)}</ul>}
    </>}
  </div>;
}

function PresetRail({ items, loading, dialogOpen, onSelect }: { items: PromptItem[]; loading: boolean; dialogOpen: boolean; onSelect: (item: PromptItem) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const touch = useRef<number | null>(null);
  const ignoreClickUntil = useRef(0);
  const [slide, setSlide] = useState(0);
  const [step, setStep] = useState(280);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  const count = items.length;
  useEffect(() => {
    const measure = () => setStep((card.current?.getBoundingClientRect().width ?? 264) + 16);
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    measure();
    return () => observer.disconnect();
  }, [count]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (paused || hovered || focused || reduced || !visible || dialogOpen || count < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden) setSlide(index => Math.min(index + 1, count)); }, 5500);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reduced, visible, dialogOpen, count]);
  useEffect(() => { if (!animate) { const frame = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(frame); } }, [animate]);
  useEffect(() => { setSlide(0); }, [count]);
  const previous = () => { if (slide === 0) { setAnimate(false); setSlide(Math.max(0, count - 1)); } else setSlide(index => index - 1); };
  const next = () => setSlide(index => reduced ? (index + 1) % Math.max(1, count) : Math.min(index + 1, count));
  return <div className={s.carousel} aria-roledescription="carousel" aria-label="10 presetet e fundit" aria-busy={loading} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div ref={viewport} className={s.carouselViewport} onTouchStart={event => { touch.current = event.touches[0].clientX; }} onTouchEnd={event => { if (touch.current === null || count < 2) return; const delta = event.changedTouches[0].clientX - touch.current; if (Math.abs(delta) > 45) { ignoreClickUntil.current = Date.now() + 350; delta > 0 ? previous() : next(); } touch.current = null; }}>
      <div className={s.carouselTrack} style={{ transform: `translate3d(${-slide * step}px,0,0)`, transitionDuration: animate && !reduced ? "700ms" : "0ms" }} onTransitionEnd={event => { if (event.target === event.currentTarget && slide >= count) { setAnimate(false); setSlide(0); } }}>
        {loading ? Array.from({ length: 10 }, (_, index) => <div className={`${s.presetCard} ${s.presetSkeleton}`} key={index} />) : [...items, ...items].map((item, index) => <button type="button" key={`${item.id}-${index}`} ref={index === 0 ? card : undefined} className={s.presetCard} aria-label={`Shiko presetin: ${item.title || item.code}`} aria-hidden={index >= count || undefined} tabIndex={index >= count ? -1 : 0} onClick={() => { if (Date.now() >= ignoreClickUntil.current) onSelect(item); }}>
          <StableImage src={item.featured_url} alt={item.title || item.code} module={item.tool} className={s.presetImage} loading={index < 5 ? "eager" : "lazy"} draggable={false} />
          <span className={s.presetCaption}><span><strong>{item.title || item.code}</strong><small>{item.category}</small></span><ArrowUpRight size={20} aria-hidden /></span>
        </button>)}
      </div>
    </div>
    <div className={`${s.section} ${s.carouselControls}`}><Link href="/presets" className={s.browseLink}>Të gjitha presetet <ArrowUpRight size={20} aria-hidden /></Link><div>
      <Button size="icon" variant="ghost" className={s.carouselControl} aria-label="Preseti paraprak" disabled={count < 2} onClick={previous}><ArrowLeft size={18} aria-hidden /></Button>
      <Button size="icon" variant="ghost" className={s.carouselPause} aria-label={paused || reduced ? "Aktivizo carousel-in" : "Pauzo carousel-in"} aria-pressed={paused || Boolean(reduced)} disabled={Boolean(reduced) || count < 2} onClick={() => setPaused(value => !value)}>{paused || reduced ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}</Button>
      <Button size="icon" variant="ghost" className={s.carouselControl} aria-label="Preseti i radhës" disabled={count < 2} onClick={next}><ArrowRight size={18} aria-hidden /></Button>
    </div></div>
    {!loading && !count && <p className={`${s.section} ${s.catalogEmpty}`}>Presetet nuk u ngarkuan tani. <Link href="/presets">Shiko katalogun.</Link></p>}
  </div>;
}

export function HubHero() {
  const { user, ready } = useMaro();
  const { theme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PromptItem | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const pending = useRef(false);
  const likePending = useRef(new Set<string>());
  useEffect(() => {
    let alive = true;
    setLoading(true); setItems([]); setActive(null); setLiked(new Set());
    void (async () => {
      try {
        let page = 0;
        let more = true;
        const all: PromptItem[] = [];
        const likes = new Set<string>();
        while (alive && more) {
          const result = await fetchPrompts({ tool: "imazh", page, limit: 60 });
          if (!alive) return;
          all.push(...result.items);
          result.liked.forEach(id => likes.add(id));
          more = result.hasMore && result.items.length > 0;
          page += 1;
        }
        if (alive) { setItems(latestHubPresets(all)); setLiked(likes); }
      } catch { /* The catalog link remains usable if discovery is temporarily unavailable. */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?.id]);
  const apply = async (item: PromptItem) => {
    if (pending.current) return;
    pending.current = true; setUsingId(item.id);
    try {
      const detail = await fetchPromptDetail(item.id);
      if (detail.tool !== item.tool || detail.target_tool !== PRESET_TOOL_META[item.tool].targetTool) throw new Error("tool-mismatch");
      sessionStorage.setItem(PROMPT_ATTACH_KEY, JSON.stringify({ id: detail.id, code: detail.code, title: detail.title, tool: detail.tool, targetTool: detail.target_tool, thumbnailUrl: detail.featured_url, config: detail.config }));
      router.push(PRESET_TOOL_META[item.tool].route);
    } catch { toast("Preseti nuk mund të hapet tani. Provo përsëri.", "error"); }
    finally { pending.current = false; setUsingId(null); }
  };
  const like = (item: PromptItem) => {
    if (!user) { toast("Hyr për të ruajtur të preferuarat."); return; }
    if (likePending.current.has(item.id)) return;
    likePending.current.add(item.id);
    const wasLiked = liked.has(item.id);
    setLiked(current => { const next = new Set(current); if (wasLiked) next.delete(item.id); else next.add(item.id); return next; });
    void toggleLike(item.id, !wasLiked).finally(() => likePending.current.delete(item.id));
  };
  return <>
    <section className={s.hero} id="top" aria-labelledby="hub-hero-title">
      <div className={s.tunnel} aria-hidden><LightTunnel cableColor="#ffffff" pulseColor="#ffffff" cableCount={12} pulseDensity={0.86} flowDirection="outward" mouseInteraction={false} clickSurge pulseSpeed={1.1} pulseLength={0.36} pulseBlend={0.03} pulseWidth={0.75} thickness={0.54} rimWidth={0.07} waviness={0} sway={0} bend={0} glow={3} size={1.15} fadeNear={0.42} fadeFar={1.3} brightness={0.5} grain mouseStrength={0} toolIcons={tunnelIcons} toolColors={tunnelColors} iconSize={14} lightMode={theme === "qelt"} dpr={1.5} style={{}} /></div>
      <div className={s.heroCopy}><h1 id="hub-hero-title">Mos maro prej zeros.</h1>{!ready ? <div className={s.sessionLoading} role="status" aria-label="Duke ngarkuar llogarinë" /> : user ? <WorkspacePicker /> : <div className={s.heroActions}><Link href="/sign-in" className={`maro-button ${s.signIn}`} data-variant="secondary">Hyr</Link><Link href="/sign-up" className="maro-button" data-variant="brand">Regjistrohu</Link></div>}</div>
      <PresetRail items={items} loading={loading} dialogOpen={Boolean(active)} onSelect={setActive} />
    </section>
    {active && <PresetQuickView item={active} liked={liked.has(active.id)} using={usingId === active.id} onClose={() => setActive(null)} onLike={() => like(active)} onUse={() => void apply(active)} />}
  </>;
}
