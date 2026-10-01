"use client";

import * as React from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TurnstileWidget, turnstileConfigured } from "@/components/auth/TurnstileWidget";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Plotëso email-in.");
      return;
    }
    if (turnstileConfigured() && !turnstileToken) {
      setError("Plotëso verifikimin CAPTCHA.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok && data.error === "rate_limited") {
        setError("Shumë kërkesa. Provo përsëri më vonë.");
        return;
      }
      if (!res.ok && data.error) {
        setError("Kërkesa dështoi. Provo përsëri.");
        return;
      }
      setNotice(
        data.message ??
          "Nëse ekziston një llogari me këtë email, do të marrësh udhëzime për rivendosjen e fjalëkalimit."
      );
      setTurnstileToken(null);
    } catch {
      setError("Kërkesa dështoi. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Harrove fjalëkalimin?"
      subtitle="Shkruaj email-in e llogarisë. Do të marrësh udhëzime nëse llogaria ekziston."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="ti@shembull.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        {turnstileConfigured() && (
          <TurnstileWidget
            onToken={(t) => setTurnstileToken(t)}
            onExpire={() => setTurnstileToken(null)}
          />
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 text-[13px] text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={turnstileConfigured() && !turnstileToken}
        >
          Dërgo udhëzimet
        </Button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Kthehu te hyrja
        </Link>
      </p>
    </AuthLayout>
  );
}
