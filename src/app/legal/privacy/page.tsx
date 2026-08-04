import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Politika e Privatësisë · maro" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politika e Privatësisë" current="Politika e Privatësisë">
      <LegalSection title="1. Kush jemi ne">
        <p>
          <strong className="text-ink">{LEGAL_ENTITY.name}</strong> (NUI {LEGAL_ENTITY.nui}), me seli në{" "}
          {LEGAL_ADDRESS}, është operatori i platformës <strong className="text-ink">{LEGAL_ENTITY.product}</strong>{" "}
          (&quot;maro&quot;). Ne veprojmë si kontrollues i të dhënave personale në kuptim të Ligjit nr.
          9887/2008 &quot;Për mbrojtjen e të dhënave personale&quot; dhe akteve nënligjore të zbatueshme.
        </p>
        <p>
          Për pyetje rreth privatësisë:{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Çfarë të dhënash mbledhim">
        <p>Mbledhim dhe përpunojmë kategoritë e mëposhtme të të dhënave, në varësi të mënyrës si e përdorni maro:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Të dhëna llogarie:</strong> emri, adresa email, fjalëkalimi (i
            ruajtur i hash-uar), foto profili (opsionale).
          </li>
          <li>
            <strong className="text-ink">Të dhëna përdorimi:</strong> projektet, promptet, materialet e
            ngarkuara, historiku i gjenerimeve, kreditet e shpenzuara, preferencat e temës dhe cilësimeve.
          </li>
          <li>
            <strong className="text-ink">Të dhëna teknike:</strong> adresa IP, lloji i shfletuesit,
            identifikues sesioni, cookies dhe log-e sigurie (shih{" "}
            <Link href="/legal/cookies" className="font-semibold text-ink underline-offset-2 hover:underline">
              Politikën e Cookies
            </Link>
            ).
          </li>
          <li>
            <strong className="text-ink">Të dhëna pagese:</strong> shuma, data dhe statusi i transaksioneve.
            Detajet e plota të kartës bankare përpunohen nga ofruesi i pagesave (p.sh. Paysera), jo nga ne
            drejtpërdrejt.
          </li>
          <li>
            <strong className="text-ink">Komunikime:</strong> mesazhe me mbështetjen, raportime abuzimi,
            aplikime kreatorësh.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Si i përdorim të dhënat">
        <p>Të dhënat përpunohen për qëllimet e mëposhtme:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>krijimi dhe menaxhimi i llogarisë suaj;</li>
          <li>oferimi i funksioneve AI (gjenerim, redaktim, ruajtje projektesh);</li>
          <li>faturimi, menaxhimi i krediteve dhe zbatimi i politikës së rimbursimit;</li>
          <li>siguria, parandalimi i mashtrimit dhe respektimi i ligjit;</li>
          <li>përmirësimi i Shërbimit, analitikë e agreguar dhe diagnostikë teknike;</li>
          <li>komunikim me ju (njoftime shërbimi, përgjigje mbështetjeje).</li>
        </ul>
        <p>
          Bazat ligjore përfshijnë ekzekutimin e kontratës (Kushtet e Përdorimit), interesin legjitim tonë
          (siguri, përmirësim produkti) dhe, ku kërkohet, pëlqimin tuaj.
        </p>
      </LegalSection>

      <LegalSection title="4. Ofruesit e shërbimeve dhe transferimet">
        <p>
          Përdorim ofrues të besuar infrastrukture dhe AI, duke përfshirë por pa u kufizuar në: Supabase
          (autentifikim dhe bazë të dhënash), Anthropic (modele AI), Cloudflare (CDN/DNS), Railway
          (hosting), dhe procesorë pagesash. Këta marrës përpunojnë të dhëna vetëm sipas udhëzimeve tona
          dhe marrëveshjeve të përshtatshme mbrojtjeje.
        </p>
        <p>
          Disa ofrues mund të ndodhen jashtë Shqipërisë/EEA. Kur transferohen të dhëna ndërkombëtarisht,
          aplikojmë mbrojtje të përshtatshme (p.sh. klauzola standarde kontraktuale ose vendime
          adekuate).
        </p>
      </LegalSection>

      <LegalSection title="5. Ruajtja">
        <p>
          Të dhënat e llogarisë ruhen derisa të mbyllni llogarinë ose të kërkoni fshirje, plus periudha
          e nevojshme për detyrime ligjore, zgjidhje mosmarrëveshjesh ose backup-e. Log-et teknike mund
          të ruhen për periudha më të shkurtra sipas nevojës së sigurisë.
        </p>
      </LegalSection>

      <LegalSection title="6. Të drejtat tuaja">
        <p>Në varësi të ligjit zbatues, mund të keni të drejtë të:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>aksesoni dhe merrni kopje të të dhënave tuaja;</li>
          <li>korrigjoni të dhëna të pasakta;</li>
          <li>kërkoni fshirje (&quot;e drejta për t&apos;u harruar&quot;), në rastet e lejuara;</li>
          <li>kufizoni ose kundërshtoni përpunimin;</li>
          <li>portoni të dhënat tuaja;</li>
          <li> tërhiqni pëlqimin kur përpunimi bazohet në pëlqim;</li>
          <li>paraqisni ankesë te Autoriteti Kombëtar i Mbrojtjes së të Dhënave Personale (AKDPM).</li>
        </ul>
        <p>
          Për të ushtruar të drejtat, shkruani te{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.contactEmail}
          </a>
          . Për fshirje llogarie, mund të na kontaktoni ose përdorni opsionet në llogarinë tuaj.
        </p>
      </LegalSection>

      <LegalSection title="7. Fëmijët">
        <p>
          maro nuk është i destinuar për persona nën 18 vjeç. Nëse besojmë se kemi mbledhur të dhëna nga
          një fëmijë pa pëlqimin e prindit/kujdestarit, do t&apos;i fshijmë ato.
        </p>
      </LegalSection>

      <LegalSection title="8. Siguria">
        <p>
          Zbatojmë masa teknike dhe organizative të arsyeshme (enkriptim në transit, kontroll aksesi,
          backup, monitorim) për të mbrojtur të dhënat. Asnjë sistem nuk është 100% i sigurt; ju lutemi
          përdorni fjalëkalime të forta dhe mos ndani kredencialet.
        </p>
      </LegalSection>

      <LegalSection title="9. Ndryshime">
        <p>
          Kjo politikë mund të përditësohet. Do të publikojmë versionin e ri me datën e përditësimit. Nëse
          ndryshimet janë materiale, do të përpiqemi t&apos;ju njoftojmë me email ose njoftim në Platformë.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
