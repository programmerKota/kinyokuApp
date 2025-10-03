#!/usr/bin/env node
// Start Expo with --tunnel (no emulator configuration)
const { spawn } = require("child_process");

async function main() {
  const projectRoot = process.cwd();

  // Default to --tunnel if not explicitly provided.
  const userArgs = process.argv.slice(2);
  const hasTunnel = userArgs.includes("--tunnel");
  const args = [
    "expo",
    "start",
    ...(hasTunnel ? [] : ["--tunnel"]),
    ...userArgs,
  ];

  // On some Windows environments, spawning .cmd without shell can throw EINVAL.
  // Use shell execution for robustness.
  const cmd = process.platform === "win32" ? "npx" : "npx";
  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error("[tunnel-auto] Failed:", e);
  process.exit(1);
});
