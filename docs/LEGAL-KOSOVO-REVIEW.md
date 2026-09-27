# Rishikimi i faqeve ligjore të Maro-s — Kosovë

Data: 15 shtator 2026.

## Rezultati

U rishkruan të pesë faqet ligjore pas krahasimit me versionin publik dhe kodin e produktit. Pronari konfirmoi: NICE Creative Agency SH.P.K., NUI/NRB 810070821, Rr. “Magjistralja Komoran - Caralevë”, Gllogoc, Kosovë, info@maro.al, +38349593777.

| Faqja | Korrigjimet kryesore |
| --- | --- |
| Përdorimi i drejtë | Workspaces, Brain, referencat, Explore/remix, integrimet e autorizuara, abuzimi me kredite, raportimi, rishikimi proporcional. |
| Kushtet | Operatori dhe ligji i Kosovës; eksporti pa premtim hostimi; planet me afat e rinovim manual; rimbushje, upgrade, pronësi, të drejta mbi output, funksione të ardhshme, kreatorë dhe gara. |
| Privatësia | Ligji 06/L-082 dhe AIP; të dhënat sipas funksionit; bazat ligjore; marrësit AI/infrastrukturë/email/pagesa; konteksti Brain; publikimi i promptit në Explore; ruajtja lokale; afatet e kërkesave; transferimet sipas Kosovës. |
| Rimbursimi | Ligji 06/L-034; 14 ditë kalendarike; dallimi shërbim/përmbajtje digjitale; kërkesat për pëlqim të posaçëm; pa humbje automatike pas një krediti; kthimi brenda 14 ditëve nga njoftimi; ankesat brenda 15 ditëve; model deklarimi. |
| Cookies | Inventari real i autentifikimit, localStorage dhe sessionStorage; statistikat e serverit; paneli i reklamës; shërbimet e jashtme; pastrimi i pajisjes. |

Njoftimi i cookies tani është informues, me “E kuptova”. Kodi i mëparshëm ruante “Refuzoj”, por e rihapte njoftimin dhe nuk kontrollonte kategori opsionale. Çelësi i ri `maro.cookies.notice.v2` ruan vetëm mbylljen; nuk migron zgjedhjet e vjetra si pëlqim të ri. Pranimi i kushteve/rimbursimit u nda në formulim nga leximi i privatësisë.

## Burimet zyrtare të konsultuara

