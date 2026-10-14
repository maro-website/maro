"use client";

import { ArrowUpRight, Check, Crown, Heart } from "lucide-react";
import { StableImage } from "@/components/app/StableImage";
import { ToolIcon } from "@/components/app/OptionIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getProductBrand } from "@/lib/design/maro-system";
import { PRESET_TOOL_META } from "@/lib/presets/model";
import type { PromptItem } from "@/lib/prompts/types";
import { cn } from "@/lib/utils/cn";
import type { CSSProperties } from "react";

export function PresetQuickView({ item, liked, using, onClose, onLike, onUse }: { item: PromptItem; liked: boolean; using: boolean; onClose: () => void; onLike: () => void; onUse: () => void }) {
  return <Modal open onClose={onClose} size="lg" aria-label={`Preview i presetit ${item.title}`} className="presets-quick-view max-w-5xl p-0">
    <div className="presets-quick-layout" style={{ "--preset-accent": getProductBrand(item.tool)?.color } as CSSProperties}>
      <div className="presets-quick-image" data-tool={item.tool}><StableImage src={item.featured_url} module={item.tool} alt={item.title} loading="eager" className="h-full w-full object-contain" /></div>
      <div className="presets-quick-info">
        <p className="presets-quick-tool"><ToolIcon toolId={item.tool} className="h-5 w-5" />{PRESET_TOOL_META[item.tool].label}</p>
        <div className="presets-quick-tags"><span>{item.category}</span>{item.featured && <span>I përzgjedhur</span>}{item.access_level === "premium" && <span><Crown className="h-3 w-3" /> Premium</span>}</div>
        <h2>{item.title}</h2><p className="presets-quick-description">{item.description || "Të pëlqen kjo ide? Nise me këtë preset dhe përshtate për brendin tënd."}</p>
        {item.keywords.length > 0 && <div className="presets-quick-keywords">{item.keywords.slice(0, 8).map((word) => <span key={word}>{word}</span>)}</div>}
        <div className="presets-quick-how"><h3>Prej idesë te krijimi yt.</h3><p><Check className="h-4 w-4" /> Drejtimi kreativ vjen gati.</p><p><Check className="h-4 w-4" /> Ti e përshtat para se me gjeneru.</p></div>
        <div className="presets-quick-actions"><Button variant="secondary" size="icon" onClick={onLike} aria-label={liked ? "Hiqe nga të preferuarat" : "Ruaje te të preferuarat"} aria-pressed={liked}><Heart className={cn("h-5 w-5", liked && "fill-current text-danger")} /></Button><Button variant="brand" size="lg" loading={using} onClick={onUse} iconRight={<ArrowUpRight className="h-5 w-5" />}>{using ? "Duke hapur…" : "Përdor këtë preset"}</Button></div>
        <p className="presets-quick-note">Hapet në {PRESET_TOOL_META[item.tool].label}. Gjenerimi nis kur të jesh gati.</p>
      </div>
    </div>
  </Modal>;
}
