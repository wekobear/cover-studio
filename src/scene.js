// 封面渲染模型：buildScene(state) 输出与 DOM 无关的图元列表，
// 预览（index.html 注入）与导出（SVG / PNG）共用这一份模型，保证所见即所得。
import { cleanText, fitText, measureText } from './text.js';
import { FONT_STACK, RATIOS, THEMES, TITLE_SCALES } from './themes.js';

export function buildScene(state, opts = {}) {
  const preview = !!opts.preview;
  const ratio = RATIOS[state.ratio] ? state.ratio : '3:4';
  const { w: W, h: H } = RATIOS[ratio];
  const th = THEMES[state.theme] || THEMES.paper;
  const c = state.content;
  const M = 92;
  const tall = H > W; // 3:4 为 true，1:1 为 false
  const scale = TITLE_SCALES[state.titleScale] || 1;

  const els = [];
  const warns = [];
  const add = (el) => els.push(el);
  const txt = (lines, o) => {
    if (!lines.length) return null;
    return add({ k: 'text', lines, lh: o.lh, x: o.x, y: o.y, size: o.size, fill: o.fill, weight: o.weight, ls: o.ls, anchor: o.anchor, opacity: o.opacity, previewOnly: o.previewOnly });
  };

  add({ k: 'rect', x: 0, y: 0, w: W, h: H, fill: th.bg });

  const tags = (c.tags || []).map((t) => clean(t)).filter(Boolean).slice(0, 3);
  const sig = clean(c.signature);
  const title = clean(c.title);

  // ---------- 公共小组件 ----------
  function chipsRow(y, maxRows = 2) {
    const fs = 30, chipH = 56, padX = 26, gap = 16;
    const maxW = W - 2 * M;
    let cx = M, cy = y, rows = 1;
    tags.forEach((t, i) => {
      const tw = measureText(t, fs) + padX * 2;
      if (cx > M && cx + tw > M + maxW) { cx = M; cy += chipH + 14; rows++; }
      if (rows > maxRows) { warns.push('标签较多，超出部分未显示'); return; }
      add({ k: 'rect', x: cx, y: cy, w: tw, h: chipH, rx: chipH / 2, fill: i === 0 ? th.accent : th.panel });
      txt([t], { x: cx + padX, y: cy + chipH / 2 + fs * 0.36, size: fs, lh: fs * 1.3, fill: i === 0 ? th.bg : th.ink });
      cx += tw + gap;
    });
    return cy + chipH; // 底边
  }

  function signature(y) {
    if (!sig) return;
    txt([sig], { x: M, y, size: 30, lh: 40, fill: th.faint });
  }

  // 标题统一处理：自动缩号、溢出警告、空标题占位（占位只在预览显示）
  function titleBlock({ baseFs, top, maxLines, maxW }) {
    if (!title) {
      warns.push('主标题为空：导出将不包含标题文字');
      if (preview) txt(['输入主标题'], { x: M, y: top, size: baseFs, lh: baseFs * 1.24, fill: th.ink, opacity: 0.25, previewOnly: true });
      return { bottom: top, fs: baseFs, lines: 0 };
    }
    const r = fitText(title, maxW, maxLines, baseFs);
    if (r.overflow) warns.push('主标题较长：自动缩小后仍可能超出，建议精简');
    else if (r.shrunk) warns.push('主标题较长：已自动缩小字号');
    const lh = r.fontSize * 1.24;
    r.lines.forEach((line, i) => {
      txt([line], { x: M, y: top + i * lh, size: r.fontSize, lh, fill: i === r.lines.length - 1 ? th.accent : th.ink, weight: 700 });
    });
    return { bottom: top + (r.lines.length - 1) * lh, fs: r.fontSize, lines: r.lines.length };
  }

  function subBlock({ top, fs, maxLines, maxW, gap }) {
    const s = clean(c.subtitle);
    if (!s) return top - gap;
    const r = fitText(s, maxW, maxLines, fs, { minRatio: 0.7 });
    if (r.overflow) warns.push('副标题过长：自动缩小后仍可能超出，建议精简');
    const lh = r.fontSize * 1.35;
    r.lines.forEach((line, i) => {
      txt([line], { x: M, y: top + i * lh, size: r.fontSize, lh, fill: th.muted });
    });
    return top + (r.lines.length - 1) * lh;
  }

  // ---------- 模板 1：大字报 ----------
  if (state.template === 'poster') {
    chipsRow(tall ? 100 : 92);
    const t = titleBlock({ baseFs: (tall ? 148 : 130) * scale, top: tall ? 336 : 288, maxLines: 3, maxW: W - 2 * M });
    subBlock({ top: t.bottom + (tall ? 90 : 72), fs: tall ? 44 : 38, maxLines: tall ? 2 : 1, maxW: W - 2 * M, gap: 40 });

    const routeY = tall ? 880 : 640;
    const ground = tall ? 1260 : 940;
    const pts = tall
      ? [[M, routeY + 20], [300, routeY - 50], [520, routeY + 4], [760, routeY - 74], [W - M, routeY - 18]]
      : [[M, routeY + 16], [320, routeY - 40], [540, routeY + 2], [760, routeY - 58], [W - M, routeY - 10]];
    add({ k: 'poly', points: pts, stroke: th.ink, w: 6, dash: '2 20', opacity: 0.75 });
    pts.forEach(([x, y], i) => add({ k: 'circle', cx: x, cy: y, r: i % 2 === 0 ? 12 : 10, fill: i % 2 === 0 ? th.accent : th.ink, opacity: 0.9 }));

    const heights = [230, 310, 170, 380, 260, 130, 300, 200];
    const s = (ground - routeY - 40) / 380;
    heights.forEach((h0, i) => {
      const h = h0 * s;
      const x = M + i * 106;
      const y = ground - h;
      const accent = i === 3;
      add({ k: 'rect', x, y, w: 88, h, fill: accent ? th.accent : th.deco });
      if (accent && h > 240) {
        for (let r = 0; r < 3; r++) {
          add({ k: 'rect', x: x + 20, y: y + 32 + r * 56, w: 16, h: 16, fill: th.bg });
          add({ k: 'rect', x: x + 52, y: y + 32 + r * 56, w: 16, h: 16, fill: th.bg });
        }
      } else if (i === 1 || i === 6) {
        add({ k: 'rect', x: x + 16, y: y + 28, w: 12, h: 12, fill: th.panel });
        add({ k: 'rect', x: x + 44, y: y + 28, w: 12, h: 12, fill: th.panel });
      }
    });
    signature(tall ? H - 72 : H - 60);
  }

  // ---------- 模板 2：方法卡 ----------
  if (state.template === 'method') {
    const ky = tall ? 88 : 80;
    add({ k: 'rect', x: M, y: ky, w: 44, h: 44, fill: th.accent });
    const kicker = tags.length ? tags.join(' · ') : 'METHOD · 方法卡';
    const kr = fitText(kicker, W - 2 * M - 62, 1, 30, { minRatio: 0.6 });
    txt(kr.lines, { x: M + 62, y: ky + 33 + (30 - kr.fontSize) * 0.4, size: kr.fontSize, lh: 40, fill: th.muted, ls: 4 });

    const t = titleBlock({ baseFs: (tall ? 116 : 100) * scale, top: tall ? 318 : 276, maxLines: 2, maxW: W - 2 * M });
    const divY = t.bottom + (tall ? 44 : 36);
    add({ k: 'rect', x: M, y: divY, w: W - 2 * M, h: 4, fill: th.ink });

    const top = divY + (tall ? 56 : 46);
    const bottom = tall ? H - 150 : H - 120;
    const slotH = (bottom - top) / 3;
    const numFs = tall ? 100 : 76;
    const titleFs = tall ? 54 : 44;
    const descFs = tall ? 34 : 28;
    const colX = M + (tall ? 320 : 250);
    const colW = W - M - colX - 8;

    (c.items || []).slice(0, 3).forEach((item, i) => {
      const it = clean(item && item.title);
      const id = clean(item && item.desc);
      if (!it && !id) return;
      const sy = top + i * slotH;
      txt([String(i + 1).padStart(2, '0')], { x: M, y: sy + numFs, size: numFs, lh: numFs, fill: th.accent, weight: 800 });
      let by = sy + titleFs + 6;
      if (it) {
        const r = fitText(it, colW, 1, titleFs, { minRatio: 0.6 });
        r.lines.forEach((line, j) => txt([line], { x: colX, y: by + j * (titleFs * 1.3), size: r.fontSize, lh: titleFs * 1.3, fill: th.ink, weight: 700 }));
        by += titleFs * 1.3;
      }
      if (id) {
        const r = fitText(id, colW, 2, descFs, { minRatio: 0.7 });
        if (r.overflow) warns.push(`条目 ${i + 1} 说明过长：建议精简`);
        r.lines.forEach((line, j) => txt([line], { x: colX, y: by + 8 + j * (descFs * 1.4), size: r.fontSize, lh: descFs * 1.4, fill: th.muted }));
      }
    });
    signature(tall ? H - 72 : H - 60);
  }

  // ---------- 模板 3：图文志 ----------
  if (state.template === 'editorial') {
    chipsRow(tall ? 104 : 96, 1);
    const t = titleBlock({ baseFs: (tall ? 116 : 102) * scale, top: tall ? 356 : 306, maxLines: tall ? 3 : 2, maxW: W - 2 * M });
    // 图文志标题全部用主色（末行不换橙色），上面 titleBlock 的末行橙色不适合插画版式
    const sb = subBlock({ top: t.bottom + (tall ? 62 : 50), fs: tall ? 38 : 34, maxLines: tall ? 2 : 1, maxW: W - 2 * M, gap: 40 });
    add({ k: 'rect', x: M, y: sb + (tall ? 56 : 44), w: 72, h: 10, fill: th.accent });

    const y0 = tall ? 820 : 586;
    const y1 = tall ? H - 150 : H - 128;
    const iw = W - 2 * M;
    const ih = y1 - y0;
    const src = state.image && state.image.dataUrl ? state.image : (opts.assetImage ? { dataUrl: opts.assetImage } : null);
    if (src) {
      add({ k: 'image', x: M, y: y0, w: iw, h: ih, rx: 26, href: src.dataUrl });
    } else {
      add({ k: 'rect', x: M, y: y0, w: iw, h: ih, rx: 26, fill: th.panel, opacity: 0.55 });
      const cy = y0 + ih * 0.4;
      add({ k: 'circle', cx: W / 2, cy, r: tall ? 64 : 52, fill: th.accent });
      add({ k: 'line', x1: M + 44, y1: cy + (tall ? 96 : 84), x2: W - M - 44, y2: cy + (tall ? 96 : 84), stroke: th.deco, w: 4 });
      const bh = [40, 66, 52, 84, 46];
      bh.forEach((h, i) => add({ k: 'rect', x: M + 120 + i * 92, y: y1 - 36 - h, w: 38, h, fill: th.deco }));
      txt(['上传图片，或使用内置插画'], { x: W / 2, y: cy - (tall ? 96 : 84), size: 34, lh: 46, fill: th.muted, anchor: 'middle', previewOnly: true });
    }
    signature(tall ? H - 70 : H - 58);
  }

  return { width: W, height: H, fontStack: FONT_STACK, template: state.template, theme: state.theme, ratio, elements: els, warnings: warns };
}

function clean(s) {
  return cleanText(s).trim();
}
