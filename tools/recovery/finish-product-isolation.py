from pathlib import Path
import json, re, shutil, hashlib

ROOT = Path(__file__).resolve().parents[2]
Q = ROOT / 'quarantine/20260930'
records = json.loads((Q / 'PROVENANCE.json').read_text(encoding='utf-8'))
def read(path): return (ROOT / path).read_text(encoding='utf-8')
def write(path, data):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data, encoding='utf-8', newline='\n')
def preserve(path, group):
    src = (ROOT / path).resolve(); dst = (Q / group / path).resolve()
    assert src.is_relative_to(ROOT) and dst.is_relative_to(Q)
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dst)
        # Additional preserved originals supplement the earlier source manifest.
        additions.append({'source': str(src), 'target': str(dst), 'sha256': hashlib.sha256(src.read_bytes()).hexdigest()})
additions = []

p='src/components/marologo/MaroLogoWizard.tsx'; s=read(p)
s=re.sub(r'^import .*?(?:lib/fort/|lib/tools/selections|lib/hooks/useSettings).*?;\n', '', s, flags=re.M)
s=re.sub(r'^  const \[(?:fortActive|fortModalOpen|fortValues).*?\n', '', s, flags=re.M)
s=s.replace('credits, hasFort, spendCredits', 'credits, spendCredits')
s=re.sub(r'^  const \{ fortConfig \}.*?\n', '', s, flags=re.M)
a=s.index('  const fortAvailable ='); b=s.index('  React.useEffect', s.index('  }, [fortConfig]);', a))
s=s[:a]+s[b:]
s=s.replace('const fort = fortAvailable && fortActive && hasFort ? { enabled: true, values: fortValues } : undefined;', 'const fort = undefined;')
s=s.replace('fortAvailable, fortActive, hasFort, fortValues, ', '')
s=re.sub(r'^  const (?:openFort|saveFort|clearFort) = .*?\n', '', s, flags=re.M)
s=s.replace(' fortAvailable={fortAvailable} fortActive={fortActive} hasFort={hasFort}', '').replace(' onOpenFort={openFort}', '')
write(p,s)
p='src/components/marologo/steps/StepPresentation.tsx'; preserve(p,'fort-ui-original'); s=read(p)
s=s.replace('import { Flame, Sparkles } from "lucide-react";\n', '')
s=s.replace('fortAvailable, fortActive, hasFort, ', '').replace('onOpenFort, ', '')
s=re.sub(r'^  (?:fortAvailable|fortActive|hasFort|onOpenFort):.*?\n', '', s, flags=re.M)
s=re.sub(r'        \{fortAvailable && \(.*?        \)\}\n', '', s, flags=re.S); write(p,s)
p='src/components/app/PromptAccessoryRow.tsx'; s=read(p)
s=re.sub(r'import \{ MARO_FORT_ENABLED \}.*?\n', '', s)
s=s.replace('{ Switch, SwitchTrack }','{ SwitchTrack }').replace('{ BrainCircuit, Flame, Lock, X }','{ BrainCircuit, X }')
a=s.index('export function FortPill'); b=s.index('export function PresetPill'); s=s[:a]+s[b:]; write(p,s)
p='src/components/admin/legacy/LegacyAdminTabs.tsx'; preserve(p,'fort-admin-original'); s=read(p)
s=re.sub(r'^import .*?(?:lib/fort/|lib/shadow/maroFort).*?;\n', '', s, flags=re.M)
s=s.replace('  | "fort"\n','')
s=re.sub(r'^  \{ key: "fort".*?\n', '', s, flags=re.M)
s=re.sub(r'^        \{MARO_FORT_ENABLED && tab === "fort".*?\n', '', s, flags=re.M)
a=s.index('  const togglePlan ='); b=s.index('  React.useEffect',a); s=s[:a]+s[b:]
s=re.sub(r'^              \{MARO_FORT_ENABLED && <th.*?\n', '', s, flags=re.M)
s=re.sub(r'                \{MARO_FORT_ENABLED && <td.*?</td>\}\n', '', s, flags=re.S)
a=s.index('// ---- maroFort configuration ----'); b=s.index('// ---- Raporto (reports) ----',a); s=s[:a]+s[b:]; write(p,s)

