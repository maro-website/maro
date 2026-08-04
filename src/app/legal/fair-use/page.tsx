import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ENTITY } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Përdorimi i drejtë · maro" };

export default function FairUsePage() {
  return (
    <LegalLayout title="Përdorimi i drejtë" current="Përdorimi i drejtë">
      <LegalSection title="Qëllimi">
        <p>
          maro ofrohet për krijues, biznese dhe përdorues individualë që duan të gjenerojnë materiale
          dixhitale me ndihmën e AI. Ky dokument përshkruan shkurt rregullat e përdorimit të drejtë.
          Për detaje ligjore të plota, shiko{" "}
          <Link href="/legal/terms" className="font-semibold text-ink underline-offset-2 hover:underline">
            Kushtet e Përdorimit
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Çfarë lejohet">
        <ul className="list-disc space-y-2 pl-5">
          <li>Një llogari për person ose biznes; përdorim personal ose profesional normal.</li>
          <li>Gjenerime manuale përmes mjeteve të platformës (website, logo, imazhe, audio, chat).</li>
          <li>Rigjenerim i rezultateve kur nuk je i kënaqur, duke respektuar kostot e krediteve.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Çfarë nuk lejohet">
        <ul className="list-disc space-y-2 pl-5">
          <li>Llogari të shumta për të anashkaluar kufizimet, promocionet ose kostot.</li>
          <li>Automatizim masiv, scraping, ose thirrje të pakontrolluara ndaj API-ve të maro.</li>
          <li>Përpjekje për të nxjerrë promptet e brendshme të sistemit ose për të anashkaluar sigurinë.</li>
          <li>Përdorim që shkel ligjin, të drejtat e autorit, ose politikat e platformës.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Kufizime teknike">
        <p>
          maro mund të vendosë kufizime të përkohshme për të mbrojtur shërbimin dhe kostot: verifikim
          email-i, kufizime shpejtësie, një gjenerim aktiv në llogari falas (deri në tre për maroFort),
          dhe pauza të shkurtra në rast ngarkese të lartë. Këto masa janë të nevojshme për të mbajtur
          platformën të qëndrueshme për të gjithë.
        </p>
      </LegalSection>

      <LegalSection title="Kredite dhe rimbursime">
        <p>
          Kreditet blihen ose fitohen sipas rregullave të publikuara. Rimbursimet ndiqen{" "}
          <Link href="/legal/refund" className="font-semibold text-ink underline-offset-2 hover:underline">
            Politikën e Rimbursimit
          </Link>
          . Në rast gabimi teknik të verifikuar, kreditet e mbajtura pa rezultat mund të kthehen.
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Për pyetje ose raportim abuzimi:{" "}
          <a href={`mailto:${LEGAL_ENTITY.supportEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.supportEmail}
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
