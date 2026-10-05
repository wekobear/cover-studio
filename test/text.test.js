import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, fitText, measureText, cleanText } from '../src/text.js';

test('中文按宽度断行且不丢字', () => {
  const r = wrapText('毕业后去哪座城市工作生活', 500, 100);
  assert.ok(r.lines.length >= 2, '应换行');
  assert.equal(r.lines.join(''), '毕业后去哪座城市工作生活', '拼回原文不丢字');
  for (const line of r.lines) assert.ok(measureText(line, 100) <= 500 + 100, '行宽不溢出过多');
});

test('ASCII 词在空格处断行，词内空格保留', () => {
  const r = wrapText('hello world wide web', 300, 60);
  assert.deepEqual(r.lines, ['hello', 'world', 'wide web']);
});

test('行首禁排标点收回上一行', () => {
  const r = wrapText('城市选择，先看三件事', 400, 100);
  for (const line of r.lines) {
    assert.ok(!'，。、；：？！'.startsWith(line[0]) || !'，。、；：？！'.includes(line[0]), '行首不应出现句读');
  }
  assert.equal(r.lines.join(''), '城市选择，先看三件事'.replace(' ', ''), '内容不丢失');
});

test('超长不可断英文串被逐字硬拆', () => {
  const r = wrapText('aaaaaaaaaaaaaaaaaaaaaaaaaaaa', 300, 60);
  assert.ok(r.lines.length > 1);
  assert.equal(r.lines.join(''), 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
});

test('空串与空白', () => {
  assert.deepEqual(wrapText('', 500, 100).lines, []);
  assert.deepEqual(wrapText('   ', 500, 100).lines, []);
});

test('fitText 自动缩号并标记', () => {
  const long = '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十';
  const r = fitText(long, 500, 2, 148);
  assert.ok(r.shrunk, '应触发缩号');
  assert.ok(r.fontSize < 148);
  assert.ok(r.lines.length <= 2 || r.overflow, '缩号后放下或标记溢出');
  const short = fitText('短标题', 896, 3, 148);
  assert.equal(short.shrunk, false);
  assert.equal(short.overflow, false);
});

test('measureText 中文按 1em 计', () => {
  assert.equal(measureText('城市选择', 100), 400);
});

test('cleanText 去控制字符并折叠换行', () => {
  const ctrl = String.fromCharCode(1) + 'a' + String.fromCharCode(31);
  assert.equal(cleanText(ctrl), 'a');
  assert.equal(cleanText('a\r\nb\tc'), 'a b c');
  assert.equal(cleanText(undefined), '');
});
