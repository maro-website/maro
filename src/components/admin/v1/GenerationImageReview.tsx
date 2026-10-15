"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, ImageOff } from "lucide-react";
import { useMaro } from "@/context/store";
import { hasPermission } from "@/lib/admin/permissions";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { rateLimitedFetch } from "@/lib/client/rateLimit";
import { Button } from "@/components/ui/Button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

function useReviewImage(jobId: string, variant: "thumbnail" | "original", active: boolean) {
  const { user, accessRole } = useMaro();
  const allowed = hasPermission(accessRole, "generations.review");
  const [state, setState] = React.useState<{ url: string | null; loading: boolean; error: string | null }>({ url: null, loading: true, error: null });
  const [attempt, retry] = React.useReducer(value => value + 1, 0);
  React.useEffect(() => {
    if (!active || !allowed || !user?.id) { setState({ url: null, loading: true, error: null }); return; }
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setState({ url: null, loading: true, error: null });
    void (async () => {
      try {
        const headers = await adminAuthHeaders();
        if (controller.signal.aborted) return;
        const response = await rateLimitedFetch(`/api/admin/v1/operations/${jobId}/image?variant=${variant}`, { headers, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 403 ? "Nuk ke qasje në këtë fotografi." : response.status === 429 ? "Shumë kërkesa. Provo përsëri pas pak." : "Fotografia nuk është e disponueshme.");
        if (!response.headers.get("Content-Type")?.startsWith("image/")) throw new Error("Fotografia nuk u ngarkua.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ url: null, loading: false, error: error instanceof Error ? error.message : "Fotografia nuk u ngarkua." });
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [jobId, variant, active, allowed, user?.id, attempt]);
  return { ...state, retry };
}

/** Shared presentation also permits visual checks using local non-user fixtures. */
export function GenerationImageTile({ jobId, url, loading, error, retry }: { jobId: string; url: string | null; loading: boolean; error: string | null; retry: () => void }) {
  const href = `/admin/engine/generations/${jobId}/image`;
  return <div className="flex min-h-12 items-center gap-3">
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-maro8 bg-surface-2">
      {url ? <Link href={href} target="_blank" rel="noopener noreferrer" className="grid h-full w-full place-items-center" aria-label="Hape fotografinë në madhësi origjinale">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Rezultati i gjenerimit" className="h-full w-full object-contain" />
      </Link> : loading ? <span className="h-full w-full animate-pulse bg-surface-hover" role="status" aria-label="Duke ngarkuar fotografinë" /> : <ImageOff size={20} className="text-ink-3" aria-hidden />}
    </span>
    {url ? <Link href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-brand">Hape origjinalin <ExternalLink size={16} aria-hidden /></Link>
      : error ? <Button variant="ghost" onClick={retry} title={error} aria-label={`${error} Provo përsëri.`}>Riprovo</Button> : <span className="text-xs text-ink-3">Duke ngarkuar…</span>}
  </div>;
}

export function GenerationResultPreview({ jobId }: { jobId: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "100px" });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const image = useReviewImage(jobId, "thumbnail", visible);
  return <div ref={root}><GenerationImageTile jobId={jobId} {...image} /></div>;
}

export function OriginalImageCanvas({ url }: { url: string }) {
  const [nativeSize, setNativeSize] = React.useState(false);
  const [dimensions, setDimensions] = React.useState("");
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-ink-3">{dimensions}</span><Button variant="secondary" aria-pressed={nativeSize} onClick={() => setNativeSize(value => !value)}>{nativeSize ? "Përshtate në ekran" : "Madhësia reale · 100%"}</Button></div>
    <div className="max-h-[75dvh] overflow-auto rounded-maro16 bg-surface-2 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Fotografia origjinale e gjenerimit" className={nativeSize ? "block max-w-none" : "mx-auto block h-auto max-w-full"} onLoad={event => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight} px`)} />
    </div>
  </div>;
}

export function GenerationOriginalReview({ jobId }: { jobId: string }) {
  const image = useReviewImage(jobId, "original", true);
  return <div className="space-y-6 p-5 sm:p-6">
    <AdminPageHeader title="Origjinali i gjenerimit" description="Kontroll i cilësisë · qasje e kufizuar dhe e regjistruar." actions={<Link href="/admin/engine/generations" className="maro-button" data-variant="secondary">Kthehu te gjenerimet</Link>} />
    {image.url ? <OriginalImageCanvas url={image.url} /> : image.error ? <div role="alert" className="space-y-4 rounded-maro16 bg-surface p-5"><p>{image.error}</p><Button variant="secondary" onClick={image.retry}>Provo përsëri</Button></div> : <p role="status" className="text-sm text-ink-3">Duke ngarkuar fotografinë origjinale…</p>}
  </div>;
}
