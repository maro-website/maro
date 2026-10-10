"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, CircleAlert, Check } from "lucide-react";
import { useMaro } from "@/context/store";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import LatticeLoader from "@/components/app/LatticeLoader";
import { rateLimitedFetch } from "@/lib/client/rateLimit";
import { freebieErrorMessage, type FreebieClaimResult } from "@/lib/freebies/types";

type Feedback = { status: "working" | "success" | "error"; result?: FreebieClaimResult };
const planNames: Record<string, string> = { standard: "maroStandard", pro: "maroPro", business: "maroBiz" };

export function BonusClaim() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, user, credits, getAccessToken, refreshProfile } = useMaro();
  const [code, setCode] = React.useState(() => (params.get("code") ?? "").slice(0, 64).toUpperCase());
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const busy = React.useRef(false);
  const controller = React.useRef<AbortController | null>(null);
  const active = React.useRef(true);
  React.useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);

  async function claim(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !code.trim()) return;
    busy.current = true;
    setFeedback({ status: "working" });
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20000);
    try {
      const token = await getAccessToken();
      if (!active.current) return;
      if (!token) { setFeedback({ status: "error", result: { ok: false, error: "unauthorized" } }); return; }
      const response = await rateLimitedFetch("/api/bonus/claim", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim().toUpperCase() }), signal: abort.signal,
      });
      const result = await response.json() as FreebieClaimResult;
      if (!active.current) return;
      if (response.ok && result.ok) {
        setFeedback({ status: "success", result });
        setCode("");
        router.replace("/bonus", { scroll: false });
        void refreshProfile();
      } else {
        setFeedback({ status: "error", result });
        if (result.error === "already_claimed") void refreshProfile();
      }
    } catch { if (active.current) setFeedback({ status: "error", result: { ok: false, error: "bonus_unavailable" } }); }
    finally { clearTimeout(timeout); busy.current = false; }
  }

  const close = () => { if (!busy.current) setFeedback(null); };
  if (!ready) return <div className="grid min-h-64 place-items-center"><Spinner /></div>;
  const next = `/bonus${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  return <div className="maro-page-shell mx-auto max-w-xl">
    <div className="mb-6 flex items-center gap-3"><Gift className="h-7 w-7 text-brand" /><h1 className="maro-page-title">Merr kredite Falas</h1></div>
    <div className="maro-panel space-y-6">
      <div><h2 className="text-xl font-bold text-ink">Ke një kod nga maro?</h2><p className="mt-2 text-sm leading-relaxed text-ink-3">Shkruaje këtu për të marrë kreditet. Çdo kod përdoret vetëm një herë nga llogaria jote dhe ka kushtet e veta.</p></div>
      {user ? <form onSubmit={event => void claim(event)} className="space-y-4">
        <Field label="Kodi"><Input required aria-label="Kodi" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={64}
          placeholder="P.sh. TRAMPOLINE" value={code} onChange={event => setCode(event.target.value.toUpperCase())} disabled={feedback?.status === "working"} /></Field>
        <Button type="submit" variant="brand" icon={<Gift className="h-4 w-4" />} disabled={!code.trim() || feedback?.status === "working"} className="w-full">Merr kredite</Button>
        <p className="text-center text-sm text-ink-3">Bilanci yt: <span className="font-bold text-ink">{credits.toLocaleString("sq-AL")} kredite</span></p>
      </form> : <div className="space-y-4"><p className="text-sm text-ink-3">Hyr ose regjistrohu për ta përdorur kodin. Kodi do të të presë pas hyrjes.</p><div className="grid grid-cols-2 gap-3">
        <Link className="maro-button" data-variant="brand" href={`/sign-in?next=${encodeURIComponent(next)}`}>Hyr</Link>
        <Link className="maro-button" data-variant="secondary" href={`/sign-up?next=${encodeURIComponent(next)}`}>Regjistrohu</Link>
      </div></div>}
    </div>
    <Modal open={Boolean(feedback)} onClose={close} size="sm" closeOnBackdrop={feedback?.status !== "working"} hideClose={feedback?.status === "working"} aria-label="Marrja e krediteve">
      {feedback?.status === "working" ? <div className="flex min-h-64 items-center justify-center p-6" aria-busy="true">
        <LatticeLoader className="lattice-loader--stacked" label="Po kontrollojmë kodin" grid={4} shape="maro" cellSize={7} gap={5} fontSize={18} showTimer={false} />
      </div> : feedback?.status === "success" ? <>
        <ModalHeader title={`Ti sapo i more ${feedback.result?.credits ?? 0} kredite!`} description="Kreditet janë shtuar në llogarinë tënde." icon={<Check className="h-6 w-6 text-brand" />} />
        <div className="space-y-3 px-6 pb-4"><p className="rounded-maro16 bg-surface-2 p-4 text-center text-lg font-bold text-ink">Bilanci yt: {feedback.result?.balance?.toLocaleString("sq-AL")} kredite</p>
          {feedback.result?.plan_id && <p className="text-sm text-ink-2">{planNames[feedback.result.plan_id] ?? feedback.result.plan_id} u aktivizua{feedback.result.expires_at ? ` deri më ${new Date(feedback.result.expires_at).toLocaleDateString("sq-AL")}` : ""}.</p>}
        </div><ModalFooter><Button variant="secondary" onClick={close}>Mbylle</Button><Button variant="brand" onClick={() => router.push("/imazh")}>Shko maro</Button></ModalFooter>
      </> : <>
        <ModalHeader title="Kodi nuk u përdor" description={freebieErrorMessage(feedback?.result?.error ?? "bonus_unavailable", feedback?.result)} icon={<CircleAlert className="h-6 w-6 text-danger" />} />
        <ModalFooter><Button variant="secondary" onClick={close}>Mbylle</Button><Button variant="brand" onClick={close}>Provo përsëri</Button></ModalFooter>
      </>}
    </Modal>
  </div>;
}
