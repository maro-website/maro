import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY, LEGAL_SOURCES } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Politika e Privatësisë · maro" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politika e Privatësisë" current="Politika e Privatësisë">
      <LegalSection title="1. Kontrolluesi dhe ligji i zbatueshëm">
        <p><strong>{LEGAL_ENTITY.name}</strong>, NUI/NRB {LEGAL_ENTITY.nui}, {LEGAL_ADDRESS}, është operatori i maro.al dhe kontrolluesi i të dhënave për llogaritë, faturimin, sigurinë dhe administrimin e platformës. Zbatohet <a href={LEGAL_SOURCES.privacy}>Ligji nr. 06/L-082 për Mbrojtjen e të Dhënave Personale i Republikës së Kosovës</a>. Kontakti për privatësi është <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a>, tel. <a href={`tel:${LEGAL_ENTITY.phone}`}>{LEGAL_ENTITY.phone}</a>.</p>
        <p>Kur një biznes ngarkon të dhëna të klientëve ose punonjësve të vet dhe Maro i përpunon vetëm sipas udhëzimeve të tij, biznesi përcakton qëllimin e atij përpunimi. Kur kërkohet, kjo marrëdhënie duhet të mbulohet me marrëveshje të veçantë për përpunimin e të dhënave. Kjo politikë nuk e zëvendëson atë marrëveshje dhe as bazën ligjore të biznesit për ngarkimin e të dhënave.</p>
      </LegalSection>
      <LegalSection title="2. Të dhënat që përpunojmë dhe burimet">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Llogaria:</strong> email, emër, identifikues përdoruesi, foto profili kur jepet, të dhëna autentifikimi, verifikimi dhe rikuperimi. Autentifikimi menaxhohet përmes Supabase; fjalëkalimi nuk ruhet si tekst i lexueshëm në profilin e Maro-s.</li>
          <li><strong>Puna krijuese:</strong> kërkesat/promptet, bisedat për redaktim, cilësimet e modelit, referencat vizuale, materialet e ngarkuara, rezultatet, kodi i website-ve, historiku, gabimet dhe kreditet e përdorura. Për funksione audio të aktivizuara përpunohen edhe teksti, regjistrimet dhe transkriptet që dorëzoni.</li>
          <li><strong>Workspaces dhe maroBrain:</strong> emri dhe kontaktet e biznesit, logo, faqe e internetit, rrjete sociale, audiencë, objektiva, treg, konkurrentë, stil komunikimi, burime dhe skedarë referencë. Këto mund të përmbajnë të dhëna personale nëse i përfshini.</li>
          <li><strong>Blerjet:</strong> emër dhe adresë faturimi, qytet, shtet, email, telefon ose të dhëna biznesi kur kërkohen, produkti, plani, shuma, valuta, zbritja, statusi, identifikuesit e porosisë/transaksionit dhe historiku i krediteve. Numri i plotë i kartës dhe CVV nuk ruhen nga Maro.</li>
          <li><strong>Komuniteti:</strong> krijime dhe tekste të publikuara në Explore, emri i autorit, lidhjet, pëlqimet, remix-et, të preferuarat, pjesëmarrjet në gara dhe raportimet.</li>
          <li><strong>Komunikimet:</strong> kërkesa për mbështetje, ankesa, aplikime kreatorësh, kontakte e llogari sociale të dorëzuara, kode referimi, email për listën e pritjes, njoftime dhe të dhëna për dërgimin e emaileve.</li>
          <li><strong>Përdorimi dhe siguria:</strong> IP sipas funksionit, pajisja/shfletuesi, koha e kërkesës, sesioni, gabimet, kufizimet e përdorimit dhe regjistrat administrativë. Regjistrohen edhe ngjarje si shikimi/kopjimi i materialeve të gatshme, përdorimi i referimeve dhe statistika të gjenerimeve.</li>
        </ul>
        <p>Të dhënat vijnë nga ju, nga veprimet në platformë dhe nga ofruesit e autentifikimit, AI, emailit e pagesave gjatë përmbushjes së kërkesës suaj. Materialet e publikuara nga përdorues të tjerë janë burim kur përdorni ndarjen ose remix-in.</p>
      </LegalSection>
      <LegalSection title="3. Qëllimet dhe bazat ligjore">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Përmbushja e kontratës ose kërkesa para saj:</strong> hapja e llogarisë, gjenerimi dhe redaktimi, ruajtja e punës, maroBrain, publikimi i kërkuar, përllogaritja e krediteve, porositë dhe mbështetja.</li>
          <li><strong>Detyrimi ligjor:</strong> faturimi, evidencat tatimore e kontabël, trajtimi i të drejtave, ankesave dhe kërkesave të ligjshme të autoriteteve.</li>
          <li><strong>Interesi legjitim:</strong> parandalimi i mashtrimit, mbrojtja e llogarive, moderimi, diagnostikimi, statistikat e përdorimit dhe përmirësimi i funksioneve. Ky përpunim duhet të jetë i nevojshëm e proporcional dhe të mos mbizotërojë mbi të drejtat tuaja; mund ta kundërshtoni.</li>
          <li><strong>Pëlqimi, kur kërkohet:</strong> njoftimi për lansim që kërkoni në listën e pritjes, komunikime promocionale dhe teknologji opsionale. Mund ta tërhiqni pa cenuar ligjshmërinë e përpunimit të mëparshëm.</li>
        </ul>
        <p>Fushat e kërkuara për llogarinë, gjenerimin ose faturimin nevojiten për funksionin përkatës; pa to nuk mund ta ofrojmë atë. Profili i zgjeruar i brendit, publikimi në Explore dhe lista e pritjes janë zgjedhje. Pranimi i kushteve nuk është pëlqim për çdo përdorim të mundshëm të të dhënave.</p>
      </LegalSection>
      <LegalSection title="4. Si përdoren materialet nga AI dhe maroBrain">
        <p>Për të realizuar kërkesën, Maro përgatit dhe dërgon te ofruesi përkatës promptin, cilësimet dhe materialet e nevojshme. Konteksti mund të përfshijë bisedën e redaktimit, përmbajtjen e projektit dhe informacionin nga maroBrain i Workspace-it që përdorni. Një burim ose fotografi e shtuar aty mund të përdoret përsëri për gjenerimet përkatëse.</p>
        <p>Materialet dhe të dhënat e gjenerimit mund të ruhen për historikun, rikthimin e rezultatit, verifikimin e kostos dhe diagnostikimin. Personeli i autorizuar mund t’i shqyrtojë kur nevojiten për mbështetje, siguri ose hetimin e gabimeve. MaroBrain përdoret si kontekst i kërkesës; plotësimi i tij nuk nënkupton trajnim të një modeli të veçantë për biznesin tuaj.</p>
        <p>Përpunimi nga ofruesit AI mund të përfshijë ruajtje dhe kontrolle sigurie sipas shërbimit dhe marrëveshjes përkatëse. Nuk premtojmë ruajtje zero ose përjashtim universal nga çdo përdorim i ofruesit pa një marrëveshje që e siguron këtë. Për kërkesa të posaçme konfidencialiteti kontaktoni para ngarkimit.</p>
        <p>Mos ngarkoni fjalëkalime, të dhëna të plota karte, dokumente identiteti ose të dhëna të ndjeshme që nuk nevojiten. Për materiale me persona të tjerë duhet të keni bazë ligjore dhe, kur kërkohet, pëlqimin e tyre. Shërbimi standard nuk ofrohet për identifikim biometrik të personave.</p>
      </LegalSection>
      <LegalSection title="5. Kush mund t’i marrë të dhënat">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Supabase:</strong> autentifikimi, baza e të dhënave dhe ruajtja e skedarëve.</li>
          <li><strong>Anthropic:</strong> vetëm për funksionet e website-ve kur janë të aktivizuara; maroWeb nuk është i disponueshëm në V1.</li>
          <li><strong>OpenAI:</strong> promptet, cilësimet dhe referencat e nevojshme për imazhe e logo.</li>
          <li><strong>ElevenLabs:</strong> tekst dhe audio vetëm kur përdorni funksionet audio të aktivizuara që mbështeten te ky ofrues.</li>
          <li><strong>Railway dhe Cloudflare:</strong> hostimi i platformës, shpërndarja e trafikut, lidhja e sigurt dhe mbrojtja e shërbimit.</li>
          <li><strong>Resend:</strong> adresa e marrësit, përmbajtja e emailit të shërbimit dhe të dhënat e dërgimit.</li>
          <li><strong>Raiffeisen Bank Kosova dhe procesori përkatës:</strong> të dhënat e transaksionit kur pagesa reale përmes tyre është e disponueshme dhe e zgjedhur.</li>
          <li><strong>Paddle:</strong> të dhënat e faturimit dhe transaksionit për përpunimin e abonimeve ose blerjeve ekzistuese me këtë ofrues. Paddle nuk përdoret për blerje të reja në V1; blerjet e reja të aktivizuara përdorin Raiffeisen/RaiAccept.</li>
        </ul>
        <p>Nuk i dërgojmë çdo të dhënë çdo ofruesi; marrësi varet nga funksioni. Punonjësit dhe bashkëpunëtorët e autorizuar marrin qasje sipas detyrës. Këshilltarët kontabël/ligjorë dhe autoritetet mund të marrin të dhëna kur nevojitet për detyrime ligjore ose mbrojtjen e kërkesave.</p>
        <p>Ofruesit mund të veprojnë si përpunues për shërbimin që kryejnë për ne dhe, për detyrimet e tyre ligjore, si kontrollues të veçantë. Një bankë nuk vepron vetëm sipas udhëzimeve tona. Krijimet që publikoni u bëhen të qasshme vizitorëve të Explore. Një lidhje drejt reklamuesit ose një website-i të jashtëm ju çon te shërbimi dhe politika e tij.</p>
      </LegalSection>
      <LegalSection title="6. Transferimet jashtë Kosovës">
        <p>Shërbimet e infrastrukturës dhe AI mund të përpunojnë të dhëna jashtë Kosovës, përfshirë në shtete të Zonës Ekonomike Evropiane dhe SHBA, në varësi të ofruesit, rajonit të llogarisë dhe nën-përpunuesve të tij. Vendi i regjistrimit të Maro-s nuk do të thotë se të gjitha të dhënat ruhen fizikisht në Kosovë.</p>
        <p>Për transferimet zbatohen nenet 44–49 të Ligjit nr. 06/L-082: niveli i duhur i mbrojtjes sipas vendimeve të Agjencisë për Informim dhe Privatësi dhe, kur kërkohet, autorizimi i Agjencisë para transferimit. Klauzolat kontraktuale të huaja nuk e zëvendësojnë vetvetiu një autorizim të kërkuar nga ligji i Kosovës.</p>
        <p>Mund të kërkoni informacion për marrësin, shtetin e përpunimit dhe masat e zbatueshme për të dhënat tuaja në {LEGAL_ENTITY.contactEmail}. Kushtet konkrete të një transferimi duhet të verifikohen para përpunimit që e kërkon atë.</p>
      </LegalSection>
      <LegalSection title="7. Publikimi, pajisja juaj dhe kopjet">
        <p>Projektet e punës dhe publikimi në Explore janë funksione të ndara. Kur publikoni, përmbajtja dhe teksti/prompti i bashkëngjitur mund të bëhen publikë së bashku me emrin e autorit. Në mungesë të emrit, emërtimi mund të dalë nga pjesa para @ e emailit tuaj. Mos e përdorni ndarjen publike për material konfidencial.</p>
        <p>Disa projekte, krijime, cilësime dhe të dhëna të Workspaces/maroBrain ruhen edhe në shfletuesin tuaj. Fshirja e të dhënave të shfletuesit mund të humbë punë që ekziston vetëm aty; kërkesa për fshirjen në server nuk pastron automatikisht pajisjen tuaj. Për detaje shihni <Link href="/legal/cookies">Politikën e Cookies</Link>.</p>
        <p>Për heqjen e një publikimi na dërgoni lidhjen. Kopjet që palët e tjera kanë shkarkuar, ndarë ose ruajtur jashtë Maro-s nuk fshihen automatikisht bashkë me origjinalin.</p>
      </LegalSection>
      <LegalSection title="8. Sa kohë ruhen të dhënat">
        <p>Afati përcaktohet sipas qëllimit, llojit të të dhënave dhe detyrimeve ligjore, jo nga një afat i vetëm për gjithë platformën:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Llogaria, projektet, gjenerimet dhe maroBrain ruhen për ofrimin e shërbimit dhe historikun, derisa të kërkoni fshirje ose të mbyllet marrëdhënia, duke shqyrtuar përjashtimet ligjore.</li>
          <li>Porositë, faturat dhe evidencat financiare ruhen për periudhat e kërkuara nga ligjet tatimore e kontabël dhe për kërkesa ligjore. Mbyllja e llogarisë nuk i fshin automatikisht këto evidenca.</li>
          <li>Kërkesat e mbështetjes, aplikimet e kreatorëve dhe lista e pritjes ruhen sa nevojiten për qëllimin përkatës dhe shqyrtimin e kërkesave që lidhen me të. Mund të kërkoni largim nga lista e pritjes në çdo kohë.</li>
          <li>Regjistrat teknikë, të sigurisë dhe të emailit mbahen sipas nevojës për diagnostikim, siguri dhe provë të dërgimit. Kopjet rezervë varen edhe nga ciklet e ofruesit dhe mund të kërkojnë kohë shtesë për largim.</li>
        </ul>
        <p>Kërkesat për fshirje trajtohen individualisht; nuk premtohet fshirje automatike e të gjitha kopjeve në momentin e kërkesës. Ju informojmë për të dhënat që duhet të mbeten, arsyen dhe afatin ose kriterin përkatës. Të dhënat që mbeten vetëm për detyrim ligjor duhet të kufizohen në atë qëllim.</p>
      </LegalSection>
      <LegalSection title="9. Të drejtat dhe afati i përgjigjes">
        <p>Sipas kushteve të ligjit keni të drejtë të kërkoni qasje e kopje, korrigjim, fshirje, kufizim, bartje të të dhënave dhe kundërshtim të përpunimit të bazuar në interes legjitim. Mund të tërhiqni pëlqimin dhe të kundërshtoni marketingun e drejtpërdrejtë. Keni gjithashtu mbrojtje ndaj vendimeve vetëm automatike me pasoja juridike ose ndikim të ngjashëm të rëndësishëm.</p>
        <p>Shkruani në <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a> nga emaili i llogarisë, duke përshkruar kërkesën. Mund të kërkojmë vetëm informacionin shtesë të nevojshëm për verifikimin e identitetit. Kërkesa zakonisht është pa pagesë.</p>
        <p>Përgjigjemi pa vonesë të panevojshme dhe brenda një muaji nga marrja e kërkesës. Në raste komplekse ose me shumë kërkesa, afati mund të zgjatet deri në dy muaj shtesë; ju njoftojmë brenda muajit të parë për zgjatjen dhe arsyen. Nëse refuzojmë një kërkesë, shpjegojmë bazën dhe mjetet e ankimit.</p>
        <p>Mund të ankoheni drejtpërdrejt te <a href={LEGAL_SOURCES.privacyAuthority}>Agjencia për Informim dhe Privatësi (AIP), Kosovë</a>, ose të kërkoni mbrojtje gjyqësore. Kontakti paraprak me Maro nuk është kusht për ankesë.</p>
      </LegalSection>
      <LegalSection title="10. Siguria, automatizimi dhe të miturit">
        <p>Përdorim kontrolle qasjeje, lidhje të enkriptuara, kufizime kërkesash dhe masa për mbrojtjen e materialeve private. Qasja administrative kufizohet sipas rolit. Asnjë sistem nuk ofron siguri absolute. Në rast shkeljeje të të dhënave, vlerësojmë incidentin dhe zbatojmë detyrimet e njoftimit ndaj AIP-së dhe personave të prekur sipas ligjit.</p>
        <p>Kontrollet automatike mund të ndalojnë një kërkesë për mungesë kreditesh, kufij përdorimi ose siguri. Për një kufizim që e konsideroni të gabuar mund të kërkoni rishikim nga personeli në kontaktin tonë.</p>
        <p>Maro është për persona 18 vjeç e lart. Nëse na njoftoni se kemi mbledhur të dhëna të një të mituri në kundërshtim me këtë kufi, e shqyrtojmë rastin dhe marrim masat për kufizim ose fshirje sipas ligjit.</p>
      </LegalSection>
      <LegalSection title="11. Njoftimet dhe përditësimet">
        <p>Email-et e verifikimit, rikuperimit, faturimit, sigurisë dhe përgjigjet e mbështetjes lidhen me shërbimin. Kërkesa për njoftim të lansimit nuk është abonim i pakufizuar në marketing. Për të ndaluar komunikimet opsionale përdorni mënyrën e largimit në mesazh, kur ofrohet, ose na shkruani.</p>
        <p>Publikojmë datën e versionit në krye të faqes dhe ju njoftojmë për ndryshime thelbësore. Qëllimet e reja që kërkojnë pëlqim nuk aktivizohen vetëm sepse politika është përditësuar. Për marrëdhënie që hyjnë edhe në fushën e legjislacionit të detyrueshëm të një vendi tjetër, ruhen të drejtat shtesë përkatëse.</p>
      </LegalSection>
    </LegalLayout>
  );
}
