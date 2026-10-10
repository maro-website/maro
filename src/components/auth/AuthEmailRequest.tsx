"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import Link from "next/link";
import { AuthLayout } from "./AuthLayout";
import { TurnstileWidget, turnstileConfigured } from "./TurnstileWidget";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { authErrorMessage } from "@/lib/auth/messages";

export function AuthEmailRequest({ recovery }: { recovery: boolean }) {
  const [email, setEmail] = React.useState("");
  const [token, setToken] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSent(false); setLoading(true);
    try {
      const response = await fetch(recovery ? "/api/auth/forgot-password" : "/api/auth/resend-confirmation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      const data = await response.json();
      if (!response.ok) setError(authErrorMessage(data.error));
      else setSent(true);
    } catch { setError(authErrorMessage()); }
    finally { setLoading(false); setToken(null); setAttempt(n => n + 1); }
  }
  return <AuthLayout title={recovery ? "Harrove fjalëkalimin?" : "Konfirmo email-in"}
    subtitle={recovery ? "Shkruaj email-in e llogarisë për të kërkuar një link të ri." : "Nëse email-i pret konfirmim, mund të kërkosh një mesazh të ri."}>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
      {turnstileConfigured() && <TurnstileWidget key={attempt} onToken={setToken} onExpire={() => setToken(null)} />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {sent && <p role="status" className="text-sm text-success">{recovery
        ? "Nëse ekziston një llogari me këtë email, do të marrësh udhëzime për rivendosjen e fjalëkalimit."
        : "Nëse email-i pret konfirmim, do të marrësh një link të ri. Nëse është konfirmuar tashmë, mund të hysh."}</p>}
      <Button type="submit" loading={loading} disabled={turnstileConfigured() && !token}>{recovery ? "Dërgo udhëzimet" : "Dërgo konfirmimin"}</Button>
    </form>
    <p className="mt-6 text-center text-sm"><Link href="/sign-in" className="font-semibold text-brand hover:underline">Kthehu te hyrja</Link></p>
  </AuthLayout>;
}
