import Link from "next/link";
import { MODULE_AVAILABILITY, type ProductModuleId } from "@/lib/modules/availability";

/** Shared release message using the existing light product tokens. */
export function ModuleComingSoon({ moduleId }: { moduleId: ProductModuleId }) {
  const productModule = MODULE_AVAILABILITY[moduleId];
  return (
    <section className="grid min-h-[60vh] w-full place-items-center px-6 py-12">
      <div className="w-full max-w-md rounded-maro16 bg-surface px-8 py-16 text-center">
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-semibold text-ink-2">
          Së shpejti · {productModule.version}
        </span>
        <h1 className="mt-5 text-[28px] font-bold tracking-brand text-ink">{productModule.name}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          {productModule.name} po përgatitet për {productModule.version}. Ky modul nuk është i disponueshëm në V1.
        </p>
        <Link href="/imazh" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-bold text-canvas">
          Krijo me maroImazh
        </Link>
      </div>
    </section>
  );
}
