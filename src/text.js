// 文本度量、中文换行与自动缩号（纯函数，可在 node:test 中直接测试）。
// SVG <text> 不会自动换行，所有换行都由这里计算；这里从不丢弃字符。

// CJK / 全宽字符区间（含假名、谚文、全角标点、全角空格）
const CJK_RE = /[ᄀ-ᇿ⺀-〿ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힯豈-﫿︐-︙︰-﹏＀-｠￠-￦]/;

// 禁则：不能出现在行首的标点 / 不能出现在行尾的标点
const NO_LINE_START = new Set(Array.from('，。、；：？！…—～·）】》〉」』”’)]}>,.?;:!?'));
const NO_LINE_END = new Set(Array.from('（【《〈「『“‘([{#'));

// 单个码点的宽度估算（以 1em 为单位）。与 PingFang / Noto Sans 的实际度量接近且偏保守。
function charUnits(ch) {
  const cp = ch.codePointAt(0);
  if (cp >= 0x1F000 || (cp >= 0xE000 && cp <= 0xF8FF)) return 1.7; // emoji / 私有区
  if (ch === ' ' || ch === '\u00a0') return 0.3;
  if (CJK_RE.test(ch)) return 1.0;
  if (/[A-Z0-9$#@%&*+=]/.test(ch)) return 0.68;
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[.,:;!'"`[\](){}<>|/^~*_%-]/.test(ch)) return 0.36;
  if (cp > 0x7f) return 0.9;
  return 0.6;
}

export function measureText(text, fontSize) {
  let u = 0;
  for (const ch of String(text)) u += charUnits(ch);
  return u * fontSize;
}

// 清理输入：去掉控制字符（保留可见内容），\r\n\t 折叠为空格
export function cleanText(s) {
  return String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\r\n\t]+/g, ' ');
}

// 把文本切成原子（码点），并标注每个原子前是否允许断行
function atomsOf(text) {
  const chars = Array.from(text);
  const atoms = [];
  let canBreakNext = false; // 行首第一个原子不可断
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const isSpace = ch === ' ' || ch === '\u00a0';
    let canBreakBefore = canBreakNext;
    if (!isSpace && NO_LINE_START.has(ch) && atoms.length) canBreakBefore = false; // 标点跟随前字
    atoms.push({ ch, w: charUnits(ch), brk: canBreakBefore });
    // CJK 字间可断；行尾禁排标点后的下一个字不断；ASCII 词内部只在空格或 -/&_ 处断
    canBreakNext = isSpace || CJK_RE.test(ch) || NO_LINE_END.has(ch) || /[-/&_]/.test(ch);
  }
  return atoms;
}

// 禁则后处理：行首禁排标点收回上一行；行尾禁排标点推到下一行
function kinsoku(lines) {
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const cur = lines[i];
    while (cur.length && NO_LINE_START.has(cur[0].ch) && prev.length) {
      prev.push(cur.shift());
    }
    if (prev.length && NO_LINE_END.has(prev[prev.length - 1].ch)) {
      cur.unshift(prev.pop());
    }
  }
  return lines;
}

export function wrapText(text, maxWidth, fontSize) {
  const atoms = atomsOf(String(text ?? ''));
  if (!atoms.length) return { lines: [], width: 0 };
  const lines = [[]];
  let w = 0;
  let lastBrk = -1; // 当前行内最后一个「其前可断」原子的下标
  for (const a of atoms) {
    const aw = a.w * fontSize;
    const nw = w + aw;
    if (w > 0 && nw > maxWidth) {
      if (a.brk) {
        lines.push([a]); w = aw; lastBrk = -1;
        continue;
      }
      // 当前原子不可断且将溢出：回溯到行内最后一个断点
      if (lastBrk > 0) {
        const cur = lines[lines.length - 1];
        const tail = cur.splice(lastBrk);
        lines.push(tail);
        w = tail.reduce((s, x) => s + x.w * fontSize, 0);
        lastBrk = -1;
        for (let k = 1; k < tail.length; k++) if (tail[k].brk) lastBrk = k;
        tail.push(a); w += aw;
        if (a.brk) lastBrk = tail.length - 1;
        continue;
      }
      // 无断点（不可断的长串）：先继续追加，后面逐字硬拆
    }
    lines[lines.length - 1].push(a);
    if (a.brk) lastBrk = lines[lines.length - 1].length - 1;
    w += aw;
  }
  // 单行内容仍超宽（如超长英文串）：逐字硬拆，保证不丢字
  const out = [];
  for (const line of lines) {
    let cur = [];
    let cw = 0;
    for (const a of line) {
      const aw = a.w * fontSize;
      if (cw + aw > maxWidth && cur.length) { out.push(cur); cur = []; cw = 0; }
      cur.push(a); cw += aw;
    }
    out.push(cur);
  }
  kinsoku(out);
  const lineStrs = out
    .map((l) => l.map((a) => a.ch).join(''))
    .map((s) => s.replace(/^ +/, '').replace(/ +$/, ''))
    .filter((s) => s.length > 0);
  const width = lineStrs.reduce((m, s) => Math.max(m, measureText(s, fontSize)), 0);
  return { lines: lineStrs, width };
}

// 在 maxLines 内尽量放下：逐步缩小字号，不截断；放不下时返回 overflow 标记
export function fitText(text, maxWidth, maxLines, baseFontSize, { minRatio = 0.6 } = {}) {
  const t = String(text ?? '');
  if (!t.trim()) return { lines: [], fontSize: baseFontSize, shrunk: false, overflow: false };
  const minFs = baseFontSize * minRatio;
  let fs = baseFontSize;
  let r = wrapText(t, maxWidth, fs);
  while (r.lines.length > maxLines && fs > minFs) {
    fs = Math.max(minFs, fs * 0.92);
    r = wrapText(t, maxWidth, fs);
  }
  return {
    lines: r.lines,
    fontSize: fs,
    shrunk: fs < baseFontSize,
    overflow: r.lines.length > maxLines,
  };
}
