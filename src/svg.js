// 把 buildScene 的图元列表序列化为 SVG 字符串。
// 只使用基础元素（rect / circle / line / polyline / text / image / clipPath），不用 foreignObject。
// 所有用户输入文本都经过 escapeXml；图片只允许 data: URL（由上游保证）。

export function escapeXml(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20 && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d) continue; // XML 非法字符
    if (cp === 0xfffe || cp === 0xffff) continue;
    switch (ch) {
      case '&': out += '&amp;'; break;
      case '<': out += '&lt;'; break;
      case '>': out += '&gt;'; break;
      case '"': out += '&quot;'; break;
      case "'": out += '&apos;'; break;
      default: out += ch;
    }
  }
  return out;
}

const fmt = (n) => {
  const v = Math.round(Number(n) * 100) / 100;
  return Number.isFinite(v) ? String(v) : '0';
};

function serialize(el, preview, defs, seed, family) {
  const op = el.opacity != null ? ` opacity="${fmt(el.opacity)}"` : '';
  switch (el.k) {
    case 'rect':
      return `<rect x="${fmt(el.x)}" y="${fmt(el.y)}" width="${fmt(el.w)}" height="${fmt(el.h)}" fill="${el.fill}"${el.rx != null ? ` rx="${fmt(el.rx)}"` : ''}${op}/>`;
    case 'circle':
      return `<circle cx="${fmt(el.cx)}" cy="${fmt(el.cy)}" r="${fmt(el.r)}" fill="${el.fill}"${op}/>`;
    case 'line':
      return `<line x1="${fmt(el.x1)}" y1="${fmt(el.y1)}" x2="${fmt(el.x2)}" y2="${fmt(el.y2)}" stroke="${el.stroke}" stroke-width="${fmt(el.w)}"${op}/>`;
    case 'poly': {
      const pts = el.points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${el.stroke}" stroke-width="${fmt(el.w)}"${el.dash ? ` stroke-dasharray="${el.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"${op}/>`;
    }
    case 'text': {
      const attrs = [
        `x="${fmt(el.x)}"`, `y="${fmt(el.y)}"`,
        `font-family="${el.family || family}"`, `font-size="${fmt(el.size)}"`, `fill="${el.fill}"`,
      ];
      if (el.weight) attrs.push(`font-weight="${el.weight}"`);
      if (el.ls != null) attrs.push(`letter-spacing="${fmt(el.ls)}"`);
      if (el.anchor) attrs.push(`text-anchor="${el.anchor}"`);
      if (el.opacity != null) attrs.push(`opacity="${fmt(el.opacity)}"`);
      const spans = el.lines.map((line, i) => (
        `<tspan x="${fmt(el.x)}"${i === 0 ? ' dy="0"' : ` dy="${fmt(el.lh)}"`}>${escapeXml(line)}</tspan>`
      )).join('');
      return `<text ${attrs.join(' ')}>${spans}</text>`;
    }
    case 'image': {
      seed.n += 1;
      const id = `cw-img-${seed.n}`;
      defs.push(`<clipPath id="${id}"><rect x="${fmt(el.x)}" y="${fmt(el.y)}" width="${fmt(el.w)}" height="${fmt(el.h)}"${el.rx != null ? ` rx="${fmt(el.rx)}"` : ''}/></clipPath>`);
      return `<image x="${fmt(el.x)}" y="${fmt(el.y)}" width="${fmt(el.w)}" height="${fmt(el.h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" href="${el.href}"/>`;
    }
    default:
      return '';
  }
}

export function sceneToSVG(scene, { preview = false } = {}) {
  const defs = [];
  const seed = { n: 0 };
  const family = scene.fontStack; // 所有文本统一回退到场景字体栈
  const body = [];
  for (const el of scene.elements) {
    if (el.previewOnly && !preview) continue;
    body.push(serialize(el, preview, defs, seed, family));
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">`,
    '<defs>',
    `<clipPath id="cw-frame"><rect x="0" y="0" width="${scene.width}" height="${scene.height}"/></clipPath>`,
    ...defs,
    '</defs>',
    '<g clip-path="url(#cw-frame)">',
    ...body,
    '</g>',
    '</svg>',
  ].join('\n');
}
