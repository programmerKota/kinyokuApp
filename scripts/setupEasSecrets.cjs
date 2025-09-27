#!/usr/bin/env node
/*
  One-shot helper to register Expo public runtime envs as EAS Secrets.
  It prompts for values and runs `eas secret:create --scope project` for each.
  Safe: these are public-at-runtime keys (Firebase web config + RC public SDK key).
*/

const { spawn } = require('child_process');
const readline = require('readline');

const REQUIRED = [
  // Payments can be skipped; RC key is optional
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const OPTIONAL = [
  'EXPO_PUBLIC_RC_API_KEY',
  'EXPO_PUBLIC_PAYMENTS_DEV_MODE',
  'EXPO_PUBLIC_ENABLE_FUNCTIONS',
  'EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION',
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));

function tryParseFirebaseConfigSnippet(snippet) {
  if (!snippet) return null;
  try {
    let s = snippet.trim();
    // Extract the first {...} block if needed
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      s = s.slice(start, end + 1);
    }
    // Convert JS object style to JSON: quote keys, remove trailing commas
    s = s
      .replace(/([,{\s])([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, '$1');
    const obj = JSON.parse(s);
    const map = {
      EXPO_PUBLIC_FIREBASE_API_KEY: obj.apiKey || obj.api_key || obj.API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: obj.authDomain,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: obj.projectId || obj.project_id,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: obj.storageBucket,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: obj.messagingSenderId || obj.messagingSenderID,
      EXPO_PUBLIC_FIREBASE_APP_ID: obj.appId || obj.app_id,
    };
    return map;
  } catch (e) {
    return null;
  }
}

async function ensureValue(name, required = true) {
  const existing = process.env[name];
  if (existing) return existing;
  let prompt = `${name}${required ? '' : ' (optional)'}: `;
  const val = await ask(prompt);
  if (!val && required) {
    console.error(`Value required for ${name}.`);
    return await ensureValue(name, required);
  }
  return val;
}

async function createSecret(name, value) {
  if (!value) return; // skip optional empty values
  console.log(`\n[secrets] creating ${name} ...`);
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? '.\\node_modules\\.bin\\eas.cmd' : './node_modules/.bin/eas',
      ['secret:create', '--scope', 'project', '--name', name, '--value', value],
      { stdio: 'inherit' },
    );
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      console.warn(`[secrets] non-zero exit for ${name} (code ${code}). It may already exist. Continuing...`);
      resolve();
    });
    child.on('error', reject);
  });
}

async function main() {
  console.log('\nThis will create EAS Secrets for public runtime envs (project scope).');
  console.log('Make sure you are logged in: `npx eas whoami` should show your user.');

  // Optional: paste full Firebase config object
  const pasted = await ask('\nPaste Firebase config object (optional, from console) or press Enter to skip:\n');
  const fromSnippet = tryParseFirebaseConfigSnippet(pasted);

  const entries = [];
  for (const key of REQUIRED) {
    const v = fromSnippet?.[key] || (await ensureValue(key, true));
    entries.push([key, v]);
  }
  for (const key of OPTIONAL) {
    const v = await ensureValue(key, false);
    if (v) entries.push([key, v]);
  }

  // Optional: set Firestore prefix for staging isolation
  const wantPrefix = (await ask('\nSet Firestore collection prefix for staging? (recommend: stg) leave empty to skip: ')) || '';
  if (wantPrefix) entries.push(['EXPO_PUBLIC_FS_PREFIX', wantPrefix]);

  for (const [k, v] of entries) {
    // eslint-disable-next-line no-await-in-loop
    await createSecret(k, v);
  }

  console.log('\n[secrets] Finished. Your next step:');
  console.log('  - Run: npm run build:ios:preview');
  console.log('  - Install on iPhone from the EAS link, then test.');
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