write('src/lib/payments/legacy.ts', 'import "server-only";\n\n/** V1 recovery release policy: environment flags cannot reopen purchases. */\nexport function legacyPaymentsEnabled(): boolean {\n  return false;\n}\n')
write('src/components/modules/PurchasesUnavailable.tsx', '''import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";

export function PurchasesUnavailable() {
  return <AppShell showFooter><section className="mx-auto max-w-lg px-6 py-20 text-center">
    <h1 className="text-2xl font-bold text-ink">Blerjet nuk janë të disponueshme</h1>
    <p className="mt-4 text-ink-2">Planet dhe historiku ekzistues ruhen. Blerjet e reja janë të mbyllura për këtë version.</p>
    <Link className="mt-6 inline-block font-semibold text-ink underline" href="/account">Llogaria ime</Link>
  </section></AppShell>;
}
''')
for path in ['src/app/checkout/page.tsx','src/app/pay/test/page.tsx','src/app/pay/redirect/page.tsx','src/app/pay/paddle/page.tsx']:
    write(path, 'import { PurchasesUnavailable } from "@/components/modules/PurchasesUnavailable";\nexport default PurchasesUnavailable;\n')
for path in ['src/app/api/payments/paddle/checkout/route.ts','src/app/api/payments/paddle/portal/route.ts']:
    write(path, 'import { NextResponse } from "next/server";\nexport async function POST() { return NextResponse.json({ error: "purchases_unavailable" }, { status: 404 }); }\n')
p='src/app/api/commerce/checkout-preview/route.ts'; preserve(p,'legacy-product-flow')
write(p,'import { NextResponse } from "next/server";\nexport async function GET() { return NextResponse.json({ error: "purchases_unavailable" }, { status: 404 }); }\n')
p='src/app/pricing/page.tsx'; preserve(p,'legacy-product-flow'); s=read(p)
s=s.replace('import { Button } from "@/components/ui/Button";\n','').replace('import { useMaro } from "@/context/store";\n','')
s=s.replace('  const { user, ready } = useMaro();\n','')
a=s.index('  const [canTopUp'); b=s.index('  const initialTab',a); s=s[:a]+s[b:]
a=s.index('  React.useEffect(() => {\n    if (!user)'); b=s.index('  React.useEffect',a+10); s=s[:a]+s[b:]
a=s.index('  const promoParam'); b=s.index('  const plans',a); s=s[:a]+s[b:]
s=s.replace('Zgjidh planin tënd','Planet maro').replace('Plan 30-ditor. Pagesë njëherëshe, pa rinovim automatik. Kreditet nuk skadojnë.','Katalogu i planeve dhe krediteve. Blerjet e reja janë të mbyllura në këtë version; plani ekzistues shfaqet te llogaria.')
s=re.sub(r'                  \{plan.contactOnly \? \(.*?                  \)\}', '                  <p className="mt-8 text-[13px] text-ink-3">Blerjet janë të mbyllura.</p>',s,flags=re.S)
s=s.replace('const locked = !canTopUp;', 'const locked = false;')
s=re.sub(r'                    <Button.*?</Button>', '                    <p className="mt-5 text-[13px] text-ink-3">Blerjet janë të mbyllura.</p>',s,flags=re.S)
s=s.replace('Vlera bazë: €0,09/kredit · Blerja minimale €9 ·','Vlera bazë e katalogut: €0,09/kredit ·')
# Top-up access text must not suggest registration or activation will reopen it.
s=s.replace('!canTopUp', 'true').replace('canTopUp', 'false').replace('!user', 'true')
write(p,s)
p='src/components/account/BillingSection.tsx'; preserve(p,'legacy-product-flow'); s=read(p)
for line in ['import Link from "next/link";\n','import { useRouter } from "next/navigation";\n','import { Button } from "@/components/ui/Button";\n','import { formatEur } from "@/lib/credits/money";\n','  const router = useRouter();\n']: s=s.replace(line,'')
a=s.index('            <div className="mt-5'); b=s.index('            </div>',a)+len('            </div>'); s=s[:a]+s[b:]
s=re.sub(r'            <Button.*?</Button>', '', s, flags=re.S)
a=s.index('        {ent?.can_top_up ?'); b=s.index('\n      </section>',a); s=s[:a]+'        <p className="mt-4 text-[14px] text-ink-2">Blerjet e reja janë të mbyllura.</p>'+s[b:]; write(p,s)
p='src/components/app/BuyCreditsModal.tsx'; preserve(p,'legacy-product-flow'); s=read(p)
s=s.replace('Zgjidh një plan ose rimbush kredite për të vazhduar.', 'Blerjet e reja janë të mbyllura. Kontrollo kreditet dhe planin te llogaria.')
s=s.replace('router.push("/pricing")','router.push("/account")').replace('Shiko planet & kredite','Shiko llogarinë'); write(p,s)

