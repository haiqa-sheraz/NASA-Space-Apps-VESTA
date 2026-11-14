/**
 * Starts the site (next dev, port 3000) and the Ask AI functions (port 8888) together.
 * Run from the project root:  bun run dev:ai     Stop with Ctrl+C.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

// process.execPath is the Bun that runs this script, so no shell is needed to find it.
const children: ChildProcess[] = [
  spawn(process.execPath, ["scripts/dev-functions.ts"], { stdio: "inherit" }),
  spawn(process.execPath, ["--bun", "next", "dev"], { stdio: "inherit" }),
];

let stopping = false;
const stopAll = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    // On Windows, end the whole process tree (next dev starts its own workers).
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill();
  }
  process.exit(0);
};
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
for (const child of children) child.on("exit", stopAll);
