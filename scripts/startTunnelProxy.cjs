#!/usr/bin/env node
// Start Expo while routing the Metro bundler through localtunnel as a proxy.
// This avoids ngrok restrictions by setting EXPO_PACKAGER_PROXY_URL.
// Usage:
//   node scripts/startTunnelProxy.cjs
//   node scripts/startTunnelProxy.cjs --dev-client

const { spawn } = require('node:child_process');

async function createLocalTunnel(port) {
  // localtunnel v2 exposes ESM default export; import dynamically from CJS.
  const mod = await import('localtunnel');
  const lt = mod.default || mod;
  const tunnel = await lt({ port });
  return tunnel; // has .url and .close()
}

async function run() {
  const args = process.argv.slice(2);

  // Metro default port used by Expo is 8081. If you've customized, set METRO_PORT.
  const port = Number(process.env.METRO_PORT || 8081);

  console.log(`[startTunnelProxy] localtunnel を ${port} 番ポートで起動します...`);
  let tunnel;
  try {
    tunnel = await createLocalTunnel(port);
  } catch (e) {
    console.error('[startTunnelProxy] localtunnel の起動に失敗しました。`npm i` 済みか確認してください。');
    console.error(e?.message || e);
    process.exit(1);
    return;
  }

  console.log(`[startTunnelProxy] トンネル URL: ${tunnel.url}`);
  const env = { ...process.env, EXPO_PACKAGER_PROXY_URL: tunnel.url };
  console.log(`[startTunnelProxy] EXPO_PACKAGER_PROXY_URL=${tunnel.url}`);

  const exe = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const cp = spawn(exe, ['expo', 'start', ...args], {
    stdio: 'inherit',
    env,
  });

  const cleanup = () => {
    if (tunnel) {
      console.log('\n[startTunnelProxy] トンネルを閉じます...');
      try { tunnel.close(); } catch {}
    }
  };

  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  cp.on('exit', code => { cleanup(); process.exit(code ?? 0); });
}

run();