- [06/L-082, mbrojtja e të dhënave personale](https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=18616): bazat, transparenca, të drejtat; neni 11 për përgjigjen brenda një muaji dhe zgjatjen; nenet 44–49 për transferimet.
- [06/L-034, mbrojtja e konsumatorit](https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=16551): nenet 39–49 për kontratat në distancë/tërheqjen; nenet 115–116 për ankesat.
- [Regjistri i ndryshimeve të 06/L-034](https://gzk.rks-gov.net/ActDetail.aspx?ActID=16551): liston 08/L-176; politikat referohen te ligji me ndryshimet në fuqi. Teksti i plotë i ndryshimit nuk u kthye nga lexuesi publik gjatë kontrollit.
- [04/L-094, shërbimet e shoqërisë informatike](https://gzk.rks-gov.net/ActDetail.aspx?ActID=2811): regjistri shënon shfuqizim të pjesshëm nga 08/L-022 dhe ndryshim nga 08/L-283. Referenca në kushtet kufizohet te dispozitat në fuqi.
- [04/L-077, marrëdhëniet e detyrimeve](https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=2828).
- [08/L-205, e drejta e autorit](https://gzk.rks-gov.net/ActDetail.aspx?ActID=83132) dhe [08/L-075, markat tregtare](https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=60331): të drejtat e palëve të treta; nuk jepet garanci se një output AI është ekskluziv ose markë e regjistrueshme.
- [Agjencia për Informim dhe Privatësi](https://aip.rks-gov.net/).
- [Portali i mbrojtjes së konsumatorit](https://konsumatori.rks-gov.net/): gjatë kontrollit ridrejtonte në cons.rks-gov.net dhe shfaqte rikonstruktim. Portali nuk është mënyra e vetme për ankesë.

## Lidhja me implementimin

| Sjellja | Evidenca në kod |
| --- | --- |
| Katalog dinamik, afat plani, rinovim manual, upgrade dhe top-up | `src/lib/commerce/plans.ts`, `memberships.ts`, `entitlements.ts`, `src/lib/payments/orders.ts`, `src/lib/credits/money.ts` |
| Eksport, pa hostim të website-ve | `src/components/editor/PublishModal.tsx` |
| Filma/Audio shënohen së shpejti; MCP është faqe paraprake në këtë version | `src/lib/tools/registry.ts`, `src/app/mcp/page.tsx` |
| Brain dhe burime si kontekst; ruajtje në pajisje dhe server | `src/lib/workspaces/brainTypes.ts`, `brainService.ts`, `src/lib/engine/brainLoader.ts`, `src/lib/storage/local.ts` |
| Explore publikon kopje, prompt dhe autor; emri mund të dalë nga emaili | `src/app/api/explore/route.ts`, `src/lib/storage/assets.ts` |
| Preset reveal është hequr | `src/lib/presets/policy.ts`, `src/app/api/prompts/reveal/route.ts` |
| Statistikë e palës së parë, jo vetëm të dhëna anonime | `src/app/api/track/route.ts`, `src/app/api/promo/track/route.ts`, `src/lib/events/productEvents.ts` |
| Resend për email; ElevenLabs vetëm sipas funksionit | `src/lib/email/provider/resend.ts`, `src/app/api/ai/audio/route.ts` |
| Pagesa reale bankare ende e padisponueshme në rrjedhën aktuale | `src/app/pay/redirect/page.tsx`, `PayRedirectUnavailableClient.tsx`; politikat përdorin formulim kushtor, jo pretendim se gateway është live. |
| Retention i pjesshëm | `src/lib/operations/retention.ts`, migrimet 0025/0026/0036: nuk provojnë fshirje automatike të gjithë përmbajtjes ose të backup-eve. |

## Çështje që duhet të verifikojë operatori

Këto nuk zgjidhen vetëm me tekstin e një politike dhe nuk janë certifikuar nga ky rishikim:

1. **Transferimet dhe marrëveshjet me ofruesit.** Verifikoni rajonin real, nën-përpunuesit, marrëveshjet e përpunimit, përdorimin për trajnim dhe bazën e çdo transferimi. Sipas neneve 44–49, një SCC i BE-së nuk e zëvendëson automatikisht autorizimin e AIP-së kur ai kërkohet. Mos paraqitni në politikë se të gjitha marrëveshjet/autorizimet ekzistojnë pa i kontrolluar.
2. **Ruajtja dhe fshirja.** Përcaktoni afatet reale për kategori, detyrimet kontabël/tatimore, backup-et, ofruesit dhe procedurën e fshirjes. Faqja përdor kritere ruajtjeje dhe kontakt manual; nuk premton fshirje të menjëhershme ose afate automatike të paverifikuara.
3. **Blerjet dhe tërheqja.** Checkbox-i i përgjithshëm ekzistues nuk është pëlqim i posaçëm për fillim të menjëhershëm dhe humbje të së drejtës. Pa pëlqimin/konfirmimin e nevojshëm, mos refuzoni tërheqjen ose mos zbritni automatikisht kostot vetëm pse janë përdorur kredite. Politika e re e thotë shprehimisht këtë. Para aktivizimit të pagesave, verifikoni klasifikimin e produktit dhe konfirmimin e kontratës në mjet të qëndrueshëm.
4. **Njoftimi i përdoruesve ekzistues.** Publikimi i tekstit nuk dërgon email dhe nuk provon pranimin e një versioni të ri. Duhet procedurë njoftimi për ndryshime materiale dhe evidencë e versionit të kushteve për kontratat e ardhshme. Në këtë punë nuk u dërguan mesazhe te përdoruesit.
5. **Marketingu dhe teknologjitë opsionale.** Njoftimi informues është i përshtatshëm për ruajtjen e përshkruar në këtë version; nuk është menaxhues pëlqimi për skripte të ardhshme. Kontrolloni edhe konfigurimet jashtë kodit (p.sh. injektim skriptesh në CDN) para aktivizimit të matjes/reklamimit opsional.

## Verifikimi dhe publikimi

- Kontrolli TypeScript dhe build-i i plotë kaluan. Mbetet vetëm paralajmërimi ekzistues i React Hook te `src/components/app/cards.tsx:491`, jashtë këtij ndryshimi.
- U krijua paketë e veçuar nga burimi i publikimit të mëparshëm `.security-deploy-20260915`, me vetëm 9 skedarët ligjorë të përditësuar, në `.legal-deploy-20260915`. Nuk përfshin `.env` ose ndryshime të tjera të papublikuara.
- Paketa e saktë e publikimit kaloi build-in.
- Të pesë rrugët kthyen HTTP 200, datën e re dhe përmbajtjen e re; referencat e gabuara ndaj Shqipërisë nuk u gjetën.
- Në shfletues u verifikua paraqitja desktop dhe 390 px, pa tejkalim horizontal në të pesë faqet. Mbyllja e njoftimit të cookies mbetet pas rifreskimit.
- Kontrolli i parë në serverin e dosjes së punës u prek nga shkrimi paralel i cache-it `.next` prej një procesi tjetër; verifikimi përfundimtar u bë në paketën e izoluar.

### Statusi i deploy-it

Publikimi në Railway u bllokua nga kontrolli automatik i miratimit më 15 shtator 2026, përpara ekzekutimit. Arsyeja: kërkesa autorizon përmbajtjen ligjore, por kontrolli kërkon autorizim të shprehur për deploy në shërbimin e përbashkët live. Nuk u bë deploy dhe nuk u provua rrugë alternative.

Paketa gati për miratim: `C:/Users/nicep/Desktop/maro-al/.legal-deploy-20260915`, vetëm 9 skedarë të ndryshuar kundrejt burimit të publikimit aktiv `a60e9103-6ba9-4b02-8cba-79edeb8c2f75`. Pamja lokale: `http://localhost:3017/legal/terms` (edhe katër faqet e tjera te `/legal/…`). Para një deploy-i të ardhshëm kontrolloni nëse versioni aktiv ka ndryshuar ndërkohë.

### Publikimi i autorizuar — përfunduar

Përdoruesi dha autorizim të shprehur (“e autorizoj”). Më 15 shtator 2026 u publikua me sukses në Railway: `287fe95c-d2ad-4f60-b05d-6afcf86b2eb8` — **SUCCESS**.

Burimi i publikimit është `C:/Users/nicep/Desktop/maro-al/.legal-release-20260915`: e njëjta përmbajtje e verifikuar si paketa `.legal-deploy-20260915`, pa varësitë dhe cache-in lokal të testimit. Publikimi i parë ndaloi gjatë indeksimit të një lidhjeje në node_modules, para ngarkimit; paketa e pastër u ngarkua dhe kaloi build-in.

Kontrolli live i të pesë faqeve në `https://www.maro.al/legal/…` konfirmoi HTTP 200, datën “15 Shtator 2026”, përmbajtjen e re dhe mungesën e referencave të vjetra ndaj ligjit/autoritetit të Shqipërisë. Statusi i bllokuar më sipër është historik dhe është zgjidhur me autorizimin e përdoruesit. Çështjet organizative të listuara për verifikim mbeten siç janë.
