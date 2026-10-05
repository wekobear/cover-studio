import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCopyPrompt, buildImagePrompt, SKILL_SOURCE } from '../src/prompts.js';
import { defaultState } from '../src/store.js';
import { EDITORIAL_THEMES, SWISS_ACCENTS } from '../src/poster/theme-data.js';
import { getBoard } from '../src/poster/model.js';

test('文案提示词携带真实 system / recipe / ratio / theme 参数', () => {
  const s = defaultState();
  const p = buildCopyPrompt(s);
  assert.ok(p.includes('Editorial Magazine × E-ink'), '体系英文实名');
  assert.ok(p.includes('[配方 Recipe] M01'), 'recipe 编号');
  assert.ok(p.includes('1080×1440'), '画幅真实尺寸');
  assert.ok(p.includes('ink-classic'), '主题 id');
  const theme = EDITORIAL_THEMES.find((t) => t.id === 'ink-classic');
  assert.ok(p.includes(`--paper: ${theme.vars['--paper']}`), '主题变量为种子 CSS 实值');
  assert.ok(p.includes(SKILL_SOURCE), '上游 Skill 来源（commit 级）');
  assert.ok(p.includes(s.content.title.replace(/\n/g, '/')), '现有内容进入提示词');
  assert.ok(p.includes('不编造数据'), '禁止编造数字');
});

test('Swiss 体系提示词使用 accent 语义与真实变量', () => {
  const s = { ...defaultState(), system: 'swiss', recipe: 'S02', theme: 'safety-orange', ratio: '21:9' };
  const p = buildCopyPrompt(s);
  assert.ok(p.includes('Swiss International'));
  assert.ok(p.includes('[配方 Recipe] S02'));
  assert.ok(p.includes('2100×900'), 'wide 尺寸');
  assert.ok(p.includes('[强调色 accent] safety-orange'));
  const accent = SWISS_ACCENTS.find((t) => t.id === 'safety-orange');
  assert.ok(p.includes(`--accent: ${accent.vars['--accent']}`));
});

test('生图提示词含主题纸色与禁止项，且声明排版在本地完成', () => {
  const s = { ...defaultState(), theme: 'kraft-paper' };
  const p = buildImagePrompt(s);
  const theme = EDITORIAL_THEMES.find((t) => t.id === 'kraft-paper');
  assert.ok(p.includes(theme.vars['--paper']), '纸色实值');
  assert.ok(p.includes('不要出现任何文字'));
  assert.ok(p.includes('封面工坊在浏览器内完成'), '不暗示在线 AI 出图');
});

test('提示词随内容与画幅变化（非静态模板）', () => {
  const a = buildCopyPrompt(defaultState());
  const s2 = { ...defaultState(), ratio: '1:1', content: { ...defaultState().content, title: '另一个标题' } };
  const b = buildCopyPrompt(s2);
  assert.notEqual(a, b);
  assert.ok(b.includes('另一个标题'));
  assert.ok(b.includes(getBoard('1:1').label));
});
