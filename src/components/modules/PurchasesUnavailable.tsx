import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";

export function PurchasesUnavailable() {
  return <AppShell showFooter><section className="mx-auto max-w-lg px-6 py-20 text-center">
    <h1 className="text-2xl font-bold text-ink">Blerjet nuk janë të disponueshme</h1>
    <p className="mt-4 text-ink-2">Planet dhe historiku ekzistues ruhen. Blerjet e reja janë të mbyllura për këtë version.</p>
    <Link className="mt-6 inline-block font-semibold text-ink underline" href="/account">Llogaria ime</Link>
  </section></AppShell>;
}
