"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Modal } from "@/components/ui/Modal";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import {
  fetchPrompts,
  toggleLike,
  revealPrompt,
  InsufficientCreditsError,
} from "@/lib/services/promptsService";
import {
  PROMPT_CATEGORIES,
  PROMPT_ATTACH_KEY,
  DEFAULT_PROMPT_REVEAL_COST,
  type PromptItem,
} from "@/lib/prompts/types";
import { getTool } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import {
  Search,
  Heart,
  DollarSign,
  Lightbulb,
  Plus,
  Copy,
  Check,
  Lock,
  Loader2,
} from "lucide-react";

const TEAL = "#00fdba";

export default function PromptsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, spendCredits } = useMaro();

  const [items, setItems] = React.useState<PromptItem[]>([]);
  const [liked, setLiked] = React.useState<Set<string>>(new Set());
  const [owned, setOwned] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  const [category, setCategory] = React.useState<string | null>(null);
  const [keyword, setKeyword] = React.useState("");
  const [onlyLiked, setOnlyLiked] = React.useState(false);
  const [onlyOwned, setOnlyOwned] = React.useState(false);

  const [active, setActive] = React.useState<PromptItem | null>(null);
  const [showBuy, setShowBuy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    void fetchPrompts().then((r) => {
      if (!alive) return;
      setItems(r.items);
      setLiked(new Set(r.liked));
      setOwned(new Set(r.owned));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((p) => {
      if (category && p.category !== category) return false;
      if (onlyLiked && !liked.has(p.id)) return false;
      if (onlyOwned && !owned.has(p.id)) return false;
      if (kw) {
        const hay = [p.code, p.category, ...(p.keywords ?? [])].join(" ").toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [items, category, keyword, onlyLiked, onlyOwned, liked, owned]);

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
      <div className="relative flex h-full flex-col overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-aurora" />

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl"
              style={{ background: "rgba(0,253,186,0.12)", color: TEAL }}
            >
              <Lightbulb className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-[clamp(26px,4vw,38px)] font-light tracking-[-0.03em] text-ink">
              maro Prompts
            </h1>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-2">
              Prompte profesionale gati për t&apos;u përdorur. Zgjidh një, shtoje te tooli me një
              klik dhe ngarko produktin tënd.
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-7">
            <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface px-3 py-2 shadow-pop">
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
              <FilterToggle
                active={onlyOwned}
                onClick={() => setOnlyOwned((v) => !v)}
                title="Të blera"
                color={TEAL}
              >
                <DollarSign className="h-4 w-4" />
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
              <div className="grid place-items-center rounded-2xl border border-line bg-surface py-20 text-center">
                <Lightbulb className="h-8 w-8 text-ink-3" />
                <p className="mt-3 text-[15px] font-semibold text-ink">Asnjë prompt për këtë kërkim</p>
                <p className="mt-1 text-[13.5px] text-ink-3">Provo një kategori ose fjalëkyç tjetër.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p) => (
                  <PromptCard
                    key={p.id}
                    item={p}
                    liked={liked.has(p.id)}
                    owned={owned.has(p.id)}
                    onOpen={() => setActive(p)}
                    onLike={() => onToggleLike(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {active && (
        <PromptLightbox
          item={active}
          liked={liked.has(active.id)}
          owned={owned.has(active.id)}
          onClose={() => setActive(null)}
          onLike={() => onToggleLike(active)}
          onAttach={() => {
            const tool = getTool(active.target_tool);
            if (!tool) {
              toast("Ky tool nuk është i disponueshëm.");
              return;
            }
            try {
              sessionStorage.setItem(
                PROMPT_ATTACH_KEY,
                JSON.stringify({ id: active.id, code: active.code, targetTool: active.target_tool })
              );
            } catch {
              /* ignore */
            }
            setActive(null);
            router.push(tool.route);
          }}
          onReveal={async () => {
            if (!user) {
              toast("Hyr për të zbuluar promptin.");
              router.push("/sign-in");
              return null;
            }
            try {
              const r = await revealPrompt(active.id);
              if (!r.alreadyOwned && r.creditsSpent) spendCredits(r.creditsSpent);
              setOwned((prev) => new Set(prev).add(active.id));
              return r.fullPrompt;
            } catch (err) {
              if (err instanceof InsufficientCreditsError) {
                setShowBuy(true);
              } else {
                toast("Zbulimi dështoi. Provo përsëri.");
              }
              return null;
            }
          }}
        />
      )}

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={DEFAULT_PROMPT_REVEAL_COST} />
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
  owned,
  onOpen,
  onLike,
}: {
  item: PromptItem;
  liked: boolean;
  owned: boolean;
  onOpen: () => void;
  onLike: () => void;
}) {
  const toolName = getTool(item.target_tool)?.name ?? item.target_tool;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-pop">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
          {item.featured_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.featured_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink-3">
              <Lightbulb className="h-8 w-8" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            {item.category}
          </span>
          {owned && (
            <span
              className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-[#04231b]"
              style={{ background: TEAL }}
              title="E blere"
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="font-mono text-[11.5px] font-semibold text-ink-3">{item.code}</span>
          <span className="text-[11.5px] text-ink-3">{toolName}</span>
        </div>
      </button>
      <button
        onClick={onLike}
        className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-ink-3 shadow-sm backdrop-blur transition-colors hover:text-ink"
        style={liked ? { color: "#ff5a7a" } : undefined}
        aria-label="Pëlqe"
      >
        <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      </button>
    </div>
  );
}

// ---- Lightbox ----
function PromptLightbox({
  item,
  liked,
  owned,
  onClose,
  onLike,
  onAttach,
  onReveal,
}: {
  item: PromptItem;
  liked: boolean;
  owned: boolean;
  onClose: () => void;
  onLike: () => void;
  onAttach: () => void;
  onReveal: () => Promise<string | null>;
}) {
  const { toast } = useToast();
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const toolName = getTool(item.target_tool)?.name ?? item.target_tool;

  const doReveal = async () => {
    setRevealing(true);
    const text = await onReveal();
    setRevealing(false);
    if (text !== null) setRevealed(text);
  };

  const doCopy = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Kopjimi dështoi.");
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" className="max-w-3xl overflow-hidden p-0">
      <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
        {/* Featured image */}
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

        {/* Details */}
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
            Prompt profesional për <span className="font-semibold text-ink">{toolName}</span>. Shtoje
            te tooli dhe gjenero me produktin tënd.
          </p>

          {item.keywords?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.keywords.slice(0, 12).map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-ink-3"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Revealed prompt (paid) */}
          <AnimatePresence>
            {revealed !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-ink-3">
                      Prompti
                    </span>
                    <button
                      onClick={doCopy}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold"
                      style={{ color: "#0b8f6e" }}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "U kopjua" : "Kopjo"}
                    </button>
                  </div>
                  <p className="scroll-thin mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                    {revealed}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-2 pt-5">
            <button
              onClick={onAttach}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-bold text-[#04231b] transition-transform active:scale-[0.98]"
              style={{ background: TEAL }}
            >
              <Plus className="h-5 w-5" /> maro
            </button>

            <div className="flex gap-2">
              {revealed === null ? (
                <button
                  onClick={doReveal}
                  disabled={revealing}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  {revealing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : owned ? (
                    <Copy className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {owned
                    ? "Zbulo & kopjo"
                    : `Zbulo & kopjo · ${DEFAULT_PROMPT_REVEAL_COST}`}
                </button>
              ) : null}
              <button
                onClick={onLike}
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-line-strong bg-surface text-ink-3 transition-colors hover:text-ink"
                style={liked ? { color: "#ff5a7a" } : undefined}
                aria-label="Pëlqe"
              >
                <Heart className={cn("h-5 w-5", liked && "fill-current")} />
              </button>
            </div>
            {!owned && revealed === null && (
              <p className="text-center text-[12px] text-ink-3">
                Zbulimi kushton {DEFAULT_PROMPT_REVEAL_COST} kredite vetëm për ta përdorur jashtë
                maro. Brenda maro, &quot;+ maro&quot; është falas.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
