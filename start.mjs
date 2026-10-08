import { spawn } from "node:child_process";
import path from "node:path";

const port = process.env.PORT || "3000";
// Container HOSTNAME may be an internal name, not a public listening interface.
const host = "0.0.0.0";
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", port], {
  stdio: "inherit",
  env: process.env,
});
let payments;
if (process.env.RAIACCEPT_ENABLED==="true"&&process.env.RAIACCEPT_RECOVERY_ENABLED==="true") {
  payments=spawn(process.execPath,[path.join(process.cwd(),"tools","raiaccept-reconcile.mjs")],{stdio:"inherit",env:process.env});
}

child.on("exit", (code) => {payments?.kill();process.exit(code ?? 1);});
process.on("SIGTERM",()=>{payments?.kill();child.kill();});
