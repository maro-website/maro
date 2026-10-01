import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Politika e Rimbursimit · maro" };

export default function RefundPage() {
  return (
    <LegalLayout title="Politika e Rimbursimit" current="Politika e Rimbursimit">
      <LegalSection title="1. Përmbledhje">
        <p>
          Kjo Politikë e Rimbursimit shpjegon kur dhe si {LEGAL_ENTITY.name} (NRB {LEGAL_ENTITY.nrb}),
          operatori i <strong className="text-ink">{LEGAL_ENTITY.product}</strong>, rimburson pagesat ose
          kthen kredite. Ajo plotëson{" "}
          <Link href="/legal/terms" className="font-semibold text-ink underline-offset-2 hover:underline">
            Kushtet e Përdorimit
          </Link>
          .
        </p>
        <p>
          maro përdor kredite si njësi pagese. Planet maroStandard (€9 / 100 kredite) dhe maroPro (€35 /
          500 kredite) shfaqen në{" "}
          <Link href="/pricing" className="font-semibold text-ink underline-offset-2 hover:underline">
            Planet & Kreditet
          </Link>
          . Blerja minimale është €9.
        </p>
      </LegalSection>

      <LegalSection title="2. Blerja e krediteve">
        <p>
          Kur blini kredite, ato shtohen në balancën e llogarisë suaj pas konfirmimit të pagesës nga
          procesori ynë i pagesave. Kreditet e blera nuk skadojnë, përveç nëse llogaria mbyllet për shkelje
          të rënda të Kushteve ose kërkohet ndryshe me ligj.
        </p>
        <p>
          Promocione, kode zbritjeje ose kredite bonus mund të kenë kushte shtesë që shfaqen në momentin
          e aktivizimit.
        </p>
      </LegalSection>

      <LegalSection title="3. Rimbursim automatik i krediteve (dështim teknik)">
        <p>
          Kur një veprim AI dështon për arsye teknike nga ana jonë ose e partnerëve tanë (p.sh. timeout,
          gabim serveri, përgjigje e pavlefshme që nuk prodhon output), maro përpiqet të{" "}
          <strong className="text-ink">kthen automatikisht kreditet e zbritura</strong> në llogarinë tuaj.
        </p>
        <p>
          Nëse shihni që kreditet nuk u kthyen pas një dështimi, kontaktoni{" "}
          <a href={`mailto:${LEGAL_ENTITY.supportEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.supportEmail}
          </a>{" "}
          me email-in e llogarisë, kohën e ngjarjes dhe (nëse është e mundur) ID-në e projektit ose
          screenshot-in e gabimit. Do ta shqyrtojmë brenda 5 ditëve pune.
        </p>
      </LegalSection>

      <LegalSection title="4. Kur NUK rimbursohen kreditet">
        <p>Kreditet zakonisht <strong className="text-ink">nuk</strong> kthehen kur:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>gjenerimi u krye me sukses dhe output-i u dorëzua (edhe nëse nuk ju pëlqen estetikisht);</li>
          <li>prompt-i ose materialet e ngarkuara shkelnin Kushtet ose ligjin;</li>
          <li>ndërpritet qëllimisht veprimi nga ju pas fillimit të përpunimit;</li>
          <li>shpenzoni kredite për redaktim/chat ku shërbimi u ofrua siç duhet;</li>
          <li>problemi vjen nga pajisja, rrjeti ose shfletuesi juaj.</li>
        </ul>
        <p>
          Output-et AI janë probabilistike. Nuk garantojmë rezultat specifik; kjo nuk konsiderohet dështim
          teknik.
        </p>
      </LegalSection>

      <LegalSection title="5. Rimbursim monetar (para)">
        <p>
          Për blerje kreditesh me para (EUR), rimbursimi monetar aplikohet vetëm në këto raste:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Pagesë e dyfishtë ose e gabuar:</strong> e verifikuar nga
            procesori i pagesave;
          </li>
          <li>
            <strong className="text-ink">Kredite nuk u shtuan</strong> pas pagesës së konfirmuar, dhe
            problemi nuk u zgjidh brenda 5 ditëve pune;
          </li>
          <li>
            <strong className="text-ink">Kërkesë brenda 14 ditëve</strong> nga data e blerjes, nëse nuk
            keni përdorur asnjë kredit nga ai paketim (e drejta e tërheqjes për konsumatorët, ku
            aplikohet ligji shqiptar/EU për shitje në distancë).
          </li>
        </ul>
        <p>
          Pas fillimit të përdorimit të krediteve të blera, blerja konsiderohet e konsumuar dhe rimbursimi
          monetar zakonisht nuk ofrohet, përveç kur kërkohet me ligj.
        </p>
      </LegalSection>

      <LegalSection title="6. maroFort dhe abonime">
        <p>
          Për abonimin maroFort: anulimi ndalon rinovimin e ardhshëm; nuk rimbursohet periudha aktive e
          paguar, përveç rasteve të detyrueshme ligjore. Kreditet mujore të maroFort janë pjesë e planit
          dhe nuk konvertohen në para.
        </p>
      </LegalSection>

      <LegalSection title="7. Si kërkohet rimbursimi">
        <p>Dërgoni kërkesë në:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Email:{" "}
            <a href={`mailto:${LEGAL_ENTITY.supportEmail}`} className="font-semibold text-ink hover:underline">
              {LEGAL_ENTITY.supportEmail}
            </a>
          </li>
          <li>Subjekti: &quot;Kërkesë rimbursimi maro&quot;</li>
          <li>Përfshini: email llogarie, datën e pagesës, shumën, arsyen dhe çdo provë (faturë, screenshot)</li>
          <li>Adresa: {LEGAL_ADDRESS}</li>
        </ul>
        <p>
          Përgjigjemi brenda <strong className="text-ink">5–10 ditëve pune</strong>. Rimbursimet e
          aprovuara në para kryhen në të njëjtin metodë pagese, brenda 14 ditëve pune nga aprovimi, në
          varësi të bankës/procesorit.
        </p>
      </LegalSection>

      <LegalSection title="8. Ankesa">
        <p>
          Nëse nuk jeni të kënaqur me vendimin tonë, mund të na shkruani sërish për rishikim të escaluar
          te {LEGAL_ENTITY.contactEmail}, ose të drejtoheni te autoritetet e mbrojtjes së konsumatorit në
          Republikën e Shqipërisë.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
