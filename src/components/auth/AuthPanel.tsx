"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useMaro } from "@/context/store";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AuthPanel({
  initialMode = "sign-in",
  onDone,
}: {
  initialMode?: "sign-in" | "sign-up";
  onDone?: () => void;
}) {
  const { signIn, signUp, supabaseReady } = useMaro();
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">(initialMode);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password.trim()) {
      setError("Plotëso email-in dhe fjalëkalimin.");
      return;
    }
    if (mode === "sign-up" && password.length < 6) {
      setError("Fjalëkalimi duhet të ketë të paktën 6 karaktere.");
      return;
    }
    setLoading(true);
    const res =
      mode === "sign-in"
        ? await signIn(email.trim(), password)
        : await signUp(name.trim(), email.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (mode === "sign-up") {
      setNotice(
        "Llogaria u krijua. Nëse kërkohet konfirmim email-i, kontrollo inbox-in, pastaj hyr."
      );
    }
    onDone?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {!supabaseReady && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Supabase nuk është konfiguruar ende. Shto çelësat te .env.local për të aktivizuar autentikimin.
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["sign-in", "sign-up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`h-9 rounded-lg text-[13.5px] font-semibold transition-all ${
              mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {m === "sign-in" ? "Hyr" : "Regjistrohu"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "sign-up" && (
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
          />
        </Field>
        <Field label="Fjalëkalimi">
          <Input
            type="password"
            placeholder={mode === "sign-up" ? "Të paktën 6 karaktere" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
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

        <Button type="submit" className="mt-1 w-full" loading={loading} disabled={!supabaseReady}>
          {mode === "sign-in" ? "Hyr" : "Krijo llogari"}
        </Button>
      </form>
    </div>
  );
}
