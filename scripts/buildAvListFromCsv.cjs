#!/usr/bin/env node
// Read data/av_actress_names.csv and generate src/data/avActressNames.local.ts
const fs = require('fs');
const path = require('path');

const SRC = path.resolve('data/av_actress_names.csv');
const OUT = path.resolve('src/data/avActressNames.local.ts');

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('CSV not found:', SRC);
    process.exit(1);
  }
  const raw = fs.readFileSync(SRC, 'utf8');
  const lines = raw.split(/\n+/).map((s) => s.replace(/\r/g, '').trim()).filter(Boolean);
  const unique = Array.from(new Set(lines));
  unique.sort((a, b) => a.localeCompare(b, 'ja'));
  const content = `// Auto-generated from data/av_actress_names.csv\nexport const AV_ACTRESS_NAMES_LOCAL: string[] = [\n${unique.map((n) => `  ${JSON.stringify(n)},`).join('\n')}\n];\n`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, content, 'utf8');
  console.log(`Generated ${OUT} with ${unique.length} names.`);
}

main();

