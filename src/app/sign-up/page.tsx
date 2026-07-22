"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function SignUpPage() {
  const router = useRouter();
  return (
    <AuthLayout title="Krijo llogarinë tënde" subtitle="Fillo falas. maro website-in tënd të parë sot.">
      <AuthPanel initialMode="sign-up" onDone={() => router.push("/")} />
      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        Ke tashmë llogari?{" "}
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Hyr
        </Link>
      </p>
    </AuthLayout>
  );
}
