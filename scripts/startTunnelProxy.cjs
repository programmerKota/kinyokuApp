#!/usr/bin/env node
// Start a proxy tunnel (localtunnel) and point Expo to it via EXPO_PACKAGER_PROXY_URL.
// Also sets EXPO_PUBLIC_EMULATOR_HOST in .env.local.
const os = require("os");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function pickLanIp() {
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!Array.isArray(addrs)) continue;
    for (const a of addrs) {
      if (!a) continue;
      const family =
        typeof a.family === "string" ? a.family : a.family === 4 ? "IPv4" : "";
      if (family !== "IPv4") continue;
      if (a.internal) continue;
      const lname = (name || "").toLowerCase();
      if (
        lname.includes("vbox") ||
        lname.includes("virtual") ||
        lname.includes("docker") ||
        lname.includes("vmware") ||
        lname.includes("br-")
      )
        continue;
      if (a.address) return a.address;
    }
  }
  return "127.0.0.1";
}

function upsertEnvLocal(projectRoot, ip) {
  const file = path.join(projectRoot, ".env.local");
  let next = "";
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, "utf8");
    next = raw
      .split(/\r?\n/)
      .filter((l) => !/^\s*EXPO_PUBLIC_EMULATOR_HOST\s*=/.test(l))
      .join("\n");
    if (next && !next.endsWith("\n")) next += "\n";
  }
  next += `EXPO_PUBLIC_EMULATOR_HOST=${ip}\n`;
  fs.writeFileSync(file, next, "utf8");
}

async function ensureLocaltunnel() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    return require("localtunnel");
  } catch (e) {
    console.error(
      "[tunnel-proxy] localtunnel is not installed. Run: npm i -D localtunnel",
    );
    process.exit(1);
  }
}

async function start() {
  const projectRoot = process.cwd();
  const ip = pickLanIp();
  upsertEnvLocal(projectRoot, ip);
  console.log(
    `[tunnel-proxy] EXPO_PUBLIC_EMULATOR_HOST=${ip} written to .env.local`,
  );

  const localtunnel = await ensureLocaltunnel();
  const port = 8081; // Metro default
  console.log("[tunnel-proxy] Opening localtunnel on port", port);
  const lt = await localtunnel({ port });
  const url = lt.url.endsWith("/") ? lt.url.slice(0, -1) : lt.url;
  console.log("[tunnel-proxy] EXPO_PACKAGER_PROXY_URL =", url);

  const passthrough = process.argv.slice(2).filter((a) => a !== "--tunnel");
  const env = { ...process.env, EXPO_PACKAGER_PROXY_URL: url };
  const args = ["expo", "start", "--lan", ...passthrough];
  // Use shell execution for Windows robustness
  const cmd = process.platform === "win32" ? "npx" : "npx";
  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: true,
    env,
  });

  const cleanup = async () => {
    try {
      await lt.close();
    } catch {}
  };
  child.on("exit", async (code) => {
    await cleanup();
    process.exit(code ?? 0);
  });
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(143);
  });
}

start().catch((e) => {
  console.error("[tunnel-proxy] Failed:", e);
  process.exit(1);
});
