"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import {
  fetchPrompts,
  toggleLike,
} from "@/lib/services/promptsService";
import {
  PROMPT_CATEGORIES,
  PROMPT_ATTACH_KEY,
  type PromptItem,
} from "@/lib/prompts/types";
import { getTool } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import {
  Search,
  Heart,
  Lightbulb,
  Plus,
  Loader2,
} from "lucide-react";

const BRAND = "#253FDA";

export default function PromptsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useMaro();

  const [items, setItems] = React.useState<PromptItem[]>([]);
  const [liked, setLiked] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  const [category, setCategory] = React.useState<string | null>(null);
  const [keyword, setKeyword] = React.useState("");
  const [onlyLiked, setOnlyLiked] = React.useState(false);

  const [active, setActive] = React.useState<PromptItem | null>(null);

  React.useEffect(() => {
    let alive = true;
    void fetchPrompts().then((r) => {
      if (!alive) return;
      setItems(r.items);
      setLiked(new Set(r.liked));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items
      .filter((p) => {
        if (category && p.category !== category) return false;
        if (onlyLiked && !liked.has(p.id)) return false;
        if (kw) {
          const hay = [p.code, p.category, ...(p.keywords ?? [])].join(" ").toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [items, category, keyword, onlyLiked, liked]);

  const recentPresets = filtered.slice(0, 6);

  const attachPrompt = (p: PromptItem) => {
    const tool = getTool(p.target_tool);
    if (!tool) {
      toast("Ky tool nuk është i disponueshëm.");
      return;
    }
    try {
      sessionStorage.setItem(
        PROMPT_ATTACH_KEY,
        JSON.stringify({
          id: p.id,
          code: p.code,
          targetTool: p.target_tool,
          thumbnailUrl: p.featured_url,
        })
      );
    } catch {
      /* ignore */
    }
    router.push(tool.route);
  };

  const onToggleLike = (p: PromptItem) => {
    if (!user) {
      toast("Hyr për të ruajtur të preferuarat.");
      return;
    }
    const next = new Set(liked);
    const isLiked = next.has(p.id);
    if (isLiked) next.delete(p.id);
    else next.add(p.id);
    setLiked(next);
    void toggleLike(p.id, !isLiked);
  };

  return (
    <AppShell>
      <div className="relative flex h-full min-w-0 flex-col overflow-x-clip max-lg:h-auto max-lg:overflow-y-visible overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-aurora" />

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Mini-hero */}
          <div className="flex flex-col items-center py-8 text-center sm:py-12">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl"
              style={{ background: "rgba(37,63,218,0.12)", color: BRAND }}
            >
              <Lightbulb className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-[clamp(28px,5vw,44px)] font-light tracking-brand text-ink">
              maro Presets
            </h1>
            <p className="mt-3 text-[clamp(16px,2.2vw,20px)] font-medium text-ink-2">
              Template gati — zgjidh, remix &amp; maro
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-7">
            <div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2">
              <Search className="h-5 w-5 shrink-0 text-ink-3" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Kërko: burger, pizza, studio, outside…"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
              />
              <FilterToggle
                active={onlyLiked}
                onClick={() => setOnlyLiked((v) => !v)}
                title="Të preferuarat"
                color="#ff5a7a"
              >
                <Heart className={cn("h-4 w-4", onlyLiked && "fill-current")} />
              </FilterToggle>
            </div>

            {/* Category chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip active={category === null} onClick={() => setCategory(null)}>
                Të gjitha
              </Chip>
              {PROMPT_CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-7">
            {loading ? (
              <div className="grid place-items-center py-20 text-ink-3">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="grid place-items-center rounded-2xl bg-surface py-20 text-center">
                <Lightbulb className="h-8 w-8 text-ink-3" />
                <p className="mt-3 text-[15px] font-semibold text-ink">Asnjë preset për këtë kërkim</p>
                <p className="mt-1 text-[13.5px] text-ink-3">Provo një kategori ose fjalëkyç tjetër.</p>
              </div>
            ) : (
              <>
                {recentPresets.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-3">
                      Presetat e fundit
                    </h2>
                    <div className="scroll-thin mt-3 flex gap-3 overflow-x-auto pb-2">
                      {recentPresets.map((p) => (
                        <div key={`recent-${p.id}`} className="w-[200px] shrink-0 sm:w-[220px]">
                          <PromptCard
                            item={p}
                            liked={liked.has(p.id)}
                            onOpen={() => setActive(p)}
                            onLike={() => onToggleLike(p)}
                            onAttach={() => attachPrompt(p)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filtered.map((p) => (
                    <PromptCard
                      key={p.id}
                      item={p}
                      liked={liked.has(p.id)}
                      onOpen={() => setActive(p)}
                      onLike={() => onToggleLike(p)}
                      onAttach={() => attachPrompt(p)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {active && (
        <PromptLightbox
          item={active}
          liked={liked.has(active.id)}
          onClose={() => setActive(null)}
          onLike={() => onToggleLike(active)}
          onAttach={() => {
            setActive(null);
            attachPrompt(active);
          }}
        />
      )}
    </AppShell>
  );
}

// ---- Search-bar filter toggle ----
function FilterToggle({
  active,
  onClick,
  title,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors",
        !active && "border-transparent text-ink-3 hover:text-ink"
      )}
      style={active ? { color, borderColor: color, background: `${color}1a` } : undefined}
    >
      {children}
    </button>
  );
}

// ---- Category chip ----
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
        active
          ? "border-transparent bg-ink text-canvas"
          : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}

// ---- Prompt card ----
function PromptCard({
  item,
  liked,
  onOpen,
  onLike,
  onAttach,
}: {
  item: PromptItem;
  liked: boolean;
  onOpen: () => void;
  onLike: () => void;
  onAttach: () => void;
}) {
  const toolName = getTool(item.target_tool)?.name ?? item.target_tool;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-surface transition-colors">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative w-full overflow-hidden bg-surface-2">
          {item.featured_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.featured_url}
              alt=""
              loading="lazy"
              className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid aspect-[3/4] w-full place-items-center text-ink-3">
              <Lightbulb className="h-8 w-8" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-scrim px-2.5 py-1 text-[12px] font-semibold text-on-scrim backdrop-blur">
            {item.category}
          </span>
          {/* Bottom overlay: code + tool + like */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/65 via-black/15 to-transparent px-3 pb-2.5 pt-10">
            <span className="min-w-0">
              <span className="block truncate font-mono text-[12px] font-bold text-white">{item.code}</span>
              <span className="block truncate text-[11.5px] text-white/70">{toolName}</span>
            </span>
          </div>
        </div>
      </button>
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAttach();
          }}
          className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/55"
          aria-label="maro me këtë preset"
          title="maro me këtë preset"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/55"
          style={liked ? { color: "#ff5a7a" } : undefined}
          aria-label="Pëlqe"
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
        </button>
      </div>
    </div>
  );
}

// ---- Lightbox ----
function PromptLightbox({
  item,
  liked,
  onClose,
  onLike,
  onAttach,
}: {
  item: PromptItem;
  liked: boolean;
  onClose: () => void;
  onLike: () => void;
  onAttach: () => void;
}) {
  const toolName = getTool(item.target_tool)?.name ?? item.target_tool;

  return (
    <Modal open onClose={onClose} size="lg" className="max-w-3xl overflow-hidden p-0">
      <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-square bg-surface-2 sm:aspect-auto">
          {item.featured_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.featured_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-[240px] w-full place-items-center text-ink-3">
              <Lightbulb className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[12px] font-bold"
              style={{ background: "rgba(0,253,186,0.14)", color: "#04231b" }}
            >
              {item.category}
            </span>
            <span className="font-mono text-[12px] font-semibold text-ink-3">{item.code}</span>
          </div>

          <p className="mt-3 text-[13.5px] text-ink-2">
            Preset profesional për <span className="font-semibold text-ink">{toolName}</span>. Shtoje te
            tooli — instruksionet e brendshme nuk ekspozohen; maro aplikon presetin në gjenerim.
          </p>

          {item.keywords?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.keywords.slice(0, 12).map((k) => (
                <span key={k} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-ink-3">
                  {k}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-5">
            <button
              onClick={onAttach}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-bold text-[#04231b] transition-transform active:scale-[0.98]"
              style={{ background: BRAND }}
            >
              <Plus className="h-5 w-5" /> maro
            </button>
            <button
              onClick={onLike}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:bg-surface-2"
              style={liked ? { color: "#ff5a7a" } : undefined}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} /> Pëlqe
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
