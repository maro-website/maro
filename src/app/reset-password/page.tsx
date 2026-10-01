"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { MIN_PASSWORD_LENGTH } from "@/lib/config/features";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sessionOk, setSessionOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabaseBrowser();
      if (!sb) {
        if (!cancelled) {
          setSessionOk(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await sb.auth.getSession();
      if (!cancelled) {
        setSessionOk(Boolean(data.session));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Fjalëkalimi duhet të ketë të paktën ${MIN_PASSWORD_LENGTH} karaktere.`);
      return;
    }
    if (password !== password2) {
      setError("Fjalëkalimet nuk përputhen.");
      return;
    }

    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Autentikimi nuk është i disponueshëm.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await sb.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  }

  if (loading) {
    return (
      <AuthLayout title="Rivendos fjalëkalimin" subtitle="Po verifikojmë sesionin…">
        <div className="text-[13px] text-ink-3">Ngarkohet…</div>
      </AuthLayout>
    );
  }

  if (!sessionOk) {
    return (
      <AuthLayout
        title="Link i pavlefshëm ose i skaduar"
        subtitle="Kërko një link të ri për rivendosjen e fjalëkalimit."
      >
        <div className="flex flex-col gap-3">
          <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
            Kërko link të ri
          </Link>
          <Link href="/sign-in" className="text-[13.5px] text-ink-2 hover:text-ink">
            Kthehu te hyrja
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Zgjidh fjalëkalim të ri" subtitle="Shkruaj dhe konfirmo fjalëkalimin e ri.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Fjalëkalimi i ri">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Të paktën ${MIN_PASSWORD_LENGTH} karaktere`}
          />
        </Field>
        <Field label="Konfirmo fjalëkalimin">
          <Input
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Përsërit fjalëkalimin"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {done && (
          <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5 text-[13px] text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Fjalëkalimi u përditësua. Po të ridrejtojmë…
          </div>
        )}

        <Button type="submit" className="w-full" loading={saving} disabled={done}>
          Ruaj fjalëkalimin
        </Button>
      </form>
    </AuthLayout>
  );
}
