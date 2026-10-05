/* 文本清洗与计数（DOM 渲染下的最小集）。
 * cleanText：去控制字符、折叠空白；不删除用户可见内容。
 * 内容长度按 Unicode 码点计数（中文一字=1），用于上限警告与校验。
 */

/* 去除 C0 控制字符与 DEL，但保留 \t \n（由各清洗函数另行处理）。 */
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanText(input, { foldNewlines = true } = {}) {
  if (typeof input !== 'string') return '';
  let s = input.replace(CONTROL_RE, '');
  if (foldNewlines) s = s.replace(/\r\n?|[\n\t]+/g, ' ');
  return s.replace(/ {2,}/g, ' ').trim();
}

/* 标题内允许手动换行（渲染为 <br>）；统计长度时换行不计。 */
export function cleanMultiline(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_RE, '')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

export function charCount(s) {
  if (typeof s !== 'string') return 0;
  return [...s.replace(/\n/g, '')].length;
}

export function clampText(s, max) {
  const cleaned = cleanText(s);
  return [...cleaned].slice(0, max).join('');
}
