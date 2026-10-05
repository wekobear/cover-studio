import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProject, projectFromState, PROJECT_FORMAT, PROJECT_VERSION, DATAURL_RE } from '../src/validate.js';
import { defaultState } from '../src/store.js';

const DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function validProject() {
  return projectFromState(defaultState());
}

test('v2 状态导出→再导入 round-trip 通过且内容一致', () => {
  const p = validProject();
  const v = validateProject(p);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  const d = defaultState();
  assert.equal(v.state.system, d.system);
  assert.equal(v.state.recipe, d.recipe);
  assert.equal(v.state.theme, d.theme);
  assert.equal(v.state.ratio, d.ratio);
  assert.equal(v.state.content.title, d.content.title);
  assert.equal(v.state.content.items.length, 3);
  assert.equal(v.migrated, undefined);
});

test('projectFromState：无图片时不写 image 字段，有图片时内嵌 dataUrl', () => {
  assert.equal('image' in validProject().state, false);
  const withImg = projectFromState(defaultState(), { source: 'upload', dataUrl: DATA });
  assert.equal(withImg.state.image.dataUrl, DATA);
  assert.equal(withImg.state.image.source, 'upload');
});

test('format / version 不匹配被拒绝', () => {
  assert.equal(validateProject({ format: 'other', version: 2 }).ok, false);
  assert.equal(validateProject({ format: PROJECT_FORMAT, version: 3 }).ok, false);
  assert.equal(validateProject(null).ok, false);
  assert.equal(validateProject('x').ok, false);
  assert.equal(validateProject([]).ok, false);
  assert.equal(validateProject({ format: PROJECT_FORMAT, version: PROJECT_VERSION }).ok, false, '缺 state 拒绝');
});

test('非法枚举被拒绝：体系/配方错配、跨体系主题、非法画幅', () => {
  const mk = (patch) => {
    const p = validProject();
    Object.assign(p.state, patch);
    return p;
  };
  assert.equal(validateProject(mk({ system: 'mall' })).ok, false);
  assert.equal(validateProject(mk({ recipe: 'X99' })).ok, false);
  /* S01 属于 swiss，不属于 editorial */
  const v = validateProject(mk({ system: 'editorial', recipe: 'S01' }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('不属于体系')));
  /* ikb 是 swiss 主题（配方同步为 S 系） */
  const v2 = validateProject(mk({ system: 'swiss', recipe: 'S01', theme: 'ikb' }));
  assert.equal(v2.ok, true, 'swiss+S01+ikb 合法');
  assert.equal(validateProject(mk({ theme: 'ink-classic', system: 'swiss' })).ok, false);
  assert.equal(validateProject(mk({ ratio: '16:9' })).ok, false);
});

test('超长字符串与非法类型被拒绝（中文计数按码点）', () => {
  const p = validProject();
  p.state.content.title = '一'.repeat(27);
  p.state.content.tags = ['a', 'b', 'c', 'd'];
  p.state.content.items = [{ title: 'x'.repeat(13), desc: '' }];
  const v = validateProject(p);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('主标题')));
  assert.ok(v.errors.some((e) => e.includes('标签')));
  assert.ok(v.errors.some((e) => e.includes('条目 1 标题')));
});

test('条目数量 0 / 6 被拒绝', () => {
  const p0 = validProject();
  p0.state.content.items = [];
  assert.equal(validateProject(p0).ok, false);
  const p6 = validProject();
  p6.state.content.items = Array.from({ length: 6 }, () => ({ title: 'a', desc: 'b' }));
  assert.equal(validateProject(p6).ok, false);
});

test('图片仅接受 png/jpeg/webp base64 data URL，拒绝注入', () => {
  for (const bad of [
    'https://evil.com/x.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,PGI+',
    'data:image/png;base64,@@@',
    'data:image/png;base64,iVBORw0KGgo\ngo',
    '',
  ]) {
    assert.equal(DATAURL_RE.test(bad), false, `regex 应拒绝 ${bad.slice(0, 30)}`);
    const p = validProject();
    p.state.image = { dataUrl: bad, source: 'upload' };
    assert.equal(validateProject(p).ok, false, `校验应拒绝 ${bad.slice(0, 30)}`);
  }
  const okP = validProject();
  okP.state.image = { dataUrl: DATA, source: 'upload' };
  const v2 = validateProject(okP);
  assert.equal(v2.ok, true, JSON.stringify(v2.errors));
  assert.equal(v2.state.image.dataUrl, DATA);
});

test('图片体积超过 5MB 被拒绝（按 base64 反推字节数）', () => {
  const p = validProject();
  const big = 'data:image/png;base64,' + 'A'.repeat(Math.ceil((5 * 1024 * 1024 + 1024) * 4 / 3));
  p.state.image = { dataUrl: big, source: 'upload' };
  assert.equal(validateProject(p).ok, false);
});

