import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateV1State, normalizeDraft } from '../src/migrate.js';

function v1State(over = {}) {
  return {
    version: 1,
    template: 'editorial',
    theme: 'paper',
    titleScale: 'm',
    ratio: '3:4',
    content: {
      title: '毕业后，去哪座城？',
      subtitle: '36 座城市，把选择摊开看',
      signature: 'Weko · 设计与 AI',
      tags: ['城市选择', '毕业生'],
      items: [
        { title: '就业机会', desc: '先看岗位多不多' },
        { title: '生活成本', desc: '房租与通勤决定每月留下的钱' },
        { title: '留下来的理由', desc: '朋友圈、气候与长期归属感' },
      ],
    },
    ...over,
  };
}

test('模板映射：editorial→M01 / poster→S01 / method→S05（可解释）', () => {
  const cases = [
    ['editorial', 'editorial', 'M01'],
    ['poster', 'swiss', 'S01'],
    ['method', 'swiss', 'S05'],
  ];
  for (const [tpl, system, recipe] of cases) {
    const { state, notes } = migrateV1State(v1State({ template: tpl }));
    assert.equal(state.system, system, `${tpl} → ${system}`);
    assert.equal(state.recipe, recipe, `${tpl} → ${recipe}`);
    assert.equal(state.version, 2);
    assert.equal(notes.length, 3, '迁移说明三条：模板/配色/字号档');
    assert.ok(notes[0].includes(tpl === 'editorial' ? '图文志' : tpl === 'poster' ? '大字报' : '方法卡'));
  }
});

test('配色映射按目标体系落地（editorial 深色、swiss 无深色取默认）', () => {
  assert.deepEqual(
    migrateV1State(v1State({ template: 'editorial', theme: 'ink' })).state,
    { ...migrateV1State(v1State({ template: 'editorial', theme: 'ink' })).state },
  );
  assert.equal(migrateV1State(v1State({ template: 'editorial', theme: 'ink' })).state.theme, 'midnight-ink');
  assert.equal(migrateV1State(v1State({ template: 'editorial', theme: 'cream' })).state.theme, 'kraft-paper');
  assert.equal(migrateV1State(v1State({ template: 'poster', theme: 'ink' })).state.theme, 'ikb');
  assert.equal(migrateV1State(v1State({ template: 'method', theme: 'cream' })).state.theme, 'lemon-yellow');
  /* 非法旧主题 → paper 档 */
  assert.equal(migrateV1State(v1State({ theme: 'neon' })).state.theme, 'ink-classic');
});

test('画幅：旧版只有 3:4 / 1:1，其余落 3:4', () => {
  assert.equal(migrateV1State(v1State({ ratio: '1:1' })).state.ratio, '1:1');
  assert.equal(migrateV1State(v1State({ ratio: '16:9' })).state.ratio, '3:4');
});

test('内容全量保留：标签截到 3、条目截到 5、空条目被清', () => {
  const old = v1State({
    content: {
      title: '标题',
      subtitle: '副题',
      signature: '署名',
      tags: ['a', 'b', 'c', 'd'],
      items: [
        ...[1, 2, 3, 4, 5, 6, 7].map((i) => ({ title: `t${i}`, desc: `d${i}` })),
        { title: '', desc: '' },
      ],
    },
  });
  const { state } = migrateV1State(old);
  assert.equal(state.content.title, '标题');
  assert.equal(state.content.tags.length, 3);
  assert.equal(state.content.items.length, 5);
});

test('空输入也产出可用的 v2 状态', () => {
  const { state } = migrateV1State(null);
  assert.equal(state.version, 2);
  assert.equal(state.system, 'swiss'); // 未知 template → poster → swiss/S01
  assert.equal(state.recipe, 'S01');
  assert.equal(state.content.items.length, 1);
});

test('normalizeDraft：v2 原样收敛、v1 走迁移、垃圾返回 null', () => {
  const v2 = normalizeDraft({ version: 2, system: 'swiss', recipe: 'S02', theme: 'ikb', ratio: '21:9', content: { title: 'x', items: [] } });
  assert.equal(v2.state.system, 'swiss');
  assert.equal(v2.state.recipe, 'S02');
  assert.equal(v2.state.ratio, '21:9');
  assert.equal(v2.state.content.items.length, 1, '空条目补 1');

  const v1 = normalizeDraft(v1State());
  assert.equal(v1.state.version, 2);

  assert.equal(normalizeDraft(null), null);
  assert.equal(normalizeDraft('x'), null);
});
