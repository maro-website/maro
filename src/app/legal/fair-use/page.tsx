import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ENTITY, LEGAL_SOURCES } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Përdorimi i drejtë · maro" };

export default function FairUsePage() {
  return (
    <LegalLayout title="Përdorimi i drejtë" current="Përdorimi i drejtë">
      <LegalSection title="1. Qëllimi dhe fusha">
        <p>Kjo politikë e {LEGAL_ENTITY.name}, NUI/NRB {LEGAL_ENTITY.nui}, përcakton përdorimin e pranueshëm të Maro-s. Zbatohet për llogaritë, Workspaces, maroBrain, maro Web, maroLogo, maro Imazh, maroPresets, Explore dhe funksionet e tjera kur aktivizohen. Ajo është pjesë e <Link href="/legal/terms">Kushteve të Përdorimit</Link> dhe zbatohet në përputhje me ligjin e Republikës së Kosovës.</p>
        <p>Rregullat synojnë mbrojtjen e njerëzve, materialeve dhe funksionimit të shërbimit. Blerja e krediteve nuk lejon shkeljen e ligjit ose të drejtave të palëve të treta.</p>
      </LegalSection>
      <LegalSection title="2. Përdorimi i lejuar">
        <ul className="list-disc space-y-2 pl-5">
          <li>Krijimi, redaktimi dhe eksporti i materialeve për përdorim personal, biznes ose klientë, kur keni autorizimin e nevojshëm.</li>
          <li>Organizimi i projekteve dhe brendeve në Workspaces brenda kufijve të planit; përdorimi i maroBrain me informacion të ligjshëm e të përshtatshëm për qëllimin.</li>
          <li>Përdorimi i preset-eve dhe referencave që zotëroni ose keni të drejtë t’i përdorni; rigjenerimi dhe ndryshimet sipas kostos së shfaqur.</li>
          <li>Publikimi vullnetar në Explore dhe remix përmes funksioneve të ofruara, duke respektuar autorësinë, privatësinë dhe licencat.</li>
          <li>Përdorimi i integrimeve ose API-ve vetëm kur Maro i ofron dhe i autorizon, brenda dokumentacionit, kredencialeve dhe kufijve përkatës.</li>
        </ul>
      </LegalSection>
      <LegalSection title="3. Përmbajtja dhe sjelljet e ndaluara">
        <ul className="list-disc space-y-2 pl-5">
          <li>Përmbajtje e paligjshme, mashtrime, phishing, dokumente të falsifikuara, reklama me pretendime mashtruese ose shkelje të të drejtave të konsumatorit.</li>
          <li>Shfrytëzim ose abuzim seksual i të miturve; përmbajtje intime pa pëlqim; manipulim i pamjes ose zërit për mashtrim, shantazh ose paraqitje të rreme si person tjetër.</li>
          <li>Kërcënime, nxitje dhune, përndjekje, publikim i të dhënave private për dëmtim dhe përmbajtje që nxit urrejtje ose diskriminim të paligjshëm.</li>
          <li>Shkelje të së drejtës së autorit, markave, licencave, sekreteve tregtare ose të drejtave mbi pamjen e zërin. Një material publik në internet nuk është automatikisht i lirë për përdorim.</li>
          <li>Ngarkim ose nxjerrje e të dhënave personale pa bazë ligjore. Mos përdorni maroBrain ose referencat për të mbledhur dosje private mbi persona pa autorizim.</li>
          <li>Malware, vjedhje kredencialesh, sulme ndaj shërbimeve, udhëzime të qëllimshme për aktivitet kriminal ose përmbajtje që dëmton sigurinë e të tjerëve.</li>
        </ul>
        <p>Kur audio ose video bëhet e disponueshme, këto rregulla vlejnë edhe për regjistrimet, transkriptet, imitimet dhe materialet e gjeneruara. Duhet të keni lejet për zërat, personat dhe veprat që përdorni. Mos paraqitni përmbajtje sintetike si regjistrim autentik kur kjo mashtron ose cenon të drejtat e të tjerëve.</p>
      </LegalSection>
      <LegalSection title="4. Mbrojtja e llogarive, krediteve dhe sistemit">
        <ul className="list-disc space-y-2 pl-5">
          <li>Mos krijoni llogari ose identitete të shumëfishta për të marrë në mënyrë të padrejtë bonus, për të shmangur pezullimin ose kufijtë e planit.</li>
          <li>Mos manipuloni balancën, çmimin, statusin e porosisë, konfirmimin e pagesës ose kërkesat e rimbursimit.</li>
          <li>Mos ndani, shisni ose publikoni tokenë, sesione, fjalëkalime ose lidhje private të materialeve të personave të tjerë.</li>
          <li>Mos kryeni scraping masiv, kërkesa të pakontrolluara, anashkalim të kufijve ose automatizim përmes rrugëve të paautorizuara.</li>
          <li>Mos tentoni të nxirrni udhëzimet e brendshme, sekretet, çelësat ose të dhënat e llogarive të tjera, përfshirë përmes manipulimit të udhëzimeve të modelit.</li>
        </ul>
        <p>Nëse gjeni cenueshmëri, ndaloni veprimet që mund të prekin të tjerët dhe raportojeni te <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>. Mos shkarkoni të dhëna të personave të tjerë për ta provuar problemin.</p>
      </LegalSection>
      <LegalSection title="5. Kufijtë e planit dhe përdorimi i burimeve">
        <p>Kufijtë për Workspaces, gjenerime njëkohësisht, madhësi skedarësh, kohë përpunimi dhe shpejtësi kërkesash varen nga plani, vegla dhe oferta e shfaqur. Shihni <Link href="/pricing">Planet &amp; Kreditet</Link> dhe llogarinë tuaj. Për maroBiz mund të ketë kufij të dakorduar veçmas.</p>
        <p>Kur ka ngarkesë ose rrezik abuzimi, mund të vendosim radhë, pauza ose kufizime proporcionale. Kreditet e mjaftueshme nuk heqin kufijtë teknikë. Shpejtësia e zgjedhur nuk garanton kohë të saktë përfundimi; ajo ndikohet edhe nga kompleksiteti dhe ofruesi AI.</p>
        <p>Mos dërgoni shumë kërkesa të njëjta në mënyrë të përsëritur kur një veprim është në proces. Kontrolloni historikun dhe balancën. Një dështim teknik pa rezultat ose rezervim i pambyllur trajtohet sipas <Link href="/legal/refund">Politikës së Rimbursimit</Link>.</p>
      </LegalSection>
      <LegalSection title="6. Explore, kreatorët dhe promocionet">
        <p>Publikoni vetëm materiale për të cilat keni të drejtë publikimi. Kontrolloni edhe tekstin/promptin dhe emrin e autorit që bëhen publikë. Mos përdorni Explore për spam, shkelje privatësie, përvetësim të punës së të tjerëve ose manipulim të pëlqimeve e remix-eve.</p>
        <p>Referimet, komisionet dhe garat duhet të pasqyrojnë veprimtari reale. Ndalohet krijimi i porosive fiktive, vetë-referimeve të ndaluara nga oferta, votave artificiale ose kërkesave të dyfishta për përfitime. Kur promovoni Maro me marrëdhënie të paguar ose komision, bëjeni të qartë lidhjen sipas ligjit dhe rregullave të kanalit ku publikoni.</p>
      </LegalSection>
      <LegalSection title="7. Moderimi, raportimi dhe rishikimi">
        <p>Mund të përdorim kontrolle automatike dhe shqyrtim nga personeli për të hetuar shkeljet. Sipas rastit mund të refuzojmë kërkesën, kërkojmë korrigjim, kufizojmë funksionin, heqim publikimin ose pezullojmë llogarinë. Masat e menjëhershme mund të nevojiten për siguri ose detyrim ligjor.</p>
        <p>Për raportim dërgoni lidhjen ose identifikuesin, përshkrimin e problemit dhe bazën e pretendimit te {LEGAL_ENTITY.supportEmail}. Për të drejta autori ose privatësie përfshini informacion që na ndihmon të verifikojmë lidhjen tuaj me materialin, pa dërguar të dhëna të panevojshme.</p>
        <p>Kur lejohet nga ligji dhe siguria, ju njoftojmë për arsyen e masës. Mund të kërkoni rishikim nga personeli dhe të paraqisni sqarime. Një raportim ose rezultat i filtrit nuk është vetvetiu vendim përfundimtar se keni shkelur ligjin.</p>
      </LegalSection>
      <LegalSection title="8. Pagesat dhe mbrojtja ligjore">
        <p>Shkeljet nuk nënkuptojnë automatikisht humbjen e çdo krediti ose pagese. Ngarkesat e gabuara, shërbimet e papërmbushura dhe të drejtat e tërheqjes shqyrtohen sipas <Link href="/legal/refund">Politikës së Rimbursimit</Link> dhe <a href={LEGAL_SOURCES.consumer}>ligjit të Kosovës për mbrojtjen e konsumatorit</a>.</p>
        <p>Kjo politikë nuk pengon ankesën te autoritetet ose gjykata kompetente. Për të dhënat e përpunuara gjatë raportimit dhe moderimit shihni <Link href="/legal/privacy">Politikën e Privatësisë</Link>.</p>
      </LegalSection>
    </LegalLayout>
  );
}
