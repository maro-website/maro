import { Suspense } from "react";
import AdminMfaPage from "./page";

export default function AdminMfaLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8 text-ink-3">Loading…</div>}>{children}</Suspense>;
}
