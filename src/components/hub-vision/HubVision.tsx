"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Layers } from "lucide-react";
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

function WorkspaceContext() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { user } = useMaro();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  if (!activeWorkspace) return <span className={s.workspaceLoading} aria-label="Duke ngarkuar hapësirën" />;
  return <div className={s.workspace}><span className={s.workspaceIcon}><Layers size={15} /></span><span className={s.workspaceLabel}>{copy.workspace}</span><div className={s.workspaceSelect}>
    <select aria-label="Ndrysho hapësirën e punës" value={activeWorkspace.id} disabled={busy} onChange={async (e) => {
      setBusy(true);
      try { await setActiveWorkspace(e.target.value); } catch { toast(copy.workspaceError, "error"); } finally { setBusy(false); }
    }}>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select><ChevronDown size={14} aria-hidden /></div></div>;
}

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

function ProfileAvatar({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={s.profileAvatar} aria-hidden="true">
    {url && !failed ? <img src={url} alt="" onError={() => setFailed(true)} /> : name.charAt(0).toLocaleUpperCase("sq")}
  </span>;
}

export function HubVision({ embedded = false }: { embedded?: boolean }) {
  const { user } = useMaro();
  const displayName = user?.name?.trim();
  const Surface = embedded ? "div" : "main";
  return <Surface className={s.hub}>
    <div className={s.greeting}><h1><span>{copy.greeting}{displayName ? "," : "."}</span>{displayName && <span className={s.greetingPerson}><ProfileAvatar key={user?.avatarUrl ?? user?.id} url={user?.avatarUrl} name={displayName} /><span>{displayName}</span></span>}</h1></div>
    {user && <div className={s.contextRow}><WorkspaceContext /></div>}
    <Launchpad />
    <ContinueCreating />
    <div id="hub-discover" className={s.discovery}><Ecosystem /><PresetDiscovery /></div>
  </Surface>;
}
