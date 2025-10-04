// Pull minimal tokens from Figma and write to design/tokens.
// Requires env: FIGMA_TOKEN, FIGMA_FILE_KEY
// Usage: node scripts/design/pullFigmaTokens.mjs

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;
if (!TOKEN || !FILE_KEY) {
  console.error('[pullFigmaTokens] FIGMA_TOKEN and FIGMA_FILE_KEY are required');
  process.exit(2);
}

const OUT_DIR = join(process.cwd(), 'design', 'tokens');
mkdirSync(OUT_DIR, { recursive: true });

const headers = { 'X-Figma-Token': TOKEN };

async function getFile(key) {
  const res = await fetch(`https://api.figma.com/v1/files/${key}`, { headers });
  if (!res.ok) throw new Error(`files/${key} -> ${res.status}`);
  return res.json();
}

async function getNodes(key, ids) {
  const chunk = ids.slice(0, 180).join(','); // keep URL short
  const res = await fetch(`https://api.figma.com/v1/files/${key}/nodes?ids=${encodeURIComponent(chunk)}`, { headers });
  if (!res.ok) throw new Error(`nodes -> ${res.status}`);
  return res.json();
}

function rgbaToHex({ r, g, b }, a = 1) {
  const to255 = (v) => Math.round((v ?? 0) * 255);
  const hex = (n) => n.toString(16).padStart(2, '0');
  const R = hex(to255(r));
  const G = hex(to255(g));
  const B = hex(to255(b));
  if (a === 1 || a == null) return `#${R}${G}${B}`;
  return `#${R}${G}${B}${hex(Math.round(a * 255))}`;
}

function extractPaintColor(node) {
  const fills = node?.fills;
  if (!Array.isArray(fills) || fills.length === 0) return undefined;
  const f = fills.find((x) => x.type === 'SOLID') || fills[0];
  const a = (f?.opacity ?? 1);
  const c = f?.color;
  if (!c) return undefined;
  return rgbaToHex(c, a);
}

async function run() {
  const file = await getFile(FILE_KEY);
  const styles = file?.styles || {};
  const entries = Object.entries(styles);
  const fillNodes = entries.filter(([, v]) => v?.style_type === 'FILL').map(([, v]) => v.node_id);
  const textNodes = entries.filter(([, v]) => v?.style_type === 'TEXT').map(([, v]) => v.node_id);

  const ids = [...new Set([...fillNodes, ...textNodes])];
  let nodes = {};
  for (let i = 0; i < ids.length; i += 180) {
    const slice = ids.slice(i, i + 180);
    const res = await getNodes(FILE_KEY, slice);
    Object.assign(nodes, res?.nodes || {});
  }

  const colorTokens = {};
  const textTokens = {};
  for (const [styleId, meta] of entries) {
    const name = meta?.name || styleId;
    const node = nodes[meta.node_id]?.document;
    if (!node) continue;
    if (meta.style_type === 'FILL') {
      const hex = extractPaintColor(node);
      if (hex) colorTokens[name] = hex;
    } else if (meta.style_type === 'TEXT') {
      textTokens[name] = {
        fontSize: node?.style?.fontSize,
        fontWeight: node?.style?.fontWeight,
        lineHeightPx: node?.style?.lineHeightPx,
      };
    }
  }

  const rawOut = { styles: file?.styles ?? {}, colors: colorTokens, text: textTokens };
  writeFileSync(join(OUT_DIR, 'figma-raw.json'), JSON.stringify(rawOut, null, 2), 'utf8');

  // Heuristic mapping -> app theme draft (adjust mapping as needed)
  const pick = (keys) => keys.find((k) => k in colorTokens);
  const m = (want, candidates) => colorTokens[pick(candidates)] ?? want;
  const themeDraft = {
    primary: m('#7C3AED', ['Brand/Primary', 'Primary', 'Brand Primary']),
    primaryDark: m('#6D28D9', ['Brand/Primary Dark', 'Primary/Dark']),
    primaryLight: m('#C4B5FD', ['Brand/Primary Light', 'Primary/Light']),
    secondary: m('#06B6D4', ['Brand/Secondary', 'Secondary']),
    secondaryDark: m('#0891B2', ['Secondary/Dark']),
    secondaryLight: m('#A5F3FC', ['Secondary/Light']),
    textPrimary: m('#0F172A', ['Text/Primary', 'Text Primary']),
    textSecondary: m('#475569', ['Text/Secondary', 'Text Secondary']),
    backgroundPrimary: m('#FFFFFF', ['Background/Primary', 'Background']),
    backgroundSecondary: m('#F8FAFC', ['Background/Secondary']),
    borderPrimary: m('#E2E8F0', ['Border/Primary', 'Border']),
  };
  writeFileSync(join(OUT_DIR, 'app-theme.json'), JSON.stringify(themeDraft, null, 2), 'utf8');

  console.log('[pullFigmaTokens] wrote:', join(OUT_DIR, 'figma-raw.json'));
  console.log('[pullFigmaTokens] wrote:', join(OUT_DIR, 'app-theme.json'));
}

run().catch((e) => {
  console.error('[pullFigmaTokens] failed:', e?.stack || e);
  process.exit(1);
});

