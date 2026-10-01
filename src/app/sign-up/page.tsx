"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { isSignupEnabled } from "@/lib/config/features";

export default function SignUpPage() {
  const router = useRouter();
  const enabled = isSignupEnabled();

  return (
    <AuthLayout
      title={enabled ? "Krijo llogarinë tënde" : "Regjistrimi së shpejti"}
      subtitle={
        enabled
          ? "Fillo me maro.al sot."
          : "Platforma është në development mode. Regjistrimi hapet së shpejti."
      }
    >
      <AuthPanel
        initialMode="sign-up"
        onDone={() => router.push("/")}
        signupDisabledMessage="Platforma është në development mode. Regjistrimi hapet së shpejti — hyr nëse ke llogari."
      />
      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        Ke tashmë llogari?{" "}
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Hyr
        </Link>
      </p>
    </AuthLayout>
  );
}
