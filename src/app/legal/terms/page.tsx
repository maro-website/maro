import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY, LEGAL_SOURCES } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Kushtet e Përdorimit · maro" };

export default function TermsPage() {
  return (
    <LegalLayout title="Kushtet e Përdorimit" current="Kushtet e Përdorimit">
      <LegalSection title="1. Operatori dhe zbatimi i kushteve">
        <p>maro.al operohet nga <strong>{LEGAL_ENTITY.name}</strong>, shoqëri e regjistruar në Republikën e Kosovës, NUI/NRB {LEGAL_ENTITY.nui}, me adresë {LEGAL_ADDRESS}. Kontakt: <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a>, tel. <a href={`tel:${LEGAL_ENTITY.phone}`}>{LEGAL_ENTITY.phone}</a>.</p>
        <p>Këto kushte rregullojnë llogarinë, veglat AI, planet, kreditet dhe komunitetin. Duke i pranuar gjatë regjistrimit ose porosisë, lidhni marrëveshje me operatorin. Ato plotësohen nga <Link href="/legal/fair-use">Përdorimi i drejtë</Link> dhe <Link href="/legal/refund">Politika e Rimbursimit</Link>. <Link href="/legal/privacy">Privatësia</Link> dhe <Link href="/legal/cookies">Cookies</Link> shpjegojnë përpunimin e të dhënave; leximi i tyre nuk është pëlqim i përgjithshëm për marketing ose përpunim opsional.</p>
        <p>Konsumator është personi fizik që blen jashtë veprimtarisë së vet tregtare ose profesionale. Të drejtat e detyrueshme të konsumatorit kanë përparësi ndaj këtyre kushteve. Për maroBiz mund të zbatohen edhe kushte të posaçme të pranuara me shkrim.</p>
      </LegalSection>
      <LegalSection title="2. Shërbimet e Maro-s">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>maro Web:</strong> krijim dhe redaktim faqesh me AI, bisedë për ndryshime, editor vizual, shikim paraprak dhe eksport të kodit sipas formatit të ofruar. Hostimin dhe publikimin e website-it të eksportuar i organizoni veçmas. Shikimi paraprak brenda Maro-s nuk është hostim publik.</li>
          <li><strong>maroLogo dhe maro Imazh:</strong> gjenerim e përpunim logosh, imazhesh, reklamash dhe variantesh, përfshirë përdorimin e referencave që ngarkoni.</li>
          <li><strong>Workspaces dhe maroBrain:</strong> organizim sipas biznesit ose projektit; profil i brendit, audiencës, objektivave, tregut, stilit dhe burimeve që mund të përdoren si kontekst për gjenerimet.</li>
          <li><strong>maroPresets dhe cilësimet e avancuara:</strong> modele të gatshme dhe përshtatje e kërkesës. Përdorimi i një preset-i nuk përfshin blerjen ose zbulimin e udhëzimeve të brendshme të sistemit.</li>
          <li><strong>Explore:</strong> publikim vullnetar i krijimeve, pëlqime, ndarje dhe remix sipas funksioneve të aktivizuara. Llogaria përfshin edhe historikun, faturimin, njoftimet dhe mbështetjen.</li>
        </ul>
        <p>Veglat e shënuara “së shpejti”, përfshirë maro Filma dhe maro Audio kur paraqiten kështu, nuk janë pjesë e shërbimit të disponueshëm. Demonstrimet dhe funksionet eksperimentale nuk premtojnë datë lansimi. Kur audio aktivizohet, funksionet mund të përfshijnë tekst në zë, muzikë, efekte, ndryshim zëri, izolim dhe transkriptim sipas ofertës konkrete.</p>
      </LegalSection>
      <LegalSection title="3. Llogaria dhe autorizimi">
        <p>Duhet të jeni të paktën 18 vjeç dhe të keni aftësi për të lidhur kontratë. Për përdorim në emër të biznesit ose klientit duhet të keni autorizimin e nevojshëm. Jepni të dhëna të sakta dhe mbrojeni qasjen në llogari.</p>
        <p>Mos ndani fjalëkalime, kode verifikimi ose çelësa qasjeje. Na njoftoni për qasje të dyshimtë. Përgjegjësia për veprimet e paautorizuara vlerësohet sipas rrethanave dhe ligjit; nuk ju ngarkohet automatikisht çdo incident sigurie.</p>
      </LegalSection>
      <LegalSection title="4. Planet, afati dhe rinovimi">
        <p>Oferta përfshin maroStandard, maroPro dhe maroBiz sipas marrëveshjes. Çmimi, kreditet, kohëzgjatja, numri i Workspaces dhe gjenerimet e lejuara njëkohësisht shfaqen te <Link href="/pricing">Planet &amp; Kreditet</Link> dhe në porosi. Detajet e ruajtura për porosinë tuaj vlejnë për atë blerje; ndryshimet e mëvonshme në katalog nuk e ndryshojnë prapa në kohë.</p>
        <p>Standard dhe Pro aktualisht kanë periudhë të kufizuar dhe rinovim manual. Afatin dhe mundësinë e rinovimit i shihni në llogari. Rinovimi manual nuk ju ngarkon automatikisht për periudhën tjetër. Për kalim nga Standard në Pro, diferenca e çmimit, kreditet shtesë dhe afati shfaqen para porosisë.</p>
        <p>Afati i planit dhe balanca e krediteve janë të ndara. Kreditet e blera nuk skadojnë vetëm pse përfundon plani. Pas skadimit ndryshojnë përfitimet dhe kufijtë e planit; rimbushja kërkon plan aktiv. Bonuset mund të kenë afat ose kufizime të shpjeguara kur jepen. Cilësimet e avancuara nuk krijojnë vetvetiu abonim të veçantë ose provë falas.</p>
      </LegalSection>
      <LegalSection title="5. Porositë, pagesat dhe kreditet">
        <p>Para konfirmimit kontrolloni produktin, të dhënat e faturimit, çmimin përfundimtar në EUR, tatimet e zbatueshme dhe zbritjen eventuale. Metodat reale të pagesës dhe disponueshmëria e tyre shfaqen gjatë blerjes. Kur ofrohet pagesa me kartë përmes Raiffeisen Bank Kosova, të dhënat e kartës jepen në faqen e sigurt të bankës/procesorit. Maro nuk kërkon ruajtjen e numrit të plotë të kartës ose CVV-së.</p>
        <p>Krijimi i porosisë ose faqja e kthimit nuk dëshmon pagesë të suksesshme. Kreditet dhe përfitimet aktivizohen pas konfirmimit të vlefshëm të pagesës. Mjedisi i shënuar si test nuk kryen blerje reale. Faturat dhe gjendjen e porosive i kontrolloni në llogari.</p>
        <p>Kostoja AI varet nga vegla, modeli, cilësia, sasia, shpejtësia dhe cilësimet e zgjedhura. Kreditet mund të rezervohen ose zbriten gjatë përpunimit; pjesa e rezervuar përkohësisht nuk është e disponueshme për veprime të tjera. Për dështime dhe ngarkesa të gabuara zbatohet <Link href="/legal/refund">Politika e Rimbursimit</Link>.</p>
        <p>Kreditet janë njësi përdorimi të Maro-s, jo depozitë bankare, valutë ose instrument investimi. Nuk transferohen ose këmbehen lirisht për para. Kjo nuk kufizon rimbursimet që garanton ligji.</p>
      </LegalSection>
      <LegalSection title="6. Materialet tuaja dhe rezultatet AI">
        <p>Ruani të drejtat që keni mbi tekstet, fotografitë, logot, regjistrimet, burimet e maroBrain dhe materialet që ngarkoni. Duhet të keni të drejtat, lejet dhe bazën ligjore për përdorimin e tyre, përfshirë pamjen, zërin dhe të dhënat e personave të tjerë.</p>
        <p>Na jepni licencë joekskluzive, të kufizuar në ofrimin e funksionit të kërkuar, për t’i ruajtur, përpunuar, përshtatur dhe dërguar materialet te ofruesit përkatës. Publikimi bëhet sipas zgjedhjes suaj dhe pikës 7. Kjo licencë nuk na jep të drejtë të shesim materialet private ose t’i përdorim në reklama pa leje të veçantë.</p>
        <p>Rezultatet mund t’i përdorni personalisht ose komercialisht, përfshirë punën për klientë, në masën që e lejojnë ligji dhe të drejtat e palëve të treta. AI mund të prodhojë rezultate të ngjashme për persona të ndryshëm. Nuk premtojmë ekskluzivitet, mbrojtje automatike nga e drejta e autorit ose mundësi regjistrimi të logos si markë. Licencat për fonte, fotografi, biblioteka dhe elemente të jashtme vazhdojnë të zbatohen.</p>
        <p>Marka Maro, softueri, dizajni i platformës, preset-et dhe udhëzimet e brendshme mbeten pronë e operatorit ose licencuesve të tij. Ju lejohet përdorimi i platformës sipas këtyre kushteve; kjo nuk transferon pronësinë mbi vetë platformën.</p>
      </LegalSection>
      <LegalSection title="7. Explore, ndarja dhe remix">
        <p>Kur zgjidhni publikimin në Explore, krijimi, emri i autorit, teksti/prompti që bashkëngjitni dhe të dhënat e ndërveprimit mund të bëhen publike. Materiali mund të shihet, ndahet, kopjohet dhe përdoret për remix përmes platformës. Kontrollojeni para publikimit dhe hiqni sekretet e biznesit e të dhënat personale që nuk doni t’i publikoni.</p>
        <p>Publikimi na lejon ta shfaqim krijimin brenda Explore dhe të mundësojmë ndarjen e remix-in. Nuk transferon pronësinë e të gjitha materialeve tuaja dhe nuk jep licencë të pakufizuar mbi markat ose imazhet e personave. Për heqje përdorni funksionin përkatës, kur ofrohet, ose kontaktoni mbështetjen me lidhjen e krijimit. Kopjet e shkarkuara nga të tjerët dhe ruajtja nga motorët e kërkimit mund të mbeten jashtë kontrollit tonë.</p>
      </LegalSection>
      <LegalSection title="8. Promocione, kreatorë dhe gara">
        <p>Kodet e zbritjes, referimet dhe bonuset vlejnë sipas kushteve e afatit të ofertës. Aplikimi si kreator nuk është pranim automatik. Komisionet, pagesat, tatimet dhe kriteret përcaktohen në marrëveshjen përkatëse; shifrat e vlerësuara në panel nuk janë garanci pagese.</p>
        <p>Garat, kur hapen, kanë rregulla për pjesëmarrjen, afatin, vlerësimin, çmimet dhe përdorimin e krijimeve. Ndalohet manipulimi i referimeve, porosive, votave dhe pëlqimeve. Rimbursimi i porosisë mund të korrigjojë bonusin ose komisionin përkatës.</p>
      </LegalSection>
      <LegalSection title="9. Siguria, kufizimet dhe pezullimi">
        <p>Respektoni <Link href="/legal/fair-use">Përdorimin e drejtë</Link>. Ndalohet shkelja e ligjit, abuzimi me të dhënat, mashtrimi, përmbajtja shfrytëzuese, sulmet teknike dhe anashkalimi i pagesave ose kufijve. Qasjen në shërbim nuk mund ta rishisni si platformë tuajën pa marrëveshje; mund të shisni punën tuaj të krijuar ligjërisht me Maro.</p>
        <p>Mund të kufizojmë një veprim, heqim përmbajtje ose pezullojmë llogarinë për arsye të bazuara sigurie, shkelje ose detyrim ligjor. Masa duhet të jetë proporcionale. Ju njoftojmë për arsyen dhe mundësinë e rishikimit, përveç kur ligji ose siguria e hetimit e pengon. Pezullimi nuk konfiskon automatikisht çdo pagesë ose të drejtë rimbursimi.</p>
      </LegalSection>
      <LegalSection title="10. Cilësia dhe përgjegjësia">
        <p>Kontrolloni saktësinë, sigurinë, të drejtat dhe përshtatshmërinë e rezultateve para përdorimit. Kodi i gjeneruar mund të kërkojë testim dhe konfigurim shtesë. Përmbajtja AI nuk zëvendëson vlerësimin profesional kur nevojitet.</p>
        <p>Mund të ketë ndërprerje, mirëmbajtje ose kufizime të ofruesve. Nuk garantojmë rezultat krijues të caktuar ose funksionim pa ndërprerje, por duhet të ofrojmë shërbimin e blerë sipas marrëveshjes. Asgjë këtu nuk përjashton përgjegjësi që ligji nuk lejon të përjashtohet, përfshirë mashtrimin, dashjen, pakujdesinë e rëndë dhe të drejtat e detyrueshme të konsumatorit.</p>
      </LegalSection>
      <LegalSection title="11. Mbyllja dhe ndryshimet">
        <p>Mund të ndaloni përdorimin ose të kërkoni mbylljen e llogarisë në {LEGAL_ENTITY.supportEmail}. Eksportoni materialet e nevojshme para mbylljes. Fshirja, ruajtja e detyrueshme dhe rimbursimi trajtohen sipas politikave përkatëse. Nëse ndërpresim përfundimisht një shërbim të paguar, ju njoftojmë dhe trajtojmë pjesën e papërmbushur sipas ligjit.</p>
        <p>Data e versionit shfaqet në këtë faqe. Për ndryshime thelbësore ju njoftojmë para zbatimit në platformë ose me email, përveç masave urgjente ligjore ose të sigurisë. Ndryshimet nuk heqin të drejta të fituara nga blerjet ekzistuese. Kur nevojitet pëlqim ose marrëveshje e re, vazhdimi i shfletimit nuk e zëvendëson atë.</p>
      </LegalSection>
      <LegalSection title="12. Ligji i Kosovës dhe mosmarrëveshjet">
        <p>Zbatohet ligji i Republikës së Kosovës, përfshirë <a href={LEGAL_SOURCES.consumer}>Ligjin nr. 06/L-034 për Mbrojtjen e Konsumatorit</a>, me ndryshimet në fuqi, dhe dispozitat në fuqi të <a href={LEGAL_SOURCES.electronicServices}>Ligjit nr. 04/L-094 për Shërbimet e Shoqërisë Informatike</a>. Domeni .al nuk e ndryshon vendin e regjistrimit të operatorit ose ligjin e zgjedhur.</p>
        <p>Ankesat dërgohen në {LEGAL_ENTITY.contactEmail} ose në adresën tonë. Për ankesat e konsumatorëve japim përgjigje me shkrim pa vonesë, jo më vonë se 15 ditë nga pranimi. Mund t’i drejtoheni edhe <a href={LEGAL_SOURCES.consumerAuthority}>Departamentit për Mbrojtjen e Konsumatorit</a> ose gjykatës kompetente në Kosovë, pa detyrim për ta përfunduar procedurën tonë të brendshme. Për përdoruesit jashtë Kosovës ruhen mbrojtjet dhe kompetencat gjyqësore të detyrueshme që zbatohen për ta.</p>
      </LegalSection>
    </LegalLayout>
  );
}
