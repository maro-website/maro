from pathlib import Path
import json, re
root = Path(__file__).resolve().parents[2]
data=json.loads((root/'docs/evidence/production-contract-20260930.json').read_text(encoding='utf-8'))
pattern=re.compile(r'create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_][a-z_0-9]*)\s*\((.*?)\)\s*(.*?)\bas\s+(\$(?:[A-Za-z_]\w*)?\$)(.*?)\4\s*;',re.I|re.S)
expected={}
for p in sorted((root/'docs/db-history/current-main').glob('*.sql')):
    for match in pattern.finditer(p.read_text(encoding='utf-8')):
        expected[match[1]]=(match[5].replace('\r\n','\n').strip(),p.name)
out=[]
for f in data['functions']:
    if f['name'] in expected:
        body,source=expected[f['name']]
        out.append({'name':f['name'],'current_source':source,'body_exact_except_edge_whitespace':body==f['body'].replace('\r\n','\n').strip(),'anon_execute':f['anon_execute'],'authenticated_execute':f['authenticated_execute'],'service_execute':f['service_execute']})
(root/'docs/evidence/current-db-body-comparison.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out))
assert all(x['body_exact_except_edge_whitespace'] for x in out)
