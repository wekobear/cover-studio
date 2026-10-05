import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStoredImage, addItem, removeItem, updateItem } from '../src/store.js';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('normalizeStoredImage：0.2.0 对象形态与 0.3.0 字符串形态都归一为合法 dataUrl', () => {
  assert.equal(normalizeStoredImage(PNG_1PX), PNG_1PX, '新字符串形态');
  assert.equal(
    normalizeStoredImage({ dataUrl: PNG_1PX, name: 'old.png', size: 95, w: 1, h: 1 }),
    PNG_1PX,
    '旧对象形态（v0.2.0 IndexedDB 记录）',
  );
});

test('normalizeStoredImage：非法与超限返回 null', () => {
  assert.equal(normalizeStoredImage(null), null);
  assert.equal(normalizeStoredImage(undefined), null);
  assert.equal(normalizeStoredImage('https://evil.com/x.png'), null);
  assert.equal(normalizeStoredImage({}), null);
  assert.equal(normalizeStoredImage({ dataUrl: 'javascript:alert(1)', name: 'x', size: 1, w: 1, h: 1 }), null);
  const big = 'data:image/png;base64,' + 'A'.repeat(Math.ceil((5 * 1024 * 1024 + 1024) * 4 / 3));
  assert.equal(normalizeStoredImage(big), null, '超过 5MB 拒绝');
});

test('条目编辑边界：最少 1 条、最多 5 条', () => {
  const s = { content: { items: [{ title: 'a', desc: '' }] } };
  assert.equal(removeItem(s, 0).content.items.length, 1, '最后一条不可删');
  let cur = s;
  for (let i = 0; i < 7; i += 1) cur = addItem(cur);
  assert.equal(cur.content.items.length, 5, '最多 5 条');
  assert.equal(updateItem(cur, 4, 'title', 'x').content.items[4].title, 'x');
});
