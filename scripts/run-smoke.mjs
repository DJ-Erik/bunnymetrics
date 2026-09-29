/* Boots `next start`, waits for readiness, runs the smoke suite, then shuts down. */
import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";

const PORT = process.env.PORT ?? "3100";
const BASE = `http://localhost:${PORT}`;

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "start", "-p", PORT], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});

let serverLog = "";
child.stdout.on("data", (d) => {
  serverLog += d.toString();
});
child.stderr.on("data", (d) => {
  serverLog += d.toString();
});

async function waitForServer(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: "HEAD" });
      if (res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function shutdown() {
  if (!child.killed) {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 4000))]);
    if (!child.killed) child.kill("SIGKILL");
  }
}

process.on("exit", () => child.kill("SIGKILL"));

const up = await waitForServer();
if (!up) {
  console.error("Server failed to start. Output:\n" + serverLog);
  await shutdown();
  process.exit(1);
}
console.log("Server is up.\n");

process.env.BASE = BASE;
await import("./smoke-test.mjs");

const code = process.exitCode ?? 0;
await shutdown();
process.exit(code);
