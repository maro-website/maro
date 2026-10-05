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

  const authErrorMessage = React.useMemo(() => {
    switch (authError) {
      case "expired_link":
        return "Linku ka skaduar ose është përdorur. Nëse e ke konfirmuar email-in, hyr. Përndryshe kërko një link të ri.";
      case "invalid_link":
      case "missing_token":
      case "malformed_callback":
        return "Linku nuk është i vlefshëm ose është përdorur. Nëse e ke konfirmuar email-in, hyr. Përndryshe kërko një link të ri.";
      case "code_exchange_failed":
        return "Sesioni nuk u krijua dot. Provo përsëri me linkun e fundit.";
      case "invalid_type":
        return "Lloji i autentikimit nuk mbështetet.";
      case "not_configured":
        return "Autentikimi nuk është i konfiguruar. Provo përsëri më vonë.";
      default:
        return authError
          ? "Lidhja e autentikimit nuk funksionoi. Provo përsëri ose kërko një link të ri."
          : null;
    }
  }, [authError]);

  const destination = React.useMemo(
    () => sanitizeInternalRedirectPath(next, "/"),
    [next]
  );

  return (
    <AuthLayout title="Mirë se erdhe përsëri" subtitle="Hyr në llogarinë tënde për të vazhduar." showSocials>
      {searchParams.get("confirmed") === "1" && <p className="mb-4 text-sm text-success">Email-i u konfirmua. Hyr në llogarinë tënde.</p>}
      {searchParams.get("password_updated") === "1" && <p className="mb-4 text-sm text-success">Fjalëkalimi u përditësua. Hyr me fjalëkalimin e ri.</p>}
      {authErrorMessage ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
          {authErrorMessage}
        </div>
      ) : null}
      <AuthPanel initialMode="sign-in" dedicatedPage onDone={() => router.push(destination)} />
      <div className="mt-9 rounded-maro16 bg-surface px-5 py-5 text-center">
        <p className="mb-3 text-sm text-ink-2">S’ki llogari hala?</p>
        <Link href="/sign-up" className="maro-button w-full" data-variant="brand">
          maro njo t’re
        </Link>
      </div>
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
