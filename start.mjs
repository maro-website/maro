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
let stopping = false;
let requestedExitCode;
const stop = (code) => {
  if (stopping) return;
  stopping = true;
  requestedExitCode = code;
  payments?.kill();
  child.kill();
  const timer = setTimeout(() => process.exit(code), 5000);
  timer.unref();
  child.once("exit", () => process.exit(code));
};
child.on("error", () => stop(1));
if (process.env.RAIACCEPT_ENABLED==="true"&&process.env.RAIACCEPT_RECOVERY_ENABLED==="true") {
  payments=spawn(process.execPath,[path.join(process.cwd(),"tools","raiaccept-reconcile.mjs")],{stdio:"inherit",env:process.env});
  payments.on("error", () => stop(1));
  payments.on("exit", () => {
    if (!stopping) {
      console.error(JSON.stringify({ event: "payment_worker_exited", reason: "unexpected_exit" }));
      stop(1); // Existing Railway restart policy supervises the whole service.
    }
  });
}

child.on("exit", (code) => {payments?.kill();process.exit(requestedExitCode ?? code ?? 1);});
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
