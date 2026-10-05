"use client";

import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { promptLinks, type PromptLink } from "@/lib/prompt/links";

function LinkPreview({ link }: { link: PromptLink }) {
  const [failed, setFailed] = useState(false);
  return <a href={link.href} target="_blank" rel="noopener noreferrer" title={link.href} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2 transition-colors hover:text-ink">
    {failed ? <Globe className="h-3.5 w-3.5 shrink-0" /> : <img src={link.favicon} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-3.5 w-3.5 shrink-0 object-contain" onError={() => setFailed(true)} />}
    <span className="max-w-64 truncate">{link.label}</span>
  </a>;
}

export function PromptLinks({ value }: { value: string }) {
  const links = useMemo(() => promptLinks(value), [value]);
  if (!links.length) return null;
  return <div aria-label="Linqet në prompt" className="flex max-h-24 flex-wrap gap-2 overflow-y-auto px-2 py-2">{links.map(link => <LinkPreview key={link.href} link={link} />)}</div>;
}
