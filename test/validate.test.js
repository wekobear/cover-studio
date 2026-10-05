import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProject, projectFromState, PROJECT_FORMAT } from '../src/validate.js';
import { defaultState } from '../src/state.js';

const DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function validProject() {
  return projectFromState(defaultState());
}

test('完整状态导出后再导入应通过', () => {
  const p = validProject();
  const v = validateProject(p);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.state.content.title, defaultState().content.title);
  assert.equal(v.state.content.items.length, 3);
});

test('format / version 不匹配被拒绝', () => {
  assert.equal(validateProject({ format: 'other', version: 1 }).ok, false);
  assert.equal(validateProject({ format: PROJECT_FORMAT, version: 2 }).ok, false);
  assert.equal(validateProject(null).ok, false);
  assert.equal(validateProject('x').ok, false);
  assert.equal(validateProject([]).ok, false);
});

test('超长字符串与非法类型被拒绝', () => {
  const p = validProject();
  p.state.content.title = '一'.repeat(27);
  p.state.content.tags = ['a', 'b', 'c', 'd'];
  p.state.content.items = [{ title: 'x'.repeat(13), desc: '' }, null, {}];
  const v = validateProject(p);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes('主标题')));
  assert.ok(v.errors.some((e) => e.includes('标签')));
  assert.ok(v.errors.some((e) => e.includes('条目')));
});

test('图片只允许 png/jpeg/webp data URL，拒绝任意 URL 注入', () => {
  for (const bad of [
    'https://evil.com/x.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,PGI+',
    'data:image/png;base64,@@@',
    '',
  ]) {
    const p = validProject();
    p.state.image = { dataUrl: bad, name: 'x', size: 10, w: 1, h: 1 };
    const v = validateProject(p);
    assert.equal(v.ok, false, `应拒绝 ${bad.slice(0, 30)}`);
  }
  const okP = validProject();
  okP.state.image = { dataUrl: DATA, name: 'a.png', size: 95, w: 1, h: 1 };
  const v2 = validateProject(okP);
  assert.equal(v2.ok, true, JSON.stringify(v2.errors));
  assert.equal(v2.state.image.dataUrl, DATA);
});

test('图片体积超过 5MB 被拒绝', () => {
  const p = validProject();
  const big = 'data:image/png;base64,' + 'A'.repeat(Math.ceil((5 * 1024 * 1024 + 1024) * 4 / 3));
  p.state.image = { dataUrl: big, name: 'big.png', size: 5 * 1024 * 1024 + 1, w: 100, h: 100 };
  assert.equal(validateProject(p).ok, false);
});

test('非法枚举值被拒绝并回退默认', () => {
  const p = validProject();
  p.state.template = 'mall';
  p.state.ratio = '16:9';
  p.state.theme = 'neon';
  p.state.titleScale = 'xxl';
  const v = validateProject(p);
  assert.equal(v.ok, false);
  assert.equal(v.state.template, 'poster');
  assert.equal(v.state.ratio, '3:4');
});

test('缺省可选字段可导入', () => {
  const p = validProject();
  delete p.state.content.tags;
  delete p.state.content.items;
  p.state.image = null;
  const v = validateProject(p);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.deepEqual(v.state.content.tags, []);
  assert.equal(v.state.image, null);
});
