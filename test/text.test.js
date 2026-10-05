import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, cleanMultiline, charCount, clampText } from '../src/text.js';

test('cleanText 去控制字符并折叠空白', () => {
  const ctrl = String.fromCharCode(1) + 'a' + String.fromCharCode(31);
  assert.equal(cleanText(ctrl), 'a');
  assert.equal(cleanText('a\r\nb\tc'), 'a b c');
  assert.equal(cleanText('两  个  空格'), '两 个 空格');
  assert.equal(cleanText(undefined), '');
  assert.equal(cleanText(null), '');
  assert.equal(cleanText(123), '');
});

test('cleanText 保留 \t 与 \n 折叠选项', () => {
  assert.equal(cleanText('a\nb', { foldNewlines: false }), 'a\nb');
  assert.equal(cleanText('a\tb', { foldNewlines: false }), 'a\tb');
});

test('cleanMultiline 保留手动换行并整理每行', () => {
  assert.equal(cleanMultiline('毕业后，\r\n去哪座城？'), '毕业后，\n去哪座城？');
  assert.equal(cleanMultiline('  a  \n\n  b  '), 'a\nb');
  assert.equal(cleanMultiline('ab'), 'ab');
  assert.equal(cleanMultiline(''), '');
  assert.equal(cleanMultiline(null), '');
});

test('charCount 按码点计数且不计换行', () => {
  assert.equal(charCount('城市选择'), 4);
  assert.equal(charCount('毕业后，\n去哪座城？'), 9);
  assert.equal(charCount('𝒜𝒷'), 2); // surrogate pairs count as one each
  assert.equal(charCount('hello world'), 11);
  assert.equal(charCount(undefined), 0);
});

test('clampText 清洗后按码点截断', () => {
  assert.equal(clampText('一二三四五', 3), '一二三');
  assert.equal(clampText('  一  二  ', 10), '一 二');
  assert.equal(clampText('a\nb\nc', 10), 'a b c');
});
