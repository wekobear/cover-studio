import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScene } from '../src/scene.js';
import { defaultState } from '../src/state.js';

test('三模板 × 两画幅均产出尺寸正确的场景', () => {
  for (const template of ['poster', 'method', 'editorial']) {
    for (const ratio of ['3:4', '1:1']) {
      const sc = buildScene({ ...defaultState(), template, ratio }, {});
      assert.equal(sc.width, 1080);
      assert.equal(sc.height, ratio === '3:4' ? 1440 : 1080);
      assert.ok(sc.elements.length > 5, `${template}/${ratio} 应有内容`);
      assert.ok(sc.elements.every((e) => Number.isFinite(e.x ?? e.cx ?? e.x1 ?? 0)), '坐标必须是有限数');
    }
  }
});

test('空标题给出警告，长标题触发缩号或溢出提示', () => {
  const empty = buildScene({ ...defaultState(), content: { ...defaultState().content, title: '' } }, {});
  assert.ok(empty.warnings.some((w) => w.includes('主标题为空')));

  const long = buildScene({
    ...defaultState(),
    titleScale: 'l',
    content: { ...defaultState().content, title: '这是一个特别特别特别长的中文标题用于验证自动缩号行为是否生效' },
  }, {});
  assert.ok(long.warnings.some((w) => w.includes('主标题')), '长标题应有提示：' + JSON.stringify(long.warnings));
});

test('图文志：用户图片优先，其次内置插画，最后几何占位', () => {
  const DATA = 'data:image/png;base64,iVBORw0KGgo=';
  const withUser = buildScene({ ...defaultState(), template: 'editorial', image: { dataUrl: DATA } }, {});
  assert.ok(withUser.elements.some((e) => e.k === 'image' && e.href === DATA));

  const withAsset = buildScene({ ...defaultState(), template: 'editorial' }, { assetImage: DATA });
  assert.ok(withAsset.elements.some((e) => e.k === 'image' && e.href === DATA));

  const none = buildScene({ ...defaultState(), template: 'editorial' }, { preview: true, assetImage: null });
  assert.ok(!none.elements.some((e) => e.k === 'image'));
  assert.ok(none.elements.some((e) => e.k === 'circle'), '几何占位应存在');
  assert.ok(none.elements.some((e) => e.previewOnly), '预览应含上传提示');
});

test('方法卡空条目跳过，非空条目渲染序号', () => {
  const st = {
    ...defaultState(),
    template: 'method',
    content: {
      ...defaultState().content,
      items: [{ title: '只留一条', desc: '说明' }, { title: '', desc: '' }, { title: '', desc: '' }],
    },
  };
  const sc = buildScene(st, {});
  const texts = sc.elements.filter((e) => e.k === 'text').flatMap((e) => e.lines);
  assert.ok(texts.includes('只留一条'));
  assert.ok(texts.includes('01'));
  assert.ok(!texts.some((t) => t === '02'));
});

test('预览与导出共用同一模型：非占位场景输出一致', () => {
  const st = { ...defaultState(), template: 'poster', image: null };
  const a = buildScene(st, { preview: true });
  const b = buildScene(st, { preview: false });
  // poster 无 previewOnly 元素时两者图元一致
  assert.equal(a.elements.length, b.elements.length);
});
