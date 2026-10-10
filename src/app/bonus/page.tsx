import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { BonusClaim } from "@/components/freebies/BonusClaim";
import { Spinner } from "@/components/ui/Misc";

export default function BonusPage() {
  return <AppShell showFooter><Suspense fallback={<div className="grid min-h-64 place-items-center"><Spinner /></div>}><BonusClaim /></Suspense></AppShell>;
}
