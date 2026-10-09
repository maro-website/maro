import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_ADDRESS, LEGAL_ENTITY, LEGAL_SOURCES } from "@/components/legal/legal-config";
import Link from "next/link";

export const metadata = { title: "Politika e Cookies · maro" };

export default function CookiesPage() {
  return (
    <LegalLayout title="Politika e Cookies" current="Politika e Cookies">
      <LegalSection title="1. Operatori dhe kuptimi i ruajtjes në pajisje">
        <p>Kjo politikë shpjegon përdorimin e cookies dhe ruajtjes së ngjashme nga {LEGAL_ENTITY.name}, NUI/NRB {LEGAL_ENTITY.nui}, {LEGAL_ADDRESS}, gjatë përdorimit të maro.al. Për të dhënat personale zbatohet <a href={LEGAL_SOURCES.privacy}>Ligji nr. 06/L-082 i Republikës së Kosovës</a> dhe <Link href="/legal/privacy">Politika e Privatësisë</Link>.</p>
        <p>Cookies janë vlera që shfletuesi mund t’ia dërgojë automatikisht serverit. Ruajtja lokale (localStorage) mban të dhëna në pajisje edhe pas mbylljes së shfletuesit; ruajtja e sesionit (sessionStorage) lidhet me skedën/sesionin. Aplikacioni mund t’i lexojë këto të dhëna për të realizuar funksionin e kërkuar. Kjo politikë i përfshin të tria.</p>
      </LegalSection>
      <LegalSection title="2. Autentifikimi dhe siguria">
        <p>Supabase përdor cookies të formës <code>sb-…-auth-token</code> dhe pjesët e tyre për sesionin. Cookies me prapashtesën <code>code-verifier</code> mund të përdoren për verifikimin e hyrjes ose rikuperimit. Ato nevojiten për të njohur përdoruesin dhe për të mbrojtur rrjedhën e autentifikimit.</p>
        <p>Cookies e autentifikimit mund të jenë të qëndrueshme. Biblioteka aktuale përdor afat maksimal deri në 400 ditë për cookie, por vlefshmëria e sesionit, rifreskimi, dalja nga llogaria dhe pastrimi nga shfletuesi mund ta shkurtojnë këtë. Afati i cookie-t nuk është garanci se mbeteni të kyçur për gjithë atë periudhë. Verifikuesit e përkohshëm pastrohen gjatë përfundimit të rrjedhës përkatëse.</p>
        <p>Cloudflare dhe ofruesit e infrastrukturës mund të përdorin mekanizma sigurie sipas konfigurimit dhe kontrolleve kundër abuzimit që aktivizohen gjatë vizitës. Bllokimi i mekanizmave të domosdoshëm mund të pengojë hyrjen ose qasjen në shërbim.</p>
      </LegalSection>
      <LegalSection title="3. Projektet, Workspaces dhe maroBrain">
        <ul className="list-disc space-y-2 pl-5">
          <li><code>maro:v1:projects:…</code> dhe <code>maro:v1:creations:…</code>: projektet dhe krijimet e organizuara sipas Workspace-it; mund të mbeten edhe emërtime të vjetra pa prapashtesë.</li>
          <li><code>maro:workspaces:…</code> dhe <code>maro:activeWorkspace:…</code>: lista lokale dhe hapësira aktive e punës.</li>
          <li><code>maro:ws-brain:…</code> dhe <code>maro:ws-sources:…</code>: profili i brendit dhe burimet e tij për funksionet e maroBrain.</li>
          <li><code>maro:v1:tool-selections</code> dhe <code>maro:v1:fort-values</code>: cilësimet e veglave dhe parametrat e avancuar të zgjedhur.</li>
          <li><code>maro.theme</code> dhe të dhënat lokale të njoftimeve: pamja e ndërfaqes dhe gjendja e njoftimeve.</li>
        </ul>
        <p>Kjo ruajtje shërben për funksionet që përdorni dhe vazhdimësinë e punës. Të dhënat lokale zakonisht mbeten derisa t’i zëvendësojë/fshijë aplikacioni ose t’i pastroni ju. Disa të dhëna sinkronizohen edhe me serverin; disa mund të ekzistojnë vetëm në pajisjen tuaj. Ruajtja në pajisje nuk do të thotë se informacioni nuk dërgohet kurrë në server, për shembull kur kërkoni një gjenerim me kontekstin e maroBrain.</p>
        <p>Eksportoni punën para pastrimit të të dhënave të faqes. Dalja nga llogaria nuk garanton fshirjen e çdo projekti ose materiali lokal. Në pajisje të përbashkëta përdorni profil të veçantë shfletuesi dhe pastroni të dhënat kur përfundoni.</p>
      </LegalSection>
      <LegalSection title="4. Ruajtja e përkohshme dhe njoftimi">
        <p>Ruajtja e sesionit përdoret për bartjen e draftit nga Hub-i, bashkëngjitjen e preset-it, kalimin e referencave vizuale dhe remix-in ndërmjet faqeve. Shembuj janë <code>maro:hubdraft</code> dhe <code>maro:remix</code>. Vlerat mund të hiqen pasi përdoren ose kur përfundon sesioni i skedës; rikthimi i sesionit nga shfletuesi mund t’i rikthejë.</p>
        <p><code>maro.cookies.notice.v2</code> ruan vetëm faktin se e keni mbyllur njoftimin informues. Butoni “E kuptova” nuk jep pëlqim për marketing, analitikë opsionale ose kushte të reja. Kur dilni nga llogaria pastrohen cache-i i historikut dhe draftet krijuese të përkohshme, përfshirë referencat lokale të logos. Projektet lokale të website-ve dhe preferencat e pamjes ruhen në pajisje. Ky shënim mbetet derisa ta pastroni ose të ndryshojë versioni i njoftimit. Shënimi i vjetër <code>maro.cookies.accepted</code> nuk përdoret si pëlqim për qëllime të reja.</p>
      </LegalSection>
      <LegalSection title="5. Statistikat, referimet dhe reklamat">
        <p>Platforma mban statistika të veta për funksionet e përdorura, gjenerimet, shikimin/kopjimin e materialeve të gatshme, pëlqimet dhe kodet e referimit. Disa ngjarje mund të lidhen me identifikuesin e llogarisë kur jeni të kyçur. Ato janë përpunim në server dhe përshkruhen në Politikën e Privatësisë; nuk bëhen anonime vetëm sepse nuk përdorin një cookie të veçantë analitike.</p>
        <p>Në këtë version Maro nuk integron skripte Google Analytics ose Meta Pixel përmes aplikacionit. Panelet me reklama në hyrje shfaqin materialin dhe lidhjen e reklamuesit; klikimi ju çon në faqen e jashtme, e cila ka mekanizmat dhe politikën e vet.</p>
        <p>Nëse shtojmë teknologji opsionale për matje ose reklamim në pajisje, do të shpjegojmë qëllimin, marrësit dhe afatin dhe do të kërkojmë pëlqim paraprak kur kërkohet. Refuzimi dhe tërheqja duhet të jenë po aq të lehta sa pranimi. Shfletimi ose mbyllja e këtij njoftimi nuk e jep atë pëlqim.</p>
      </LegalSection>
      <LegalSection title="6. Shërbimet e jashtme dhe website-et e eksportuara">
        <p>Kur hapni faqen e bankës për pagesë, një lidhje të jashtme, përmbajtje të integruar ose një burim të jashtëm në shikimin paraprak të website-it, ai shërbim mund të marrë të dhëna teknike dhe të përdorë cookies sipas funksionit të vet. Kjo varet nga faqja që hapni dhe nga kufizimet e shfletuesit.</p>
        <p>Kjo politikë mbulon Maro-n. Nëse eksportoni dhe publikoni një website që përmban analitikë, formularë, video ose shërbime të tjera, operatori i atij website-i duhet t’i konfigurojë njoftimet dhe pëlqimet sipas përpunimit që bën vetë.</p>
      </LegalSection>
      <LegalSection title="7. Si e kontrolloni ruajtjen">
        <p>Në cilësimet e shfletuesit mund të shihni, bllokoni ose fshini cookies dhe të dhënat e faqes për maro.al dhe nën-domenin që përdorni. Fshirja e shënimit të njoftimit e shfaq sërish atë. Bllokimi i ruajtjes së autentifikimit mund t’ju nxjerrë nga llogaria; pastrimi i projekteve lokale mund të humbë punën e pasinkronizuar.</p>
        <p>Fshirja në pajisje nuk fshin automatikisht të dhënat në server. Për qasje, fshirje ose kundërshtim të përpunimit na shkruani në <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a>. Mund t’i drejtoheni edhe <a href={LEGAL_SOURCES.privacyAuthority}>Agjencisë për Informim dhe Privatësi të Kosovës</a>.</p>
      </LegalSection>
    </LegalLayout>
  );
}
