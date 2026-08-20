"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useMaro } from "@/context/store";
import {
  LegalConsentCheckbox,
  LEGAL_CONSENT_REQUIRED,
} from "@/components/legal/LegalConsentCheckbox";
import { TurnstileWidget, turnstileConfigured } from "@/components/auth/TurnstileWidget";
import { isSignupEnabled, MIN_PASSWORD_LENGTH } from "@/lib/config/features";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AuthPanel({
  initialMode = "sign-in",
  onDone,
  signupDisabledMessage,
}: {
  initialMode?: "sign-in" | "sign-up";
  onDone?: () => void;
  signupDisabledMessage?: string;
}) {
  const signupEnabled = isSignupEnabled();
  const { signIn, signUp, supabaseReady } = useMaro();
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">(
    signupEnabled ? initialMode : "sign-in"
  );
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [legalAccepted, setLegalAccepted] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "sign-up" && !signupEnabled) {
      setError(signupDisabledMessage ?? "Regjistrimi është i mbyllur për momentin.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Plotëso email-in dhe fjalëkalimin.");
      return;
    }
    if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Fjalëkalimi duhet të ketë të paktën ${MIN_PASSWORD_LENGTH} karaktere.`);
      return;
    }
    if (mode === "sign-up" && !legalAccepted) {
      setError(LEGAL_CONSENT_REQUIRED);
      return;
    }
    if (mode === "sign-up" && turnstileConfigured() && !turnstileToken) {
      setError("Plotëso verifikimin CAPTCHA.");
      return;
    }
    setLoading(true);
    const res =
      mode === "sign-in"
        ? await signIn(email.trim(), password)
        : await signUp(name.trim(), email.trim(), password, turnstileToken ?? undefined);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (mode === "sign-up") {
      setNotice(
        "Llogaria u krijua. Kontrollo email-in për të konfirmuar llogarinë, pastaj hyr."
      );
      setTurnstileToken(null);
    }
    onDone?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {!supabaseReady && (
        <div className="flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-[13px] text-ink-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Supabase nuk është konfiguruar ende. Shto çelësat te .env.local për të aktivizuar autentikimin.
        </div>
      )}

      {signupEnabled ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(["sign-in", "sign-up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setNotice(null);
                if (m === "sign-in") setLegalAccepted(false);
              }}
              className={`h-9 rounded-lg text-[13.5px] font-semibold transition-all ${
                mode === m ? "bg-surface text-ink" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {m === "sign-in" ? "Hyr" : "Regjistrohu"}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "sign-up" && !signupEnabled && (
        <div className="rounded-maro12 bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-ink-2">
          {signupDisabledMessage ??
            "Platforma është në development mode. Regjistrimi hapet së shpejti — hyr nëse ke llogari."}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "sign-up" && signupEnabled && (
          <Field label="Emri">
            <Input placeholder="Emri yt" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="Email">
          <Input
            type="email"
            placeholder="ti@shembull.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={mode === "sign-up" && !signupEnabled}
          />
        </Field>
        <Field label="Fjalëkalimi">
          <Input
            type="password"
            placeholder={mode === "sign-up" ? "Të paktën 6 karaktere" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            disabled={mode === "sign-up" && !signupEnabled}
          />
        </Field>

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

        {mode === "sign-up" && signupEnabled && (
          <LegalConsentCheckbox
            id="auth-legal-consent"
            checked={legalAccepted}
            onChange={setLegalAccepted}
          />
        )}

        {mode === "sign-up" && signupEnabled && turnstileConfigured() && (
          <TurnstileWidget
            onToken={(t) => setTurnstileToken(t)}
            onExpire={() => setTurnstileToken(null)}
          />
        )}

        <Button
          type="submit"
          className="mt-1 w-full"
          loading={loading}
          disabled={
            !supabaseReady ||
            (mode === "sign-up" && !signupEnabled) ||
            (mode === "sign-up" && signupEnabled && !legalAccepted) ||
            (mode === "sign-up" && signupEnabled && turnstileConfigured() && !turnstileToken)
          }
        >
          {mode === "sign-in" ? "Hyr" : "Krijo llogari"}
        </Button>
      </form>

      {mode === "sign-in" && (
        <p className="text-center text-[13px] text-ink-3">
          <a href="/forgot-password" className="font-semibold text-brand hover:underline">
            Harrove fjalëkalimin?
          </a>
        </p>
      )}
    </div>
  );
}
