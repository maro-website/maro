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

child.on("exit", (code) => process.exit(code ?? 1));