test('v1 项目导入：走迁移，返回 migrated 与可解释说明', () => {
  const v1 = {
    format: PROJECT_FORMAT,
    version: 1,
    state: {
      version: 1,
      template: 'method',
      theme: 'cream',
      ratio: '1:1',
      titleScale: 'l',
      content: {
        title: '三步选城市',
        subtitle: '方法卡内容',
        signature: 'Weko',
        tags: ['a'],
        items: [
          { title: '一', desc: 'd1' },
          { title: '二', desc: 'd2' },
          { title: '三', desc: 'd3' },
        ],
      },
    },
  };
  const v = validateProject(v1);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.migrated, true);
  assert.equal(v.state.system, 'swiss');
  assert.equal(v.state.recipe, 'S05');
  assert.equal(v.state.theme, 'lemon-yellow');
  assert.equal(v.state.ratio, '1:1');
  assert.equal(v.state.content.title, '三步选城市');
  assert.equal(v.state.image, null, 'v1 无图片 → 迁移后 image 为 null');
  assert.ok(Array.isArray(v.migrationNotes) && v.migrationNotes.length === 3);
  assert.ok(v.migrationNotes.join('').includes('S05'));
});

test('v1 项目携带合法图片：dataUrl 经校验后保留到迁移结果', () => {
  const v1 = {
    format: PROJECT_FORMAT,
    version: 1,
    state: {
      template: 'editorial',
      theme: 'paper',
      ratio: '3:4',
      content: {
        title: '兼容测试',
        subtitle: '',
        signature: '',
        tags: [],
        items: [{ title: '1', desc: '' }],
      },
      image: { dataUrl: DATA, name: 'old.png', size: 95, w: 1, h: 1 },
    },
  };
  const v = validateProject(v1);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.migrated, true);
  assert.equal(v.state.system, 'editorial');
  assert.equal(v.state.recipe, 'M01');
  assert.equal(v.state.image.source, 'upload');
  assert.equal(v.state.image.dataUrl, DATA, '旧图片 dataUrl 原样保留');
});

test('v1 非法同样拒绝：坏图片 / 坏枚举 / 坏内容', () => {
  const base = {
    format: PROJECT_FORMAT,
    version: 1,
    state: {
      template: 'editorial',
      theme: 'paper',
      ratio: '3:4',
      content: { title: 't', subtitle: '', signature: '', tags: [], items: [{ title: 'a', desc: '' }] },
    },
  };
  const badImg = structuredClone(base);
  badImg.state.image = { dataUrl: 'javascript:alert(1)', name: 'x', size: 1, w: 1, h: 1 };
  assert.equal(validateProject(badImg).ok, false, '非法图片 dataUrl 拒绝');

  const badTpl = structuredClone(base);
  badTpl.state.template = 'mall';
  assert.equal(validateProject(badTpl).ok, false, '非法 template 拒绝');

  const badTheme = structuredClone(base);
  badTheme.state.theme = 'neon';
  assert.equal(validateProject(badTheme).ok, false, '非法 theme 拒绝');

  const badRatio = structuredClone(base);
  badRatio.state.ratio = '21:9';
  assert.equal(validateProject(badRatio).ok, false, 'v1 不存在 21:9，拒绝');

  const badTitle = structuredClone(base);
  badTitle.state.content.title = '一'.repeat(27);
  assert.equal(validateProject(badTitle).ok, false, '超限内容拒绝');
});

test('12MB 文本上限先于解析生效', () => {
  const huge = 'x'.repeat(12 * 1024 * 1024 + 1);
  const v = validateProject({ format: PROJECT_FORMAT, version: 2 }, huge);
  assert.equal(v.ok, false);
  assert.ok(v.errors[0].includes('12MB'));
});

test('缺省可选字段可导入并补默认', () => {
  const p = validProject();
  delete p.state.content.tags;
  delete p.state.content.items;
  p.state.image = null;
  const v = validateProject(p);
  assert.equal(v.ok, false, 'items 缺失被拒绝（必填 1–5 条）');
  const p2 = validProject();
  delete p2.state.content.tags;
  p2.state.image = null;
  const v2 = validateProject(p2);
  assert.equal(v2.ok, true, JSON.stringify(v2.errors));
  assert.deepEqual(v2.state.content.tags, []);
  assert.equal(v2.state.image, null);
});

test('导入内容经清洗：控制字符/多余空白不进入渲染', () => {
  const p = validProject();
  p.state.content.kicker = '  城市 选择  · City ';
  p.state.content.title = ' 标题一 \n\n 标题二 ';
  const v = validateProject(p);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.state.content.kicker, '城市 选择 · City');
  assert.equal(v.state.content.title, '标题一\n标题二');
});
