from pathlib import Path
import json, hashlib, re
root = Path(__file__).resolve().parents[2]
q = root / 'quarantine/20260930/non-v1-routes'
records = []
future = {'web':'web','filma':'filma','audio':'audio','marketing':'marketing'}
paths = list((root/'src/app/projects').rglob('page.tsx'))
paths += [root/f'src/app/{name}/page.tsx' for name in future]
# Public community/learning surfaces were not approved for this V1. Backend
# ownership, security and existing data/admin compatibility remain intact.
for folder in ['contests','kreator','academy']:
    paths += list((root/f'src/app/{folder}').rglob('page.tsx'))
for p in paths:
    rel=p.relative_to(root); dest=(q/rel).resolve()
    assert p.resolve().is_relative_to(root) and dest.is_relative_to(q)
    if not dest.exists():
        dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(p.read_bytes())
    records.append({'path':str(rel),'original_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'preserved':str(dest.relative_to(root))})
    mod = 'web' if str(rel).replace('\\','/').startswith('src/app/projects/') else future.get(p.parent.name)
    if mod:
        content=f'import {{ AppShell }} from "@/components/app/AppShell";\nimport {{ ModuleComingSoon }} from "@/components/modules/ModuleComingSoon";\nexport default function Page() {{ return <AppShell><ModuleComingSoon moduleId="{mod}" /></AppShell>; }}\n'
    else:
        content='import { notFound } from "next/navigation";\nexport default function Page() { notFound(); }\n'
    p.write_text(content,encoding='utf-8',newline='\n')
(q/'PROVENANCE.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
p=root/'src/lib/nav/destinations.ts'; s=p.read_text(encoding='utf-8')
s=re.sub(r'^  \{ id: "(?:contests|kreator|academy)".*?\n','',s,flags=re.M)
p.write_text(s,encoding='utf-8',newline='\n')
print(f'Preserved and isolated {len(records)} non-V1 route originals.')
