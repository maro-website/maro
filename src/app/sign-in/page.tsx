"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useMaro } from "@/context/store";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useMaro();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    signIn(email || "ti@maro.al");
    setTimeout(() => router.push("/dashboard"), 500);
  };

  return (
    <AuthLayout title="Mirë se erdhe përsëri" subtitle="Hyr në llogarinë tënde për të vazhduar.">
      <GoogleButton label="Vazhdo me Google" onClick={submit} />
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-3">
        <div className="h-px flex-1 bg-line" /> ose <div className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input type="email" placeholder="ti@shembull.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Fjalëkalimi">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="mt-1 w-full" loading={loading}>
          Sign In
        </Button>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        Nuk ke llogari?{" "}
        <Link href="/sign-up" className="font-semibold text-brand hover:underline">
          Krijo llogari
        </Link>
      </p>
    </AuthLayout>
  );
}
