import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY, LEGAL_SOURCES } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Politika e Rimbursimit · maro" };

export default function RefundPage() {
  return (
    <LegalLayout title="Politika e Rimbursimit" current="Politika e Rimbursimit">
      <LegalSection title="1. Fusha dhe të drejtat ligjore">
        <p>Kjo politikë zbatohet për blerjet nga {LEGAL_ENTITY.name}, NUI/NRB {LEGAL_ENTITY.nui}, {LEGAL_ADDRESS}: planet maroStandard e maroPro, rinovimet, kalimin e planit dhe rimbushjet e krediteve. Për maroBiz zbatohen edhe kushtet e marrëveshjes përkatëse.</p>
        <p>Politika plotëson <Link href="/legal/terms">Kushtet e Përdorimit</Link> dhe mbështetet te <a href={LEGAL_SOURCES.consumer}>Ligji nr. 06/L-034 për Mbrojtjen e Konsumatorit i Republikës së Kosovës</a>, me ndryshimet në fuqi. Të drejtat ligjore kanë përparësi ndaj kufizimeve tregtare të kësaj politike.</p>
        <p><strong>Kthimi i krediteve</strong> korrigjon balancën në Maro. <strong>Rimbursimi monetar</strong> kthen pagesën. Kur keni të drejtë ligjore për para, nuk ju detyrojmë të pranoni vetëm kredite.</p>
      </LegalSection>
      <LegalSection title="2. Tërheqja brenda 14 ditëve">
        <p>Nëse blini si konsumator, jashtë veprimtarisë tregtare ose profesionale, zakonisht mund të tërhiqeni nga kontrata në distancë brenda <strong>14 ditëve kalendarike nga lidhja e saj</strong>, pa dhënë arsye, sipas neneve 42–49 të ligjit. Kjo përfshin kontratat për shërbime dhe përmbajtje digjitale sipas klasifikimit të blerjes.</p>
        <p>Mjafton ta dërgoni njoftimin e qartë të tërheqjes para përfundimit të afatit në <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a> ose në {LEGAL_ADDRESS}. Nuk është e nevojshme që kërkesa të miratohet brenda atyre 14 ditëve. Mund të përdorni modelin në pikën 8, por përdorimi i tij nuk është i detyrueshëm.</p>
        <p>Nëse informacioni i detyrueshëm për tërheqjen nuk është dhënë, afati mund të zgjatet sipas nenit 43, deri në 12 muaj pas përfundimit të afatit fillestar. Nëse informacioni jepet gjatë asaj periudhe, zbatohet afati përkatës prej 14 ditëve nga marrja e tij.</p>
      </LegalSection>
      <LegalSection title="3. Fillimi i përdorimit dhe përjashtimet">
        <p><strong>Përdorimi i një krediti nuk ju heq automatikisht të drejtën për t’u tërhequr nga e gjithë blerja.</strong> Pranimi i përgjithshëm i kushteve, hyrja në llogari ose shtimi i krediteve nuk zëvendëson pëlqimin e posaçëm që kërkon ligji.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Për shërbime të filluara gjatë afatit të tërheqjes, mund të kërkohet pagesë proporcionale vetëm kur keni kërkuar shprehimisht fillimin dhe keni marrë informacionin e kërkuar. Vlerësohet shërbimi i kryer realisht deri te njoftimi i tërheqjes.</li>
          <li>Për shërbim të përmbushur plotësisht, përjashtimi zbatohet vetëm kur janë plotësuar kushtet ligjore për pëlqimin paraprak dhe pranimin e humbjes së të drejtës pas përmbushjes së plotë.</li>
          <li>Për përmbajtje digjitale që nuk dorëzohet në bartës fizik, përjashtimi kërkon pëlqimin tuaj paraprak të shprehur për fillimin dhe pranimin e humbjes së të drejtës së tërheqjes, së bashku me konfirmimin e kërkuar në mjet të qëndrueshëm komunikimi.</li>
        </ul>
        <p>Nëse këto kushte nuk provohen, Maro nuk mbështetet në humbje automatike të së drejtës ose zbritje automatike për përdorim. Kërkesa shqyrtohet sipas natyrës së blerjes dhe nenit 47; kur ky nen e përjashton koston për konsumatorin, ajo nuk zbritet.</p>
      </LegalSection>
      <LegalSection title="4. Probleme teknike dhe shërbim i papërmbushur">
        <p>Kur gjenerimi dështon pa dorëzuar rezultat, sistemi përpiqet të lirojë rezervimin ose të kthejë kreditet e zbritura. Nëse korrigjimi nuk shfaqet, na dërgoni emailin e llogarisë, kohën dhe identifikuesin e gjenerimit/projektit. Kontrollojmë historikun dhe korrigjojmë ngarkesën e gabuar.</p>
        <p>Kontaktoni edhe për pagesë të dyfishtë, shumë të gabuar, pagesë të konfirmuar pa kredite/përfitime ose shërbim që nuk përputhet me atë që është blerë. Sipas rastit dhe ligjit zbatohet korrigjimi, ofrimi i shërbimit, ulja e çmimit, ndërprerja ose rimbursimi. Një kërkesë për rimbursim që buron nga ligji nuk kushtëzohet me pranimin e një prove tjetër AI.</p>
        <p>Nëse banka shfaq një rezervim të kartës dhe porosia nuk është paguar, mund të jetë autorizim i përkohshëm që banka duhet ta lirojë. Na kontaktoni për verifikim; mos kryeni pagesa të përsëritura vetëm për shkak të vonesës së ekranit.</p>
      </LegalSection>
      <LegalSection title="5. Rezultatet e dorëzuara dhe preferencat krijuese">
        <p>Jashtë të drejtës ligjore të tërheqjes dhe rasteve të mospërmbushjes, një rezultat i dorëzuar sipas funksionit të blerë zakonisht nuk sjell kthim kreditesh vetëm sepse preferoni stil tjetër. Rigjenerimi, redaktimi AI dhe ndryshimi i cilësimeve mund të kushtojnë kredite të tjera sipas çmimit të shfaqur.</p>
        <p>Mbyllja e skedës ose ndërprerja e internetit nuk provon vetvetiu se përpunimi ka dështuar. Kontrollojmë nëse rezultati është prodhuar dhe i qasshëm. Po ashtu, një refuzim nga filtrat e sigurisë nuk e bën automatikisht të ligjshme mbajtjen e krediteve; kontrollojmë veprimin dhe shërbimin e kryer. Këto rregulla nuk përjashtojnë të drejtat për shërbim të papërmbushur.</p>
      </LegalSection>
      <LegalSection title="6. Planet, rimbushjet dhe bonuset">
        <p>Standard dhe Pro rinovohen manualisht. Për të mos blerë periudhën tjetër, mjafton të mos kryeni rinovim. Kërkesa për mbylljen e llogarisë, mosrinovimi dhe tërheqja nga një blerje janë veprime të ndryshme.</p>
        <p>Skadimi i planit nuk i skadon vetvetiu kreditet e blera. Rimbushja kërkon plan aktiv dhe nuk rinovon automatikisht afatin e planit. Oferta dhe konfirmimi i porosisë përcaktojnë kreditet dhe periudhën; maroBiz trajtohet sipas marrëveshjes.</p>
        <p>Rimbursimi monetar bazohet në shumën e paguar realisht pas zbritjeve, jo në çmimin teorik të krediteve. Kreditet falas nuk kanë vlerë monetare për rimbursim. Kur kthehet një blerje, mund të hiqen kreditet dhe përfitimet që burojnë nga ajo, me përllogaritje të shpjeguar dhe pa kthim të dyfishtë. Kjo nuk autorizon zbritje që ligji i ndalon.</p>
      </LegalSection>
      <LegalSection title="7. Procedura dhe afatet">
        <p>Dërgoni kërkesën në <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>, me emailin e llogarisë dhe, nëse i keni, numrin e porosisë, datën, shumën ose identifikuesin e gjenerimit. Për tërheqjen ligjore nuk kërkohet arsye. Për problem teknik ose pagesë të gabuar përshkruani problemin. Mos dërgoni numrin e plotë të kartës, CVV, fjalëkalimin ose kodet bankare.</p>
        <p>Për ankesat e konsumatorëve që nuk zgjidhen menjëherë konfirmojmë pranimin me shkrim. Përgjigjemi pa vonesë, jo më vonë se <strong>15 ditë nga pranimi i ankesës</strong>, me vlerësimin dhe zgjidhjen e propozuar.</p>
        <p>Për tërheqje të vlefshme, kthimi i pagesës kryhet pa vonesë dhe jo më vonë se <strong>14 ditë kalendarike nga dita kur informohemi për vendimin tuaj</strong>, sipas nenit 46. Ky afat nuk fillon nga miratimi i brendshëm. Përdorim të njëjtën mënyrë pagese, përveç nëse pranoni shprehimisht një mënyrë tjetër pa kosto shtesë.</p>
        <p>Për rimbursime të tjera zbatojmë afatin ligjor përkatës dhe ju konfirmojmë mënyrën e kthimit. Koha e pasqyrimit nga banka mund të ndryshojë, por nuk e zgjat detyrimin tonë për ta kryer rimbursimin në afat.</p>
      </LegalSection>
      <LegalSection title="8. Model njoftimi për tërheqje">
        <div className="rounded-maro12 border border-line bg-surface p-5">
          <p>Për: {LEGAL_ENTITY.name}, {LEGAL_ADDRESS}, {LEGAL_ENTITY.supportEmail}</p>
          <p>Ju njoftoj se tërhiqem nga kontrata për blerjen e mëposhtme në maro.al.</p>
          <p>Emri dhe mbiemri: …<br />Adresa: …<br />Emaili i llogarisë: …<br />Shërbimi/porosia: …<br />Data e blerjes: …<br />Data e njoftimit: …<br />Nënshkrimi: … (vetëm nëse dërgohet në letër)</p>
        </div>
        <p>Mund të përdorni edhe çdo deklaratë tjetër të qartë të vendimit tuaj. Ruani një kopje dhe provën e dërgimit.</p>
      </LegalSection>
      <LegalSection title="9. Ankesa dhe blerjet profesionale">
        <p>Mund të kërkoni rishikim në {LEGAL_ENTITY.contactEmail}, t’i drejtoheni <a href={LEGAL_SOURCES.consumerAuthority}>Departamentit për Mbrojtjen e Konsumatorit të Kosovës</a> ose gjykatës kompetente. Rishikimi ynë i brendshëm nuk ju pengon të përdorni këto mjete ose të drejtat tuaja te banka.</p>
        <p>Për blerje në kuadër të biznesit/profesionit, e drejta e posaçme 14-ditore e konsumatorit nuk zbatohet automatikisht; vlejnë marrëveshja dhe të drejtat për mospërmbushje sipas ligjit. Përdoruesit jashtë Kosovës ruajnë mbrojtjet e detyrueshme që zbatohen për ta.</p>
      </LegalSection>
    </LegalLayout>
  );
}
