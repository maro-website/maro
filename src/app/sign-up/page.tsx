"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useMaro } from "@/context/store";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useMaro();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    signUp(name || "Ti", email || "ti@maro.al");
    setTimeout(() => router.push("/dashboard"), 600);
  };

  return (
    <AuthLayout title="Krijo llogarinë tënde" subtitle="Fillo falas. Maro website-in tënd të parë sot.">
      <GoogleButton label="Regjistrohu me Google" onClick={submit} />
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-3">
        <div className="h-px flex-1 bg-line" /> ose <div className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Emri">
          <Input placeholder="Emri yt" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" placeholder="ti@shembull.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Fjalëkalimi">
          <Input type="password" placeholder="Të paktën 8 karaktere" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="mt-1 w-full" loading={loading}>
          Create Account
        </Button>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        Ke tashmë llogari?{" "}
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