for path in ['src/app/projects/[projectId]/editor/page.tsx', 'src/app/projects/[projectId]/generating/page.tsx']:
    write(path,'import { AppShell } from "@/components/app/AppShell";\nimport { ModuleComingSoon } from "@/components/modules/ModuleComingSoon";\nexport default function Page() { return <AppShell><ModuleComingSoon moduleId="web" /></AppShell>; }\n')
write('src/app/case-studies/page.tsx','import { AppShell } from "@/components/app/AppShell";\nimport { ModuleComingSoon } from "@/components/modules/ModuleComingSoon";\nexport default function Page() { return <AppShell><ModuleComingSoon moduleId="case_studies" /></AppShell>; }\n')
p='src/components/modules/ModuleComingSoon.tsx'; s=read(p).replace('Gjenerimi do të jetë i disponueshëm në atë version.', 'Ky modul nuk është i disponueshëm në V1.'); write(p,s)
p='src/lib/nav/destinations.ts'; s=read(p).replace('label: "maroAudio"','label: "maroZo"')
s=s.replace('  { id: "contests", label:', '  { id: "case_studies", label: "Case Studies", route: "/case-studies", group: "later", badge: "Së shpejti · V1.5", comingSoon: true },\n  { id: "contests", label:'); write(p,s)
for path in (ROOT/'src/components/hub-vision').glob('*.tsx'):
    write(str(path.relative_to(ROOT)),path.read_text(encoding='utf-8').replace('maroAudio','maroZo'))

# Light-only fallback is explicitly authorized; do not expose an incomplete dark switch.
p='src/context/theme.tsx'; s=read(p).replace('"mshelt"','"qelt"'); write(p,s)
p='security-headers.mjs'; s=read(p).replace("'mshelt'","'qelt'"); write(p,s)
# Retain lime surfaces; use a contrasting green for semantic text/icon accents.
p='maro-final-design-system/tokens/maro-final.css'; s=read(p).replace('--maro-color-text-brand: var(--maro-blue);','--maro-color-text-brand: #007a38;').replace('--maro-color-icon-brand: var(--maro-blue);','--maro-color-icon-brand: #007a38;'); write(p,s)
write('public/ui-release.json',json.dumps({'release':'v1-recovery-20260930','source':'Golden-1a1dfb9d-plus-selected-security-and-presentation','host':'local-review-only','web':'coming_soon-V1.5','case_studies':'coming_soon-V1.5','fort':'quarantined','purchases':'disabled','registration':'disabled','theme':'Qelt-light-only'},indent=2)+'\n')
p='.env.example'; s=read(p)
s=s.replace('# ---- maro v1: Paddle is the only public checkout; no provider fallback ----','# ---- Preserved Paddle backend compatibility; V1 purchases remain closed ----').replace('# Enable both flags after configuring the matching environment and catalog.','# Existing external configuration is preserved; these flags do not reopen V1 purchase routes.')
s+='\n# Registration remains closed until the final launch gate is explicitly approved.\nNEXT_PUBLIC_SIGNUP_ENABLED=false\n'; write(p,s)
p='vitest.setup.ts'; s=read(p).replace('"TURNSTILE_SECRET_KEY"','"TURNSTILE_SECRET_KEY", "PADDLE_SANDBOX_API_KEY", "PADDLE_LIVE_API_KEY", "PADDLE_WEBHOOK_SECRET", "PADDLE_PRODUCTION_DB_PASSWORD", "PADDLE_TEST_DATABASE_URL", "DATABASE_URL"'); write(p,s)
write('quarantine/20260930/ADDITIONAL_PROVENANCE.json',json.dumps(additions,indent=2)+'\n')
print(f'Preserved {len(additions)} additional originals; V1 product isolation written.')
