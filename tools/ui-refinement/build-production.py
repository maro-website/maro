"""Use existing private Railway variable backup without printing its values."""
from pathlib import Path
import os,json,subprocess
root=Path(__file__).resolve().parents[2]
variables=json.loads((Path(os.environ['TEMP'])/'maro-production-launch-20261001/web-variables-before.json').read_text())
env={**os.environ,**variables,'NEXT_PUBLIC_SIGNUP_ENABLED':'true','PUBLIC_LAUNCH_MODE':'live','NEXT_PUBLIC_PADDLE_ENABLED':'false','NODE_ENV':'production'}
env.pop('NODE_OPTIONS',None)
evidence=root/'docs/evidence/ui-refinement'
evidence.mkdir(parents=True,exist_ok=True)
with (evidence/'build.log').open('w',encoding='utf-8') as log:
    result=subprocess.run(['node','node_modules/next/dist/bin/next','build'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
print(json.dumps({'production_build_exit':result.returncode}))
raise SystemExit(result.returncode)
