/* 供导出（SVG/HTML）内联使用的海报 CSS 原文。?raw 由 Vite 处理：构建产物中即字符串。 */
import editorialCss from './css/editorial.css?raw';
import swissCss from './css/swiss.css?raw';
import extrasCss from './css/extras.css?raw';

export function posterCssText(system) {
  const base = system === 'swiss' ? swissCss : editorialCss;
  return `${base}\n/* ---- extras (cover-workshop recipe glue) ---- */\n${extrasCss}`;
}

export const posterCssAll = `${editorialCss}\n${swissCss}\n${extrasCss}`;
