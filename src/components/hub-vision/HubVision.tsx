"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Layers } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { useToast } from "@/components/ui/Toast";
import { StableImage } from "@/components/app/StableImage";
import { resumableCreations, resumeHref } from "./data";
import { Launchpad } from "./Launchpad";
import { Ecosystem } from "./Ecosystem";
import { PresetDiscovery } from "./PresetDiscovery";
import { copy } from "./content";
import s from "./HubVision.module.css";

function ContinueCreating() {
  const { ready, creations, activeWorkspaceScope } = useMaro();
  const { activeWorkspace } = useWorkspace();
  if (!ready) return null;
  const recent = resumableCreations(creations, activeWorkspaceScope, activeWorkspace?.id ?? null);
  if (!recent.length) return null;
  return <section className={s.continueSection} aria-labelledby="continue-title"><div className={s.continueTitle}><h2 id="continue-title">{copy.continue}</h2><Link href="/krijimet">{copy.history}<ArrowUpRight size={15} /></Link></div><div className={s.recentList}>
    {recent.map((item) => <Link href={resumeHref(item.id)} className={s.recentItem} key={item.id}>
      <StableImage src={item.urls[0]} alt="" className={s.recentImage} />
      <span><strong>{item.title || item.prompt}</strong><small>maroImazh · {new Intl.DateTimeFormat("sq", { day: "numeric", month: "short" }).format(new Date(item.createdAt))}</small></span><ArrowUpRight size={17} aria-hidden />
    </Link>)}
  </div></section>;
}

function WorkspaceSelect() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!activeWorkspace) return <span className={s.workspaceLoading} aria-label="Duke ngarkuar hapësirën" />;

  async function choose(id: string) {
    if (busy || id === activeWorkspace?.id) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await setActiveWorkspace(id);
      setOpen(false);
    } catch {
      toast(copy.workspaceError, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${s.workspaceField} ${s.heroWorkspaceField}`} ref={rootRef}>
      <span className={s.workspaceLabel} id="hub-workspace-label">{copy.workspace}</span>
      <button
        type="button"
        className={s.workspaceTrigger}
        aria-labelledby="hub-workspace-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={s.workspaceIcon}><Layers size={15} aria-hidden /></span>
        <span className={s.workspaceTriggerLabel}>{activeWorkspace.name}</span>
        <ChevronDown size={16} className={s.workspaceChevron} aria-hidden data-open={open || undefined} />
      </button>
      {open ? (
        <ul className={`maro-menu ${s.workspaceMenu}`} role="listbox" aria-label={copy.workspace}>
          {workspaces.map((w) => {
            const selected = w.id === activeWorkspace.id;
            return (
              <li key={w.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`maro-menu__item ${s.workspaceMenuItem}${selected ? ` ${s.workspaceMenuItemActive}` : ""}`}
                  onClick={() => void choose(w.id)}
                >
                  <span className={s.workspaceMenuGlyph} aria-hidden>{w.name.charAt(0).toLocaleUpperCase("sq")}</span>
                  <span className={s.workspaceMenuName}>{w.name}</span>
                  {selected ? <Check size={16} className={s.workspaceMenuCheck} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function HubHeroBanner({ displayName }: { displayName?: string }) {
  const { user } = useMaro();
  return (
    <header className={s.heroBanner}>
      <div className={s.heroBannerInner}>
        <div className={s.heroBannerStack}>
          <h1 className={s.heroTitle}>
            <span>{copy.greeting}{displayName ? "," : "."}</span>
            {displayName ? <span className={s.greetingPerson}>{displayName}</span> : null}
          </h1>
          {user ? (
            <div className={s.heroWorkspace}>
              <WorkspaceSelect />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function HubVision({ embedded = false }: { embedded?: boolean }) {
  const { user } = useMaro();
  const displayName = user?.name?.trim();
  const Surface = embedded ? "div" : "main";
  return (
    <Surface className={s.hub}>
      <div className={s.hubHeroStage}>
        <HubHeroBanner displayName={displayName} />
        <Launchpad />
      </div>
      <ContinueCreating />
      <div id="hub-discover" className={s.discovery}>
        <Ecosystem />
        <PresetDiscovery />
      </div>
    </Surface>
  );
}
