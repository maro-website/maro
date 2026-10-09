"use client";

import * as React from "react";
import Link from "next/link";
import { sanitizeInternalRedirectPath } from "@/lib/auth/safeRedirect";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { isSignupEnabled } from "@/lib/config/features";

export default function SignUpPage() { return <React.Suspense fallback={null}><SignUpContent /></React.Suspense>; }
function SignUpContent() {
  const router = useRouter();
  const next = sanitizeInternalRedirectPath(useSearchParams().get("next"), "/");
  const enabled = isSignupEnabled();

  return (
    <AuthLayout
      title={enabled ? "Krijo llogarinë tënde" : "Regjistrimet janë përkohësisht të mbyllura"}
      subtitle={
        enabled
          ? "Fillo me maro.al sot."
          : "Regjistrimet e reja janë përkohësisht të mbyllura."
      }
      showSocials={enabled}
    >
      {!enabled ? (
        <div className="space-y-6 text-center">
          <p className="text-[20px] font-semibold leading-snug text-ink">
            Regjistrimet e reja janë përkohësisht të mbyllura.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-maro12 bg-brand px-5 py-3 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover"
          >
            Kyçu në llogarinë ekzistuese
          </Link>
        </div>
      ) : (
        <>
          <AuthPanel
            initialMode="sign-up"
            dedicatedPage
            nextPath={next}
            onDone={() => router.push(next)}
            signupDisabledMessage="Regjistrimet e reja janë përkohësisht të mbyllura."
          />
          <p className="mt-5 text-center text-[13px] text-ink-2">
            E ki llogarinë?{" "}
            <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
              Hyn këtu
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
