"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function SignInPage() {
  const router = useRouter();
  return (
    <AuthLayout title="Mirë se erdhe përsëri" subtitle="Hyr në llogarinë tënde për të vazhduar.">
      <AuthPanel initialMode="sign-in" onDone={() => router.push("/")} />
      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        Nuk ke llogari?{" "}
        <Link href="/sign-up" className="font-semibold text-brand hover:underline">
          Krijo llogari
        </Link>
      </p>
    </AuthLayout>
  );
}
