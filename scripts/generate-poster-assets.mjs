#!/usr/bin/env node
/* Generate frontend-usable poster CSS + theme data from the vendored Guizang
 * seed templates (vendor/guizang/assets/template-*.html).
 *
 * What it does (deterministic, no network):
 *   1. Extract the single <style> block of each seed template verbatim.
 *   2. Strip runtime external dependencies: @import rules and any declaration
 *      referencing http(s):// (the seeds load Google Fonts / Lucide via <link>/<script>
 *      outside the style block; this is a defensive guard). The poster therefore
 *      runs under CSP `script-src 'self'; font-src 'self'` with zero external requests.
 *   3. Emit src/poster/css/editorial.css and src/poster/css/swiss.css.
 *   4. Parse [data-theme="…"]{…} and [data-accent="…"]{…} variable blocks into
 *      src/poster/theme-data.js so React can label/preview palettes.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR_ASSETS = join(ROOT, 'vendor', 'guizang', 'assets');
const OUT_CSS = join(ROOT, 'src', 'poster', 'css');
const OUT_THEME = join(ROOT, 'src', 'poster', 'theme-data.js');
const UPSTREAM = 'https://github.com/op7418/guizang-social-card-skill@cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5 (AGPL-3.0)';

const EDITORIAL_LABELS = {
  'ink-classic': '墨韵经典',
  'indigo-porcelain': '青瓷靛蓝',
  'forest-ink': '森野墨绿',
  'kraft-paper': '牛皮纸',
  'dune': '沙丘暖棕',
  'midnight-ink': '午夜墨色',
};
const SWISS_LABELS = {
  ikb: '国际克莱因蓝',
  'lemon-yellow': '柠檬黄',
  'lemon-green': '柠檬绿',
  'safety-orange': '安全橙',
};

const sha256 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

function extractStyle(html) {
  const m = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!m) throw new Error('no <style> block found');
  return m[1];
}

function sanitize(css) {
  return css
    /* 先剥注释：种子尾部有「注释内调试示例」（内含伪 {…} 文本），会干扰
     * 后续 scoping 的规则边界识别。种子注释不参与渲染，横幅由生成器补。 */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('@import'))
    .filter((line) => !/https?:\/\//.test(line))
    .join('\n')
    /* The seeds style <body> for standalone preview (dark backdrop + padding).
     * Inside 封面工坊 these rules would hijack the tool UI, and posters never
     * depend on them (`.poster` carries its own background/color). Drop only
     * these two global selectors; everything else stays verbatim. */
    .replace(/^\s*html,\s*body\s*\{[^}]*\}\s*$/gm, '')
    .replace(/^\s*body\s*\{[^}]*\}\s*$/gm, '');
}

function parseAttrBlocks(css, attr) {
  const re = new RegExp(`\\[data-${attr}="([a-z-]+)"\\]\\s*\\{([^{}]*)\\}`, 'g');
  const out = {};
  let m;
  while ((m = re.exec(css))) {
    const id = m[1];
    const vars = {};
    for (const decl of m[2].split(';')) {
      const dm = decl.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+?)\s*$/);
      if (dm) vars[dm[1]] = dm[2];
    }
    out[id] = vars;
  }
  return out;
}

/* ---- selector scoping ----------------------------------------------------
 * 两套种子模板共享同名 class（.poster/.content/…），同时全局加载会互相覆盖，
 * 也不能让种子规则命中工具 UI。生成期给每条选择器加体系前缀：
 *   .poster {…}            → .cw-sys-editorial .poster {…}
 *   [data-theme="x"] {…}   → .cw-sys-editorial [data-theme="x"] {…}
 * 前缀统一加在最后一级之前不改变原有相对特异性/顺序；Poster 渲染时包一层
 * <div class="cw-sys-{system}">，预览、缩略图、SVG/HTML 导出共用同一 DOM。
 */
