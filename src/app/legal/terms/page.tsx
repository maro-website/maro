import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Kushtet e Përdorimit · maro" };

export default function TermsPage() {
  return (
    <LegalLayout title="Kushtet e Përdorimit" current="Kushtet e Përdorimit">
      <LegalSection title="1. Hyrje">
        <p>
          Këto Kushte të Përdorimit (&quot;Kushtet&quot;) rregullojnë aksesin dhe përdorimin tuaj të platformës{" "}
          <strong className="text-ink">{LEGAL_ENTITY.product}</strong> (&quot;maro&quot;, &quot;Platforma&quot;,
          &quot;Shërbimi&quot;), e operuar nga <strong className="text-ink">{LEGAL_ENTITY.name}</strong> (NRB{" "}
          {LEGAL_ENTITY.nrb}), me seli në {LEGAL_ADDRESS}.
        </p>
        <p>
          Duke krijuar llogari, hyrë ose përdorur maro, ju pranoni këto Kushte dhe{" "}
          <Link href="/legal/privacy" className="font-semibold text-ink underline-offset-2 hover:underline">
            Politikën e Privatësisë
          </Link>
          . Nëse nuk jeni dakord, mos përdorni Shërbimin.
        </p>
      </LegalSection>

      <LegalSection title="2. Përshkrimi i Shërbimit">
        <p>
          maro është një platformë me inteligjencë artificiale (AI) që ju lejon të gjeneroni dhe redaktoni
          materiale dixhitale (website, logo, imazhe reklamash, audio dhe përmbajtje të ngjashme) duke
          përdorur kredite. Rezultatet prodhohen automatikisht nga modele AI dhe mund të kërkojnë rishikim
          manual nga ana juaj para publikimit.
        </p>
        <p>
          Funksionalitete, çmime dhe kufizime mund të ndryshojnë; do të informojmë përdoruesit për ndryshime
          materiale.
        </p>
      </LegalSection>

      <LegalSection title="3. Kualifikimi dhe llogaria">
        <p>
          Duhet të jeni të paktën 18 vjeç dhe të keni aftësi ligjore për të lidhur marrëveshje për të
          përdorur maro. Informacioni që jepni gjatë regjistrimit duhet të jetë i saktë dhe i përditësuar.
        </p>
        <p>
          Jeni përgjegjës për ruajtjen e konfidencialitetit të kredencialeve të llogarisë dhe për çdo
          aktivitet që ndodh nën llogarinë tuaj. Na njoftoni menjëherë në{" "}
          <a href={`mailto:${LEGAL_ENTITY.supportEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.supportEmail}
          </a>{" "}
          nëse dyshoni për akses të paautorizuar.
        </p>
      </LegalSection>

      <LegalSection title="4. Kreditet dhe pagesat">
        <p>
          Shërbimi funksionon me sistem kreditesh. Çmimi i blerjes së krediteve është €0,09 për kredit.
          Planet maroStandard (€9 / 100 kredite) dhe maroPro (€35 / 500 kredite) shfaqen në{" "}
          <Link href="/pricing" className="font-semibold text-ink underline-offset-2 hover:underline">
            Planet & Kreditet
          </Link>
          . Blerja minimale është €9.
        </p>
        <p>
          Kreditet zbriten kur inicirohet një veprim që konsumon burime (p.sh. gjenerim website, imazh,
          redaktim AI). Çmimi në kredite shfaqet para konfirmimit të veprimit. Pagesat proces-ohen përmes
          Raiffeisen Bank Kosova (hosted checkout). Çmimet përfshijnë TVSH-në ku aplikohet, sipas ligjit të
          Kosovës.
        </p>
        <p>
          Kreditet e blera nuk janë monedhë elektronike dhe nuk mund të shkëmbehen për para, përveç rasteve
          të parashikuara në{" "}
          <Link href="/legal/refund" className="font-semibold text-ink underline-offset-2 hover:underline">
            Politikën e Rimbursimit
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. maroFort dhe planet">
        <p>
          maroPro përfshin maroFort falas për 14 ditë. maroFort ofron akses shtesë (mode i avancuar,
          vegla të reja). Detajet e planit dhe përfitimet shfaqen në Platformë. Planet janë blerje
          njëherëshe — pa abonim mujor të detyrueshëm.
        </p>
      </LegalSection>

      <LegalSection title="6. Përmbajtja e përdoruesit dhe licenca">
        <p>
          Ju mbani të drejtat mbi promptet, materialet e ngarkuara dhe projektet tuaja (&quot;Përmbajtja e
          Përdoruesit&quot;). Na jepni një licencë të kufizuar, jo-ekskluzive dhe të revokueshme për të
          përpunuar Përmbajtjen e Përdoruesit vetëm sa nevojitet për të ofruar Shërbimin (p.sh. dërgim te
          modelet AI, ruajtje, shfaqje në editor).
        </p>
        <p>
          Output-et e gjeneruara nga AI (&quot;Output&quot;) ju ofrohen për përdorim tuajin, në masën e
          lejuar nga ligji dhe këto Kushte. Ne nuk garantojmë ekskluzivitetin e Output-it; modele AI mund
          të prodhojnë rezultate të ngjashme për përdorues të tjerë.
        </p>
      </LegalSection>

      <LegalSection title="7. Përdorimi i pranueshëm">
        <p>Ju bini dakord të mos përdorni maro për të:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>shkelur ligjin, të drejtat e palëve të treta ose rregulloret e zbatueshme;</li>
          <li>gjeneruar përmbajtje ilegale, mashtruese, dëmshme, urrejtëse, diskriminuese ose që shkel të drejtat e autorit;</li>
          <li>imituar persona ose entitete pa autorizim;</li>
          <li>anashkaluar kufizimet teknike, abuzuar me API ose shpërndarë malware;</li>
          <li>rishitur, ri-paketuar ose ofruar Shërbimin si white-label pa leje të shkruar nga ne.</li>
        </ul>
        <p>
          Ne mund të suspendojmë ose mbyllim llogarinë tuaj, të heqim përmbajtje ose të refuzojmë shërbimin
          nëse shkelni këto Kushte ose nëse kërkohet nga ligji.
        </p>
      </LegalSection>

      <LegalSection title="8. Pronësia intelektuale e maro">
        <p>
          Platforma, marka maro, dizajni, softueri dhe dokumentacioni janë pronë e {LEGAL_ENTITY.name} ose
          licencuesve të saj. Asgjë në këto Kushte nuk ju transferon të drejta mbi to, përveç një licence
          të kufizuar, personale dhe jo-transferueshme për të përdorur Shërbimin.
        </p>
      </LegalSection>

      <LegalSection title="9. Mohimi i garancive">
        <p>
          Shërbimi ofrohet &quot;sic është&quot; dhe &quot;sic disponohet&quot;. Output-et AI mund të
          përmbajnë gabime, informacion të pasaktë ose elemente të papërshtatshme. Ju jeni përgjegjës për
          verifikimin e rezultateve para publikimit ose përdorimit komercial.
        </p>
        <p>
          Ne nuk garantojmë disponueshmëri të pandërprerë, saktësi absolute ose përshtatshmëri për një qëllim
          të veçantë, në masën maksimale të lejuar nga ligji.
        </p>
      </LegalSection>

      <LegalSection title="10. Kufizimi i përgjegjësisë">
        <p>
          Në masën e lejuar nga ligji, {LEGAL_ENTITY.name} nuk mban përgjegjësi për dëme indirekte,
          humbje fitimi, humbje të dhënash ose dëme të veçanta që rrjedhin nga përdorimi i Shërbimit. Përgjegjësia
          jonë totale ndaj jush për çdo kërkesë nuk do të tejkalojë shumën që keni paguar ne për Shërbimin
          në 12 muajt e fundit para ngjarjes, ose €50, çfarëdo që është më e lartë.
        </p>
      </LegalSection>

      <LegalSection title="11. Ndryshime dhe ndërprerje">
        <p>
          Mund të përditësojmë këto Kushte. Data e përditësimit shfaqet në krye të faqes. Vazhdimi i
          përdorimit pas ndryshimeve konsiderohet pranim. Mund të ndalojmë ose ndryshojmë pjesë të
          Shërbimit për mirëmbajtje, siguri ose arsye biznesi.
        </p>
      </LegalSection>

      <LegalSection title="12. Ligji zbatues dhe kontakt">
        <p>
          Këto Kushte rregullohen nga ligji i Republikës së Kosovës. Mosmarrëveshjet do të zgjidhen
          fillimisht me negociata të ndershme; në mungesë marrëveshjeje, kompetente janë gjykatat e
          Republikës së Kosovës.
        </p>
        <p>
          Kontakt:{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="font-semibold text-ink hover:underline">
            {LEGAL_ENTITY.contactEmail}
          </a>{" "}
          · {LEGAL_ENTITY.name}, NRB {LEGAL_ENTITY.nrb}
          <br />
          {LEGAL_ADDRESS}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
