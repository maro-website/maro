import { cn } from "@/lib/utils/cn";

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-ink">{title}</h1>
        {description ? <p className="mt-1 text-[13px] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center">
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      {description ? <p className="mt-1 text-[13px] text-ink-3">{description}</p> : null}
    </div>
  );
}

export function AdminStatusBadge({
  status,
}: {
  status: "healthy" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    healthy: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-800",
    neutral: "bg-surface-2 text-ink-2",
  } as const;
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold", tones[status])}>
      {status}
    </span>
  );
}
