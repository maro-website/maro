import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Politika e Cookies · maro" };

export default function CookiesPage() {
  return (
    <LegalLayout title="Politika e Cookies" current="Politika e Cookies">
      <LegalSection title="1. Çfarë janë cookies">
        <p>
          Cookies janë skedarë të vegjël teksti që ruhen në pajisjen tuaj kur vizitoni{" "}
          <strong className="text-ink">{LEGAL_ENTITY.product}</strong>. I përdorim për funksionimin e
          platformës, sigurinë dhe analitikë (me pëlqimin tuaj ku kërkohet).
        </p>
      </LegalSection>

      <LegalSection title="2. Llojet e cookies që përdorim">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong className="text-ink">Të domosdoshme:</strong> autentifikim sesioni, preferenca teme
            (Qelt/Mshelt), siguri CSRF. Pa to, maro nuk funksionon siç duhet.
          </li>
          <li>
            <strong className="text-ink">Funksionale:</strong> ruajnë zgjedhjet tuaja (p.sh. promocode,
            cilësime UI) për përvojë më të mirë.
          </li>
          <li>
            <strong className="text-ink">Analitike (opsionale):</strong> na ndihmojnë të kuptojmë si
            përdoret Shërbimi (faqe të vizituara, performancë). Aktivizohen vetëm me pëlqim, kur ofrohen.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Ruajtje lokale (localStorage)">
        <p>
          Përveç cookies, përdorim edhe <strong className="text-ink">localStorage</strong> të shfletuesit
          për të ruajtur projekte demo, preferenca teme dhe cache të lehtë. Këto të dhëna mbeten në
          pajisjen tuaj derisa t&apos;i fshini manualisht ose të pastroni të dhënat e shfletuesit.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies të palëve të treta">
        <p>
          Ofrues si Supabase (auth), Cloudflare (siguri/performancë) ose procesorë pagesash mund të
          vendosin cookies të tyre kur përdorni funksione përkatëse. Politikat e tyre zbatohen për
          përpunimin e tyre.
        </p>
      </LegalSection>

      <LegalSection title="5. Si t&apos;i menaxhoni">
        <p>
          Mund të bllokoni ose fshini cookies nga cilësimet e shfletuesit. Bllokimi i cookies të
          domosdoshme mund të pengojë hyrjen ose funksione kryesore të maro.
        </p>
        <p>
          Për më shumë rreth të dhënave personale, shihni{" "}
          <Link href="/legal/privacy" className="font-semibold text-ink underline-offset-2 hover:underline">
            Politikën e Privatësisë
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Kontakt">
        <p>
          Pyetje:{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.contactEmail}
          </a>
          <br />
          {LEGAL_ADDRESS}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
