"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { sanitizeInternalRedirectPath } from "@/lib/auth/safeRedirect";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const authError = searchParams.get("auth_error");

  const destination = React.useMemo(
    () => sanitizeInternalRedirectPath(next, "/"),
    [next]
  );

  return (
    <AuthLayout title="Mirë se erdhe përsëri" subtitle="Hyr në llogarinë tënde për të vazhduar.">
      {authError ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
          Lidhja e autentikimit nuk funksionoi. Provo përsëri ose kërko një link të ri.
        </div>
      ) : null}
      <AuthPanel initialMode="sign-in" onDone={() => router.push(destination)} />
      <p className="mt-6 text-center text-[13.5px] text-ink-2">
        Nuk ke llogari?{" "}
        <Link href="/sign-up" className="font-semibold text-brand hover:underline">
          Krijo llogari
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense fallback={null}>
      <SignInContent />
    </React.Suspense>
  );
}
