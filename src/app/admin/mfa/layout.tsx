import { Suspense } from "react";

export default function AdminMfaLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8 text-ink-3">Duke ngarkuar MFA…</div>}>{children}</Suspense>;
}
