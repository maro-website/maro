"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Misc";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function AdminMfaPage() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason") ?? "mfa_challenge_required";
  const next = params.get("next") ?? "/admin";

  const [loading, setLoading] = React.useState(true);
  const [enrolled, setEnrolled] = React.useState(false);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      const sb = getSupabaseBrowser();
      const { data: factors } = await sb.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified") ?? factors?.totp?.[0];
      if (totp) {
        setEnrolled(totp.status === "verified");
        setFactorId(totp.id);
      }
      setLoading(false);
    })();
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      const { data, error: enrollErr } = await sb.auth.mfa.enroll({ factorType: "totp" });
      if (enrollErr) throw enrollErr;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!factorId || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      const { data: challenge, error: chErr } = await sb.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: verErr } = await sb.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verErr) throw verErr;
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function challengeExisting() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      const { data: challenge, error: chErr } = await sb.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      setChallengeId(challenge.id);
      const { error: verErr } = await sb.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verErr) throw verErr;
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Challenge failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    );
  }

  const needsEnroll = reason === "mfa_enrollment_required" || (!enrolled && !qr);

  return (
    <div className="mx-auto max-w-lg">
      <AdminPageHeader
        title="Multi-factor authentication"
        description={
          needsEnroll
            ? "Privileged Control Center roles must enroll TOTP before continuing."
            : "Enter your authenticator code to continue."
        }
      />

      {needsEnroll && !qr ? (
        <Button onClick={() => void startEnroll()} disabled={busy}>
          Enroll authenticator app
        </Button>
      ) : null}

      {qr ? (
        <div className="mb-4 rounded-xl border border-line bg-surface p-4">
          <p className="text-[13px] text-ink-2">Scan this QR code with your authenticator app.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="TOTP QR" className="mx-auto my-4 h-48 w-48" />
          {secret ? <p className="font-mono text-[11px] text-ink-3">Secret: {secret}</p> : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-line bg-surface p-4">
        <label className="text-[11px] font-semibold text-ink-3">Authenticator code</label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="mt-1" />
        <Button
          className="mt-3"
          onClick={() => void (enrolled && !qr ? challengeExisting() : verifyCode())}
          disabled={busy || !code.trim()}
        >
          Verify and continue
        </Button>
        {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
        {challengeId ? null : null}
      </div>
    </div>
  );
}
