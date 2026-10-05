/* 导出：PNG（真实尺寸，来自导出专用 DOM）/ SVG（foreignObject 内嵌真实 HTML）/
 * HTML（完整单文件，无外部请求、无脚本）/ JSON（项目文件）。
 *
 * PNG 与预览共用同一 React 渲染与同一种子 CSS —— 「预览即所得」。
 * SVG 说明：与 0.2.0 的纯 <text> SVG 不同，现为 foreignObject 内嵌真实排版 DOM，
 * 文本仍是真实文字，但在 Figma 等工具中 foreignObject 支持有限（README 已如实声明）。
 */
import { getRecipe, getBoard } from './poster/model.js';
import { posterCssText } from './poster/posterCss.js';

export function exportFilename(state, ext) {
  const board = getBoard(state.ratio);
  return `封面工坊-${state.recipe}-${board.w}x${board.h}.${ext}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadText(text, filename, mime) {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

/* 导出 DOM 里的 <canvas>（WebGL 氛围层）转成 <img dataURL>：
 * html-to-image / 序列化都无法携带 canvas 本体。preserveDrawingBuffer=true 保证可读。
 * 注意：绝不能修改 React 管理的原节点（曾经直接 replaceWith 导致 React 卸载时
 * removeChild 抛 NotFoundError、整树崩溃）—— 一律先 clone 再改克隆。 */
function snapshotCanvases(node) {
  const clone = node.cloneNode(true);
  const originals = [...node.querySelectorAll('canvas')];
  const clones = [...clone.querySelectorAll('canvas')];
  originals.forEach((c, i) => {
    const img = document.createElement('img');
    img.src = c.toDataURL('image/png');
    img.className = c.className;
    img.alt = '';
    clones[i].replaceWith(img);
  });
  return clone;
}

function stripCanvases(root) {
  root.querySelectorAll('canvas').forEach((c) => c.remove());
}

export async function exportPNG(node, state) {
  const board = getBoard(state.ratio);
  const { toBlob } = await import('html-to-image');
  const clone = snapshotCanvases(node);
  /* toBlob 需要节点处于文档中才有布局测量；挂到屏外容器，导出后移除。
   * 该克隆不归 React 管，安全。 */
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:fixed;top:0;left:-20000px;z-index:-1;';
  holder.appendChild(clone);
  document.body.appendChild(holder);
  let blob = null;
  try {
    blob = await toBlob(clone, {
      width: board.w,
      height: board.h,
      pixelRatio: 1,
      skipFonts: true,
    });
  } finally {
    holder.remove();
  }
  if (!blob) throw new Error('PNG 光栅化失败');
  downloadBlob(blob, exportFilename(state, 'png'));
  return { bytes: blob.size, w: board.w, h: board.h };
}

export function exportSVG(node, state) {
  const board = getBoard(state.ratio);
  const clone = node.cloneNode(true);
  stripCanvases(clone);

  const xhtml = document.createElement('div');
  xhtml.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  xhtml.appendChild(clone);
  const style = document.createElement('style');
  style.textContent = posterCssText(state.system);
  xhtml.insertBefore(style, clone);

  const inner = new XMLSerializer().serializeToString(xhtml);
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${board.w}" height="${board.h}" viewBox="0 0 ${board.w} ${board.h}">\n` +
    `<foreignObject width="100%" height="100%">\n${inner}\n</foreignObject>\n</svg>\n`;
  downloadText(svg, exportFilename(state, 'svg'), 'image/svg+xml');
  return { bytes: new Blob([svg]).size, w: board.w, h: board.h };
}

export function exportHTML(node, state) {
  const clone = node.cloneNode(true);
  stripCanvases(clone);
  const css = posterCssText(state.system);
  const html =
    `<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n` +
    `<title>${escapeHtml(exportFilename(state, 'html'))}</title>\n` +
    `<style>\n${css}\n/* ---- export shell ---- */\n${EXPORT_SHELL_CSS}\n</style>\n</head>\n` +
    `<body class="export-body">\n<main class="sheet">\n${clone.outerHTML}\n</main>\n</body>\n</html>\n`;
  downloadText(html, exportFilename(state, 'html'), 'text/html');
  return { bytes: new Blob([html]).size };
}

const EXPORT_SHELL_CSS = `body.export-body{background:#efeeec;min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;padding:48px 24px;box-sizing:border-box;}
*,*::before,*::after{box-sizing:border-box;}`;

export function exportJSON(project) {
  const text = JSON.stringify(project, null, 2);
  downloadText(text, `封面工坊-项目-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  return { bytes: new Blob([text]).size };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

/* 供 UI 展示尺寸信息 */
export function boardMeta(state) {
  const board = getBoard(state.ratio);
  const recipe = getRecipe(state.recipe);
  return `${recipe.label} · ${board.w}×${board.h}`;
}
