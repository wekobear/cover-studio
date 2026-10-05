#!/usr/bin/env node
/* Extract the Reicon outline icons used by the 封面工坊 tool UI from the
 * upstream data file (data/icon-data.json @ commit a6ce0bbb, MIT — full text
 * preserved at vendor/reicon/LICENSE, Copyright (c) 2025 REICON).
 *
 * Reproducible: verifies the source file's git blob sha1 against upstream
 * before extracting, then emits src/icons/reicon.js with raw 24x24 outline
 * path markup (fill="currentColor") for a fixed allow-list of names.
 *
 * Source resolution (build-time only, never a runtime request):
 *   1. CLI argument       node scripts/extract-reicon.mjs path/to/icon-data.json
 *   2. REICON_ICON_DATA   environment variable
 *   3. local cache        ~/.cache/cover-workshop/reicon-icon-data.json
 *   4. pinned GitHub raw  https://raw.githubusercontent.com/wekobear/reicon/<commit>/data/icon-data.json
 *                         (fetched once, blob-sha1 verified, then stored in the cache)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'icons', 'reicon.js');
const CACHE = join(homedir(), '.cache', 'cover-workshop', 'reicon-icon-data.json');
const RAW_URL = 'https://raw.githubusercontent.com/wekobear/reicon/a6ce0bbb5ee2f67072360d61ee146e4fddab30db/data/icon-data.json';
const REPO = 'https://github.com/wekobear/reicon';
const COMMIT = 'a6ce0bbb5ee2f67072360d61ee146e4fddab30db';
const EXPECTED_BLOB = '3642a7851b1093d21421f6294b3d002fa341ce67';

const candidates = [
  process.argv[2],
  process.env.REICON_ICON_DATA,
  CACHE,
].filter(Boolean);

async function loadSource() {
  for (const p of candidates) {
    try {
      return { buf: readFileSync(p), from: p };
    } catch { /* try next candidate */ }
  }
  console.log(`no local source found; fetching pinned upstream ${RAW_URL}`);
  const res = await fetch(RAW_URL);
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const from = 'pinned GitHub raw (cached for next runs)';
  try {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, buf);
    console.log(`cached -> ${CACHE}`);
  } catch { /* cache is best-effort */ }
  return { buf, from };
}

/* Names actually used by the tool UI (verified present in Outline weight). */
const NAMES = [
  'image', 'download', 'upload', 'copy', 'check', 'x', 'text', 'layout', 'palette',
  'file', 'file-text', 'refresh', 'eye', 'share', 'export', 'import', 'plus', 'minus',
  'trash', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'menu',
  'alert', 'layers', 'sliders', 'edit', 'wand', 'sparkles', 'gallery', 'crop',
  'undo', 'redo', 'code', 'link', 'help', 'list', 'search', 'settings', 'grid',
  'star', 'monitor', 'phone', 'frame',
];

const { buf, from } = await loadSource();
const blob = createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
if (blob !== EXPECTED_BLOB) {
  console.error(`source file blob sha1 ${blob} != upstream ${EXPECTED_BLOB}; refusing`);
  process.exit(1);
}

const data = JSON.parse(buf.toString('utf8'));
const icons = {};
const missing = [];
const findCategory = (name) => {
  for (const [cat, val] of Object.entries(data.categories)) {
    if (val.icons && val.icons[name]) return cat;
  }
  return null;
};
for (const name of NAMES) {
  const cat = findCategory(name);
  const entry = cat && data.categories[cat].icons[name];
  const outline = entry && entry.weights && entry.weights.Outline;
  if (!outline || !outline.code) {
    missing.push(name);
    continue;
  }
  icons[name] = { cat, code: outline.code.trim() };
}
if (missing.length) {
  console.error(`missing icons in source: ${missing.join(', ')}`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
const js = `/* ! AUTO-GENERATED — DO NOT EDIT BY HAND
 * 由 scripts/extract-reicon.mjs 从 Reicon data/icon-data.json 提取（Outline 线性风格）。
 * 来源：${REPO}@${COMMIT}（MIT，Copyright (c) 2025 REICON，全文见 vendor/reicon/LICENSE；
 * 源文件 git blob sha1 ${blob}，与上游核验一致）
 * 共 ${NAMES.length} 枚，markup 为上游原文（24x24 viewBox，fill="currentColor"）。
 */
export const REICON_META = {
  repo: '${REPO}',
  commit: '${COMMIT}',
  license: 'MIT',
  copyright: 'Copyright (c) 2025 REICON',
  licenseFile: 'vendor/reicon/LICENSE',
  weight: 'Outline',
  count: ${NAMES.length},
};

export const REICON_ICONS = ${JSON.stringify(icons, null, 2)};
`;
writeFileSync(OUT, js);
console.log(`extracted ${NAMES.length} reicon outline icons -> src/icons/reicon.js (source: ${from})`);
