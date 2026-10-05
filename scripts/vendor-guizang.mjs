#!/usr/bin/env node
/* Copy the required upstream Guizang Social Card Skill seed files into
 * vendor/guizang and record provenance (local sha256 + upstream git blob sha1).
 *
 * Reproducible: reads only from the locally installed skill directory
 * (default ~/.codex/skills/guizang-social-card-skill, override with
 * GUIZANG_SKILL_DIR env). Never writes outside vendor/guizang.
 *
 * Upstream: https://github.com/op7418/guizang-social-card-skill
 * Commit:   cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5 (root LICENSE = AGPL-3.0)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(ROOT, 'vendor', 'guizang');
const SOURCE = process.env.GUIZANG_SKILL_DIR || join(homedir(), '.codex', 'skills', 'guizang-social-card-skill');
const UPSTREAM_REPO = 'https://github.com/op7418/guizang-social-card-skill';
const UPSTREAM_COMMIT = 'cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5';

/* Files required by 封面工坊 (renderer seeds + governing references + license). */
const FILES = [
  'LICENSE',
  'SKILL.md',
  'assets/template-editorial-card.html',
  'assets/template-swiss-card.html',
  'assets/magazine-bg-webgl.js',
  'references/style-system.md',
  'references/theme-presets.md',
  'references/layout-recipes.md',
  'references/components.md',
  'references/platform-specs.md',
  'references/portrait-fill.md',
  'references/production-workflow.md',
  'references/qa-checklist.md',
  'references/background-systems.md',
  'references/image-overlay.md',
];

/* git blob sha1 (path -> sha) at UPSTREAM_COMMIT, captured via
 * `gh api repos/op7418/guizang-social-card-skill/git/trees/<commit>?recursive=1`
 * on 2026-10-05. Used to prove the vendored bytes match upstream. */
const UPSTREAM_BLOBS = {
  'LICENSE': 'fe6b9036ba1818c79c15f802a586a9711ece2b97',
  'SKILL.md': '004954779b0a43bbc85e26a763545de92731e119',
  'assets/magazine-bg-webgl.js': '6ab58f6898b6ae4a3fa6d6e863de2e5e79e29194',
  'assets/template-editorial-card.html': '8f77174cd6536e0ae55cae342d496899c56cd915',
  'assets/template-swiss-card.html': 'ef7ae1e444700ce73b77048081964e8d44e23950',
  'references/background-systems.md': '962128079a2dacdd98ec0f71751502b37130b875',
  'references/components.md': 'be1ba68a74eb47559e729204ebbe2498ad23421e',
  'references/image-overlay.md': 'ef4f00305c499f1e5d85a5a93a876e8823c58215',
  'references/layout-recipes.md': '613d74935a72f5774b8fc85968e6db35f26bfe72',
  'references/platform-specs.md': 'd11d910a9c5c73fa99d6ee65e88500408e961597',
  'references/portrait-fill.md': '8f8d88b5f5a75e57c2b024ed674779ba0a623487',
  'references/production-workflow.md': '9561ac6795354aa2183abd83ca31111e7f896990',
  'references/qa-checklist.md': 'da383d74686e2a86cc6587e59606352aabc4dc34',
  'references/style-system.md': 'a734a7768b6c67199c74943a9ddd98f4ffee2b20',
  'references/theme-presets.md': '4e31c88bf15c7de09eae9d1f64cf6d658ce35aaf',
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const gitBlobSha = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

mkdirSync(VENDOR, { recursive: true });
const rows = [];
let allMatch = true;

for (const rel of FILES) {
  const src = join(SOURCE, rel);
  let buf;
  try {
    buf = readFileSync(src);
  } catch {
    console.error(`FAIL missing source file: ${src}`);
    process.exit(1);
  }
  const dst = join(VENDOR, rel);
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, buf);
  const upstream = UPSTREAM_BLOBS[rel];
  const blob = gitBlobSha(buf);
  const match = upstream && upstream === blob;
  if (!match) allMatch = false;
  rows.push({ rel, bytes: buf.length, blob, upstream, match, sha256: sha256(buf) });
}

const provenance = `# vendor/guizang 来源与核验

上游仓库：${UPSTREAM_REPO}
上游提交：${UPSTREAM_COMMIT}（根目录 LICENSE = AGPL-3.0；package.json 误写 ISC，以 LICENSE 为准）
本地来源：已安装的 Guizang Social Card Skill 目录（未做任何修改）；
  优先级：GUIZANG_SKILL_DIR 环境变量 > 默认 ~/.codex/skills/guizang-social-card-skill
拷贝方式：scripts/vendor-guizang.mjs（字节级复制 + 哈希核验，可重复执行）

核验方法：对每个文件计算 git blob sha1，与上游提交 \`git/trees\` API 返回的 blob sha 比对。

| 文件 | 字节 | 本地 blob sha1 | 上游 blob sha1 | 一致 |
| ---- | ---- | ---- | ---- | ---- |
${rows.map((r) => `| ${r.rel} | ${r.bytes} | ${r.blob.slice(0, 12)}… | ${r.upstream ? r.upstream.slice(0, 12) + '…' : 'N/A'} | ${r.match ? '✅' : '❌'} |`).join('\n')}

## sha256（本地文件）

${rows.map((r) => `${r.sha256}  ${r.rel}`).join('\n')}

整体核验结果：${allMatch ? '全部与上游提交一致 ✅' : '存在不一致 ❌（禁止发布）'}

许可证：AGPL-3.0（见本目录 LICENSE 原文）。封面工坊作为集成项目以 AGPL-3.0 发布，
第三方声明见项目根目录 THIRD_PARTY_NOTICES.md。
生成时间：${new Date().toISOString()}
`;
writeFileSync(join(VENDOR, 'PROVENANCE.md'), provenance);

console.log(`vendored ${rows.length} files -> vendor/guizang`);
console.log(`upstream verification: ${allMatch ? 'ALL MATCH' : 'MISMATCH FOUND'}`);
if (!allMatch) process.exit(1);
