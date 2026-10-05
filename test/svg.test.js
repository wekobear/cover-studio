import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildScene } from '../src/scene.js';
import { sceneToSVG, escapeXml } from '../src/svg.js';
import { defaultState } from '../src/state.js';

test('escapeXml 处理全部特殊字符', () => {
  assert.equal(escapeXml('<>&"\''), '&lt;&gt;&amp;&quot;&apos;');
  assert.equal(escapeXml('正常中文'), '正常中文');
  const ctrl = 'a' + String.fromCharCode(1) + 'b';
  assert.equal(escapeXml(ctrl), 'ab', '非法 XML 控制字符被剔除');
});

test('恶意输入进入 SVG 后被完整转义', () => {
  const hostile = {
    ...defaultState(),
    content: {
      ...defaultState().content,
      title: '标题<&>"\'注入',
      subtitle: '<script>alert(1)</script>',
      tags: ['<img>', 'x"y', "'&&"],
      items: [
        { title: '<b>粗</b>', desc: '<img src=x onerror=alert(1)>' },
        { title: '', desc: ']]></svg>' },
        { title: '&amp;', desc: '' },
      ],
    },
  };
  const svg = sceneToSVG(buildScene(hostile, { preview: true }), { preview: true });
  assert.ok(!svg.includes('<script'), '不能出现 script 标签');
  assert.ok(!svg.includes('onerror'), '不能出现事件属性');
  assert.ok(!svg.includes('<img '), '不能出现 img 元素');
  assert.ok(svg.includes('&amp;'), '合法实体应保留');
});

test('所有 <text> 携带场景字体栈，不出现 undefined', () => {
  for (const template of ['poster', 'method', 'editorial']) {
    const sc = buildScene({ ...defaultState(), template }, { preview: true });
    const svg = sceneToSVG(sc, { preview: true });
    assert.ok(!svg.includes('undefined'), `${template} 输出含 undefined`);
    const texts = svg.match(/<text [^>]*>/g) || [];
    assert.ok(texts.length > 0, `${template} 应有文本`);
    for (const t of texts) {
      assert.ok(t.includes('font-family="PingFang SC'), `缺少字体栈: ${t.slice(0, 80)}`);
    }
  }
});

test('两个画幅输出固定实际尺寸', () => {
  for (const [ratio, [w, h]] of [['3:4', [1080, 1440]], ['1:1', [1080, 1080]]]) {
    const sc = buildScene({ ...defaultState(), ratio }, {});
    assert.equal(sc.width, w);
    assert.equal(sc.height, h);
    const svg = sceneToSVG(sc, {});
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1080"'));
    assert.ok(svg.includes(`viewBox="0 0 1080 ${h}"`));
  }
});

test('不用 foreignObject，previewOnly 不进导出', () => {
  const emptyTitle = { ...defaultState(), template: 'editorial', content: { ...defaultState().content, title: '' } };
  const svgExport = sceneToSVG(buildScene(emptyTitle, { preview: false }), { preview: false });
  assert.ok(!svgExport.includes('foreignObject'));
  assert.ok(!svgExport.includes('输入主标题'), '导出不应包含预览占位文本');
  assert.ok(!svgExport.includes('上传图片'), '导出不应包含预览提示');
  const svgPreview = sceneToSVG(buildScene(emptyTitle, { preview: true }), { preview: true });
  assert.ok(svgPreview.includes('输入主标题'), '预览应包含占位');
});

test('图片只接受 data URL 直传，切角裁切不拉伸', () => {
  const DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const st = {
    ...defaultState(),
    template: 'editorial',
    image: { dataUrl: DATA, name: 't.png', size: 100, w: 1, h: 1 },
  };
  const svg = sceneToSVG(buildScene(st, {}), {});
  assert.ok(svg.includes(`href="${DATA}"`));
  assert.ok(svg.includes('preserveAspectRatio="xMidYMid slice"'), '保持比例裁切');
});

test('输出 SVG 通过 xmllint 良构校验', { skip: process.platform !== 'darwin' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'cw-svg-'));
  try {
    for (const tpl of ['poster', 'method', 'editorial']) {
      for (const ratio of ['3:4', '1:1']) {
        const sc = buildScene({ ...defaultState(), template: tpl, ratio }, { preview: true, assetImage: 'data:image/png;base64,iVBORw0KGgo=' });
        const p = join(dir, `${tpl}-${ratio}.svg`);
        writeFileSync(p, sceneToSVG(sc, { preview: true }));
        execFileSync('xmllint', ['--noout', p], { stdio: 'pipe' });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
