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
    <div className={cn("maro-page-header", className)}>
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-ink">{title}</h1>
        {description ? <p className="mt-[10px] text-[13px] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="maro-action-row">{actions}</div> : null}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="maro-panel text-center">
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      {description ? <p className="mt-[10px] text-[13px] text-ink-3">{description}</p> : null}
    </div>
  );
}

export function AdminStatusBadge({
  status,
}: {
  status: "healthy" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    healthy: "bg-surface-2 text-success",
    warning: "bg-surface-2 text-warning",
    danger: "bg-surface-2 text-danger",
    neutral: "bg-surface-2 text-ink-2",
  } as const;
  return (
    <span className={cn("inline-flex min-h-9 items-center rounded-maro12 px-[10px] text-[11px] font-semibold", tones[status])}>
      {status}
    </span>
  );
}
