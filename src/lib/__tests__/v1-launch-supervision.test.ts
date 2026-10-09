import { expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
it("restarts the service when the required payment worker silently exits", async () => {
  const root=await mkdtemp(path.join(tmpdir(),"maro-worker-test-"));
  try {
    await mkdir(path.join(root,"node_modules/next/dist/bin"),{recursive:true});
    await mkdir(path.join(root,"tools"));
    await writeFile(path.join(root,"node_modules/next/dist/bin/next"),'setInterval(()=>{},1000);');
    await writeFile(path.join(root,"tools/raiaccept-reconcile.mjs"),'setTimeout(()=>process.exit(0),150);');
    const child=spawn(process.execPath,[path.resolve("start.mjs")],{cwd:root,env:{...process.env,RAIACCEPT_ENABLED:"true",RAIACCEPT_RECOVERY_ENABLED:"true"},stdio:["ignore","pipe","pipe"]});
    let output=""; child.stdout.on("data",d=>output+=d); child.stderr.on("data",d=>output+=d);
    const code=await new Promise<number|null>((resolve,reject)=>{
      const timer=setTimeout(()=>{child.kill();reject(new Error("supervisor_timeout"));},8000);
      child.on("error",error=>{clearTimeout(timer);reject(error);});
      child.on("exit",code=>{clearTimeout(timer);resolve(code);});
    });
    expect(code).toBe(1);
    expect(output).toContain('"event":"payment_worker_exited"');
  } finally {
    if (!path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep+"maro-worker-test-")) throw new Error("invalid_test_cleanup_path");
    await rm(root,{recursive:true,force:true});
  }
},12000);
