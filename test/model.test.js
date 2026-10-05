import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SYSTEMS, RECIPES, BOARDS, LIMITS, TITLE_BUDGETS,
  getRecipe, getBoard, recipesOfSystem, isThemeLegal, defaultThemeOf, coerceStateShape,
} from '../src/poster/model.js';
import { EDITORIAL_THEMES, SWISS_ACCENTS } from '../src/poster/theme-data.js';
import { defaultState, selectSystem, selectRecipe, selectTheme, selectRatio } from '../src/store.js';

test('体系：2 套，主题共 10 套（6 Editorial + 4 Swiss）', () => {
  assert.deepEqual(Object.keys(SYSTEMS), ['editorial', 'swiss']);
  assert.equal(SYSTEMS.editorial.themes.length, 6);
  assert.equal(SYSTEMS.swiss.themes.length, 4);
  assert.equal(EDITORIAL_THEMES.length, 6);
  assert.equal(SWISS_ACCENTS.length, 4);
  /* 主题数据 id 与 SYSTEMS 声明一致 */
  assert.deepEqual(EDITORIAL_THEMES.map((t) => t.id), SYSTEMS.editorial.themes);
  assert.deepEqual(SWISS_ACCENTS.map((t) => t.id), SYSTEMS.swiss.themes);
});

test('配方：6 个真实编号，体系归属正确', () => {
  assert.equal(RECIPES.length, 6);
  assert.deepEqual(RECIPES.map((r) => r.id), ['M01', 'M16', 'M08', 'S01', 'S02', 'S05']);
  assert.deepEqual(recipesOfSystem('editorial').map((r) => r.id), ['M01', 'M16', 'M08']);
  assert.deepEqual(recipesOfSystem('swiss').map((r) => r.id), ['S01', 'S02', 'S05']);
  for (const r of RECIPES) {
    assert.ok(r.system === 'editorial' || r.system === 'swiss');
    assert.ok(r.desc && r.label);
    /* 每个配方对三种画幅都有结构提示（独立排版而非裁剪） */
    assert.deepEqual(Object.keys(r.boardHint).sort(), ['square', 'wide', 'xhs']);
  }
});

test('画幅：3 种真实尺寸', () => {
  assert.deepEqual(BOARDS.map((b) => [b.id, b.w, b.h]), [
    ['3:4', 1080, 1440],
    ['1:1', 1080, 1080],
    ['21:9', 2100, 900],
  ]);
  assert.deepEqual(BOARDS.map((b) => b.board), ['xhs', 'square', 'wide']);
  assert.equal(getBoard('不存在').id, '3:4');
  assert.equal(getRecipe('不存在'), null);
});

test('标题预算覆盖全部配方 × 画幅', () => {
  for (const r of RECIPES) {
    for (const b of BOARDS) {
      assert.ok(
        Number.isInteger(TITLE_BUDGETS[r.id][b.board]) && TITLE_BUDGETS[r.id][b.board] > 0,
        `${r.id}×${b.board} 应有预算`,
      );
    }
  }
});

test('主题合法性：跨体系主题非法', () => {
  assert.equal(isThemeLegal('editorial', 'ink-classic'), true);
  assert.equal(isThemeLegal('editorial', 'ikb'), false);
  assert.equal(isThemeLegal('swiss', 'ikb'), true);
  assert.equal(isThemeLegal('swiss', 'ink-classic'), false);
  assert.equal(isThemeLegal('unknown', 'ikb'), false);
  assert.equal(defaultThemeOf('swiss'), 'ikb');
  assert.equal(defaultThemeOf('editorial'), 'ink-classic');
});

test('coerceStateShape：非法形状落到合法默认', () => {
  assert.deepEqual(coerceStateShape({}), { system: 'editorial', recipe: 'M01', theme: 'ink-classic', ratio: '3:4' });
  /* recipe 不属于目标体系 → 体系内第一个 */
  assert.equal(coerceStateShape({ system: 'swiss', recipe: 'M01' }).recipe, 'S01');
  /* 主题跨体系 → 默认主题 */
  assert.equal(coerceStateShape({ system: 'swiss', theme: 'ink-classic' }).theme, 'ikb');
  /* 画幅非法 → 默认 */
  assert.equal(coerceStateShape({ ratio: '16:9' }).ratio, '3:4');
});

test('切换体系/配方/主题/画幅：内容永不丢弃（核收 0.3.0 兼容要求）', () => {
  const base = defaultState();
  const content = JSON.stringify(base.content);

  for (const system of ['editorial', 'swiss']) {
    const after = selectSystem(base, system);
    assert.equal(JSON.stringify(after.content), content, `${system} 切换后内容不变`);
    assert.ok(SYSTEMS[after.system].themes.includes(after.theme), '主题落到合法值');
    assert.ok(recipesOfSystem(after.system).some((r) => r.id === after.recipe), '配方落到合法值');
    /* 再切回来内容仍不变 */
    const back = selectSystem(after, base.system);
    assert.equal(JSON.stringify(back.content), content);
  }

  const s1 = selectRecipe(base, 'M16');
  assert.equal(s1.recipe, 'M16');
  assert.equal(JSON.stringify(s1.content), content);

  const s2 = selectTheme(s1, 'midnight-ink');
  assert.equal(s2.theme, 'midnight-ink');
  assert.equal(JSON.stringify(s2.content), content);

  for (const ratio of ['1:1', '21:9', '3:4']) {
    const s3 = selectRatio(s2, ratio);
    assert.equal(s3.ratio, ratio);
    assert.equal(JSON.stringify(s3.content), content);
  }
});

test('限制常量与上游约定一致', () => {
  assert.equal(LIMITS.imageBytes, 5 * 1024 * 1024);
  assert.equal(LIMITS.projectBytes, 12 * 1024 * 1024);
  assert.equal(LIMITS.itemCount, 5);
  assert.equal(LIMITS.tagCount, 3);
});
