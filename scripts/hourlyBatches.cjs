// Run both ranking and user-rank batches hourly against Firebase Emulator
const { spawn } = require('node:child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' exited ' + code))));
  });
}

function msUntilTopOfHour() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (now.getMinutes() !== 0 || now.getSeconds() !== 0) next.setHours(now.getHours() + 1);
  return next.getTime() - now.getTime();
}

async function once() {
  await run('node', ['scripts/runRankingBatch.cjs']);
  await run('node', ['scripts/updateUserRanks.cjs']);
}

async function main() {
  console.log('[hourly-batches] starting');
  await once();
  while (true) {
    const sleep = msUntilTopOfHour();
    console.log(`[hourly-batches] sleeping ${(sleep / 1000 / 60).toFixed(1)} min until top of hour`);
    await new Promise((r) => setTimeout(r, sleep));
    await once();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

