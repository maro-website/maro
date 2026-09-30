"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";

const SCOPE_LABELS: Record<string, string> = {
  openid: "identifikojë llogarinë tënde Maro",
  email: "konfirmojë identitetin e llogarisë",
  profile: "lexojë profilin bazë të llogarisë",
  phone: "lexojë numrin e telefonit të profilit",
  offline_access: "mbajë lidhjen aktive me refresh token",
};

function safeClientUri(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ConsentContent() {
  const params = useSearchParams();
  const authorizationId = params.get("authorization_id")?.trim() ?? "";
  const [details, setDetails] = React.useState<OAuthAuthorizationDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState<"approve" | "deny" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabaseConfigured || !authorizationId) {
        if (active) {
          setError("Kërkesa OAuth mungon ose autentikimi nuk është konfiguruar.");
          setLoading(false);
        }
        return;
      }

      const supabase = getSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
        window.location.replace(`/sign-in?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data, error: authError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (authError || !data) {
        setError("Kërkesa për lidhje ka skaduar ose nuk është e vlefshme.");
        setLoading(false);
        return;
      }
      if ("redirect_url" in data) {
        window.location.replace(data.redirect_url);
        return;
      }
      setDetails(data);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (action: "approve" | "deny") => {
    if (!details || submitting) return;
    setSubmitting(action);
    setError(null);
    const oauth = getSupabaseBrowser().auth.oauth;
    const result =
      action === "approve"
        ? await oauth.approveAuthorization(details.authorization_id, { skipBrowserRedirect: true })
        : await oauth.denyAuthorization(details.authorization_id, { skipBrowserRedirect: true });
    if (result.error || !result.data?.redirect_url) {
      setError("Vendimi nuk u ruajt. Provo përsëri.");
      setSubmitting(null);
      return;
    }
    window.location.assign(result.data.redirect_url);
  };

  const scopes = details?.scope.split(/\s+/).filter(Boolean) ?? [];
  const clientUri = details ? safeClientUri(details.client.uri) : null;

  return (
    <AuthLayout title="Connect Maro" subtitle="Autorizo një lidhje të sigurt me llogarinë ekzistuese Maro.">
      {loading ? <p className="text-[14px] text-ink-2">Duke verifikuar kërkesën…</p> : null}
      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-danger/5 px-3.5 py-3 text-[13px] text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      {details ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-maro12 bg-surface-2 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="text-[14px] font-semibold text-ink">
                {details.client.name || "Një aplikacion"} dëshiron të lidhet me Maro.
              </p>
              {clientUri ? (
                <a className="mt-1 block break-all text-[12px] text-brand hover:underline" href={clientUri} target="_blank" rel="noreferrer">
                  {clientUri}
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">Lejet e kërkuara</p>
            <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink-2">
              {scopes.length ? (
                scopes.map((scope) => <li key={scope}>• {SCOPE_LABELS[scope] ?? `përdorë lejen “${scope}”`}</li>)
              ) : (
                <li>• përdorë lidhjen OAuth për veprimet që ti kërkon</li>
              )}
              <li>• përdorë workspace-in aktiv dhe të krijojë maroImazh vetëm kur e kërkon ti</li>
            </ul>
          </div>

          <p className="rounded-maro12 border border-line px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
            Promptet private, compiler output dhe inteligjenca e brendshme e markës nuk i dërgohen aplikacionit.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" loading={submitting === "deny"} disabled={Boolean(submitting)} onClick={() => void decide("deny")}>
              Cancel
            </Button>
            <Button loading={submitting === "approve"} disabled={Boolean(submitting)} onClick={() => void decide("approve")}>
              Connect
            </Button>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}

export default function OAuthConsentPage() {
  return (
    <React.Suspense fallback={null}>
      <ConsentContent />
    </React.Suspense>
  );
}
