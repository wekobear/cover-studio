// 导出：SVG（同渲染模型）、PNG（SVG 光栅化到固定尺寸画布）、项目 JSON。
import { buildScene } from './scene.js';
import { sceneToSVG } from './svg.js';
import { getEditorialAsset } from './asset.js';
import { projectFromState } from './validate.js';
import { TEMPLATES } from './themes.js';

export async function renderExportSVG(state) {
  let asset = null;
  try { asset = await getEditorialAsset(); } catch { asset = null; }
  const scene = buildScene(state, { preview: false, assetImage: asset });
  return { svg: sceneToSVG(scene, { preview: false }), scene };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function fileName(state, ext, scene) {
  const label = TEMPLATES[state.template] ? TEMPLATES[state.template].label : state.template;
  return `封面工坊-${label}-${scene.width}x${scene.height}.${ext}`;
}

export async function downloadSVG(state) {
  const { svg, scene } = await renderExportSVG(state);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, fileName(state, 'svg', scene));
  return { bytes: blob.size, width: scene.width, height: scene.height };
}

// 先把 SVG 内的 data: 图片预热解码，避免光栅化竞态
async function preloadDataUrls(svg) {
  const urls = [...svg.matchAll(/href="(data:image\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.all(urls.map((u) => new Promise((res) => {
    const im = new Image();
    im.onload = im.onerror = () => res();
    im.src = u;
  })));
}

export async function downloadPNG(state) {
  const { svg, scene } = await renderExportSVG(state);
  await preloadDataUrls(svg);
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('SVG 渲染失败'));
      im.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = scene.width;   // 固定实际尺寸 1080×1440 / 1080×1080
    canvas.height = scene.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, scene.width, scene.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG 生成失败');
    triggerDownload(blob, fileName(state, 'png', scene));
    return { bytes: blob.size, width: scene.width, height: scene.height };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function downloadProject(state) {
  const data = projectFromState(state);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  triggerDownload(blob, `封面工坊-项目-${stamp}.json`);
  return { bytes: blob.size };
}
