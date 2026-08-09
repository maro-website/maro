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

const BRAND = "#253FDA";
const REVEAL_NO_CONFIRM_KEY = "maro:promptRevealNoConfirm";

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
            <h1 className="mt-5 text-[clamp(28px,5vw,44px)] font-light tracking-[-0.03em] text-ink">
              maro Prompts
            </h1>
            <p className="mt-3 text-[clamp(16px,2.2vw,20px)] font-medium text-ink-2">
              Lype, kliko &amp; maro
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
              <FilterToggle
                active={onlyOwned}
                onClick={() => setOnlyOwned((v) => !v)}
                title="Të blera"
                color={BRAND}
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
              <div className="grid place-items-center rounded-2xl bg-surface py-20 text-center">
                <Lightbulb className="h-8 w-8 text-ink-3" />
                <p className="mt-3 text-[15px] font-semibold text-ink">Asnjë prompt për këtë kërkim</p>
                <p className="mt-1 text-[13.5px] text-ink-3">Provo një kategori ose fjalëkyç tjetër.</p>
              </div>
            ) : (
              <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [column-fill:_balance]">
                {filtered.map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid">
                    <PromptCard
                      item={p}
                      liked={liked.has(p.id)}
                      owned={owned.has(p.id)}
                      onOpen={() => setActive(p)}
                      onLike={() => onToggleLike(p)}
                    />
                  </div>
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
          {owned && (
            <span
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-[#04231b]"
              style={{ background: BRAND }}
              title="E blere"
            >
              <Check className="h-4 w-4" />
            </span>
          )}
          {/* Bottom overlay: code + tool + like */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/65 via-black/15 to-transparent px-3 pb-2.5 pt-10">
            <span className="min-w-0">
              <span className="block truncate font-mono text-[12px] font-bold text-white">{item.code}</span>
              <span className="block truncate text-[11.5px] text-white/70">{toolName}</span>
            </span>
          </div>
        </div>
      </button>
      <button
        onClick={onLike}
        className="absolute bottom-2.5 right-2.5 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/55"
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
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [dontAsk, setDontAsk] = React.useState(false);
  const toolName = getTool(item.target_tool)?.name ?? item.target_tool;

  const doReveal = async () => {
    setRevealing(true);
    const text = await onReveal();
    setRevealing(false);
    if (text !== null) setRevealed(text);
  };

  // Owned prompts are free to re-copy; the paid path shows a confirmation the
  // first time (until the user opts out via "don't ask again").
  const requestReveal = () => {
    if (owned) {
      void doReveal();
      return;
    }
    let skip = false;
    try {
      skip = localStorage.getItem(REVEAL_NO_CONFIRM_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (skip) void doReveal();
    else setConfirmOpen(true);
  };

  const confirmReveal = () => {
    if (dontAsk) {
      try {
        localStorage.setItem(REVEAL_NO_CONFIRM_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setConfirmOpen(false);
    void doReveal();
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
                <div className="rounded-xl bg-surface-2 p-3">
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
              style={{ background: BRAND }}
            >
              <Plus className="h-5 w-5" /> maro
            </button>

            <div className="flex gap-2">
              {revealed === null ? (
                <button
                  onClick={requestReveal}
                  disabled={revealing}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  {revealing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : owned ? (
                    <Copy className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {owned
                    ? "Analizoje + kopjoje"
                    : `Analizoje + kopjoje · ${DEFAULT_PROMPT_REVEAL_COST}`}
                </button>
              ) : null}
              <button
                onClick={onLike}
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-surface text-ink-3 transition-colors hover:text-ink"
                style={liked ? { color: "#ff5a7a" } : undefined}
                aria-label="Pëlqe"
              >
                <Heart className={cn("h-5 w-5", liked && "fill-current")} />
              </button>
            </div>
            {!owned && revealed === null && (
              <p className="text-center text-[12px] text-ink-3">
                &quot;Analizoje + kopjoje&quot; kushton {DEFAULT_PROMPT_REVEAL_COST} kredite dhe të
                jep tekstin e plotë për ta studiuar ose përdorur jashtë maro. Brenda maro,
                &quot;maro&quot; është gjithmonë falas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation before spending credits to reveal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} size="sm">
        <div className="p-6">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: "rgba(0,253,186,0.14)", color: "#0b8f6e" }}
            >
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[16px] font-bold text-ink">Analizoje promptin</div>
              <div className="text-[12.5px] text-ink-3">{DEFAULT_PROMPT_REVEAL_COST} kredite</div>
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">
            Kjo të hap tekstin e plotë të promptit që ta studiosh ose ta përdorësh jashtë maro. Nëse
            do vetëm ta gjenerosh brenda maro, kliko <span className="font-semibold text-ink">&quot;maro&quot;</span>{" "}
            &mdash; është falas.
          </p>

          <button
            type="button"
            onClick={() => setDontAsk((v) => !v)}
            className="mt-4 flex w-full items-center gap-2.5 text-left text-[13px] font-medium text-ink-2"
          >
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                dontAsk ? "border-transparent text-[#04231b]" : "border-line-strong text-transparent"
              )}
              style={dontAsk ? { background: BRAND } : undefined}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            Mos ma lyp këtë konfirmim më
          </button>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-xl bg-surface px-4 py-3 text-[14px] font-semibold text-ink hover:bg-surface-2"
            >
              Anulo
            </button>
            <button
              onClick={confirmReveal}
              className="flex-1 rounded-xl px-4 py-3 text-[14px] font-bold text-[#04231b] transition-transform active:scale-[0.98]"
              style={{ background: BRAND }}
            >
              Po, analizoje · {DEFAULT_PROMPT_REVEAL_COST}
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
