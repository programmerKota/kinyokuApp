#!/usr/bin/env node
// Minimal helper to auto-detect a private IPv4 and start Expo with it.
// Usage examples:
//   node scripts/startTunnelAuto.cjs --tunnel
//   node scripts/startTunnelAuto.cjs --dev-client --tunnel

const os = require('node:os');
const { spawn } = require('node:child_process');

function isPrivateIPv4(ip) {
  if (!ip) return false;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const octets = ip.split('.').map(Number);
  // 172.16.0.0 – 172.31.255.255
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  // Carrier-grade NAT 100.64.0.0/10 (optional, treat as private for dev)
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  return false;
}

function getCandidateIPv4() {
  const nets = os.networkInterfaces();
  const all = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) {
        all.push({ name, address: a.address });
      }
    }
  }
  // Prefer typical Wi-Fi/Ethernet adapters, then first private IPv4
  const preferred = all.find(x => /wi[- ]?fi|wlan|wireless|ethernet|en\d|eth\d/i.test(x.name) && isPrivateIPv4(x.address));
  if (preferred) return preferred.address;
  const firstPrivate = all.find(x => isPrivateIPv4(x.address));
  return firstPrivate ? firstPrivate.address : (all[0] && all[0].address) || null;
}

function run() {
  const args = process.argv.slice(2); // pass-through expo args
  const host = getCandidateIPv4();

  const env = { ...process.env };
  if (host) {
    // Metro/React Native reads this to bind/advertise the host in bundles.
    env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
    console.log(`[startTunnelAuto] REACT_NATIVE_PACKAGER_HOSTNAME=${host}`);
  } else {
    console.warn('[startTunnelAuto] LAN IP を特定できませんでした。環境変数は未設定で続行します。');
  }

  const exe = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const cp = spawn(exe, ['expo', 'start', ...args], {
    stdio: 'inherit',
    env,
  });

  cp.on('exit', code => process.exit(code ?? 0));
}

run();