function splitTopLevel(sel) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of sel) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function scopeCss(css, scope) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    const nextBrace = css.indexOf('{', i);
    if (nextBrace === -1) {
      out += css.slice(i);
      break;
    }
    const prelude = css.slice(i, nextBrace);
    // balance braces inside the body (no nested rules in the seeds, but be safe)
    let depth = 1;
    let j = nextBrace + 1;
    while (j < n && depth > 0) {
      if (css[j] === '{') depth += 1;
      if (css[j] === '}') depth -= 1;
      j += 1;
    }
    const body = css.slice(nextBrace + 1, j - 1);
    /* 判定必须基于去注释后的 prelude：种子注释常与选择器同段（注释 + :root 混排），
     * 否则带注释的规则会逃过 scoping。 */
    const noComment = prelude.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (noComment === '') {
      // 纯注释垫片（理论上不含规则体）——原样保留
      out += prelude + `{${body}}`;
    } else if (noComment.startsWith('@keyframes') || noComment.startsWith('@font-face')) {
      out += `${noComment}{${body}}`;
    } else if (noComment.startsWith('@media') || noComment.startsWith('@supports')) {
      out += `${noComment} {\n${scopeCss(body, scope)}\n}`;
    } else {
      const scoped = splitTopLevel(noComment)
        .map((sel) => {
          if (sel.startsWith('@')) return sel;
          /* :root 在种子里承载默认主题变量 → 直接落到体系 wrapper 自身 */
          if (sel === ':root') return scope;
          return `${scope} ${sel}`;
        })
        .join(',\n');
      out += `${scoped} {${body}}`;
    }
    // preserve whitespace/newlines between rules for readability
    let k = j;
    while (k < n && /\s/.test(css[k])) k += 1;
    out += css.slice(j, k);
    i = k;
  }
  return out;
}

function varLines(vars, indent) {
  return Object.entries(vars).map(([k, v]) => `${indent}'${k}': '${v}',`).join('\n');
}

const editorialHtml = readFileSync(join(VENDOR_ASSETS, 'template-editorial-card.html'), 'utf8');
const swissHtml = readFileSync(join(VENDOR_ASSETS, 'template-swiss-card.html'), 'utf8');
const editorialCss = sanitize(extractStyle(editorialHtml));
const swissCss = sanitize(extractStyle(swissHtml));

mkdirSync(OUT_CSS, { recursive: true });

const banner = (src, hash, scope) => `/* ! AUTO-GENERATED — DO NOT EDIT BY HAND
 * 提取自 ${src}（seed 模板 <style> 原文，sha256:${hash}）
 * 由 scripts/generate-poster-assets.mjs 生成；修改请改脚本后重新生成。
 * 上游：${UPSTREAM}
 * 已剥离：外部字体/Lucide CDN 引用（@import 与 http(s) 声明），无任何运行时外部请求；
 *         另移除 html/body 全局规则（种子为独立预览设置深色背景，会污染工具 UI，海报不依赖）。
 * 已作用域化：每条选择器加前缀 ${scope}（两套种子共享同名 class，须按体系隔离，
 *         且不得命中工具 UI）。渲染端 Poster 组件包裹 <div class="${scope.slice(1)}">。
 */
`;

const EDITORIAL_SCOPE = '.cw-sys-editorial';
const SWISS_SCOPE = '.cw-sys-swiss';

writeFileSync(join(OUT_CSS, 'editorial.css'), banner('vendor/guizang/assets/template-editorial-card.html', sha256(editorialHtml), EDITORIAL_SCOPE) + scopeCss(editorialCss, EDITORIAL_SCOPE).trimEnd() + '\n');
writeFileSync(join(OUT_CSS, 'swiss.css'), banner('vendor/guizang/assets/template-swiss-card.html', sha256(swissHtml), SWISS_SCOPE) + scopeCss(swissCss, SWISS_SCOPE).trimEnd() + '\n');

const themes = parseAttrBlocks(editorialCss, 'theme');
const accents = parseAttrBlocks(swissCss, 'accent');

const themeIds = Object.keys(EDITORIAL_LABELS).filter((id) => themes[id]);
const accentIds = Object.keys(SWISS_LABELS).filter((id) => accents[id]);
if (themeIds.length !== 6) throw new Error(`expected 6 editorial themes, got ${themeIds.join(',')}`);
if (accentIds.length !== 4) throw new Error(`expected 4 swiss accents, got ${accentIds.join(',')}`);

const js = `/* ! AUTO-GENERATED — DO NOT EDIT BY HAND
 * 由 scripts/generate-poster-assets.mjs 从 vendored 种子模板 CSS 解析生成。
 * 上游：${UPSTREAM}
 * 值为模板 [data-theme]/[data-accent] 变量块原文，与渲染 CSS 同源。
 */
export const EDITORIAL_THEMES = [
${themeIds.map((id) => `  {
    id: '${id}',
    label: '${EDITORIAL_LABELS[id]}',
    dark: ${id === 'midnight-ink'},
    vars: {
${varLines(themes[id], '      ')}
    },
  },`).join('\n')}
];

export const SWISS_ACCENTS = [
${accentIds.map((id) => `  {
    id: '${id}',
    label: '${SWISS_LABELS[id]}',
    vars: {
${varLines(accents[id], '      ')}
    },
  },`).join('\n')}
];
`;
writeFileSync(OUT_THEME, js);

console.log(`editorial.css ${editorialCss.length}B, swiss.css ${swissCss.length}B`);
console.log(`themes: ${themeIds.join(', ')}`);
console.log(`accents: ${accentIds.join(', ')}`);
