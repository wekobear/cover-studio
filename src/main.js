// 单页工作台接线：左模板 / 中预览 / 右内容；所有渲染走 buildScene + sceneToSVG。
import './styles.css';
import { APP_VERSION } from './version.js';
import { buildScene } from './scene.js';
import { sceneToSVG } from './svg.js';
import { RATIOS, TEMPLATES, THEMES, LIMITS } from './themes.js';
import { cleanText } from './text.js';
import { defaultState, loadDraft, saveDraft, clearDraft, idbGetImage, idbPutImage, idbDeleteImage } from './state.js';
import { validateProject } from './validate.js';
import { downloadPNG, downloadSVG, downloadProject } from './exporters.js';
import { getEditorialAsset } from './asset.js';
import { buildCopyPrompt, buildImagePrompt } from './prompts.js';

const $ = (id) => document.getElementById(id);
const els = {
  preview: $('preview'), warnbar: $('warnbar'), meta: $('stage-meta'), version: $('app-version'),
  title: $('f-title'), subtitle: $('f-subtitle'), signature: $('f-signature'),
  tags: [$('f-tag-0'), $('f-tag-1'), $('f-tag-2')],
  items: [0, 1, 2].map((i) => ({ title: $(`f-item-title-${i}`), desc: $(`f-item-desc-${i}`) })),
  imgStatus: $('img-status'), btnUpload: $('btn-upload'), btnRemoveImg: $('btn-remove-img'), fileImage: $('file-image'),
  btnImport: $('btn-import'), fileImport: $('file-import'), btnExportJson: $('btn-export-json'), btnReset: $('btn-reset'),
  btnPng: $('btn-export-png'), btnSvg: $('btn-export-svg'),
  promptOut: $('prompt-out'), btnCopyPrompt: $('btn-copy-prompt'), promptTip: $('prompt-tip'),
  toast: $('toast'),
};

let state = loadDraft() || defaultState();
let promptTab = 'copy';
let assetData = null;
let renderQueued = false;
let saveTimer = null;

// ---------- 渲染 ----------
function render() {
  renderQueued = false;
  const scene = buildScene(state, { preview: true, assetImage: assetData });
  els.preview.innerHTML = sceneToSVG(scene, { preview: true });
  // 预览用半尺寸作为固有尺寸（保持 3:4 / 1:1 比例），再由 CSS max-width/max-height 收缩
  const svgEl = els.preview.firstElementChild;
  if (svgEl) {
    svgEl.setAttribute('width', String(scene.width / 2));
    svgEl.setAttribute('height', String(scene.height / 2));
  }
  renderWarnings(scene.warnings);
  const r = RATIOS[state.ratio] || RATIOS['3:4'];
  els.meta.textContent = `${r.w} × ${r.h} px · ${TEMPLATES[state.template]?.label ?? state.template} · ${THEMES[state.theme]?.label ?? state.theme}`;
  refreshPrompt();
}

function renderWarnings(list) {
  const uniq = [...new Set(list)];
  els.warnbar.hidden = uniq.length === 0;
  els.warnbar.replaceChildren(...uniq.map((w) => {
    const s = document.createElement('span');
    s.className = 'warn-chip';
    s.textContent = w;
    return s;
  }));
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(render);
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDraft(state), 250);
}

function update() {
  persist();
  scheduleRender();
}

// ---------- 表单同步 ----------
function readFormToState() {
  const c = state.content;
  c.title = cleanText(els.title.value);
  c.subtitle = cleanText(els.subtitle.value);
  c.signature = cleanText(els.signature.value);
  c.tags = els.tags.map((t) => cleanText(t.value));
  c.items = els.items.map((it) => ({ title: cleanText(it.title.value), desc: cleanText(it.desc.value) }));
}

function syncFormFromState() {
  els.title.value = state.content.title;
  els.subtitle.value = state.content.subtitle;
  els.signature.value = state.content.signature;
  els.tags.forEach((t, i) => { t.value = state.content.tags[i] ?? ''; });
  els.items.forEach((it, i) => {
    const item = state.content.items[i] || { title: '', desc: '' };
    it.title.value = item.title;
    it.desc.value = item.desc;
  });
  document.querySelectorAll('#tpl-list .tpl-card').forEach((b) => b.classList.toggle('is-active', b.dataset.template === state.template));
  document.querySelectorAll('#seg-ratio .seg-item').forEach((b) => b.classList.toggle('is-active', b.dataset.ratio === state.ratio));
  document.querySelectorAll('#swatches .swatch').forEach((b) => b.classList.toggle('is-active', b.dataset.theme === state.theme));
  document.querySelectorAll('#seg-scale .seg-item').forEach((b) => b.classList.toggle('is-active', b.dataset.scale === state.titleScale));
  syncImageStatus();
  updateCounters();
}

function updateCounters() {
  const set = (key, len, max) => {
    const el = document.querySelector(`[data-counter="${key}"]`);
    if (!el) return;
    el.textContent = `${len}/${max}`;
    el.classList.toggle('is-max', len >= max);
  };
  set('title', state.content.title.length, LIMITS.title);
  set('subtitle', state.content.subtitle.length, LIMITS.subtitle);
  set('signature', state.content.signature.length, LIMITS.signature);
  state.content.items.forEach((it, i) => {
    set(`item-title-${i}`, it.title.length, LIMITS.itemTitle);
    set(`item-desc-${i}`, it.desc.length, LIMITS.itemDesc);
  });
}

// ---------- 事件 ----------
for (const input of [els.title, els.subtitle, els.signature, ...els.tags, ...els.items.flatMap((it) => [it.title, it.desc])]) {
  input.addEventListener('input', () => {
    const cleaned = cleanText(input.value);
    if (cleaned !== input.value) input.value = cleaned;
    readFormToState();
    updateCounters();
    update();
  });
}

$('tpl-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-template]');
  if (!btn) return;
  state.template = btn.dataset.template;
  document.querySelectorAll('#tpl-list .tpl-card').forEach((b) => b.classList.toggle('is-active', b === btn));
  update();
});

$('seg-ratio').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ratio]');
  if (!btn) return;
  state.ratio = btn.dataset.ratio;
  document.querySelectorAll('#seg-ratio .seg-item').forEach((b) => b.classList.toggle('is-active', b === btn));
  update();
});

$('swatches').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-theme]');
  if (!btn) return;
  state.theme = btn.dataset.theme;
  document.querySelectorAll('#swatches .swatch').forEach((b) => b.classList.toggle('is-active', b === btn));
  update();
});

$('seg-scale').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-scale]');
  if (!btn) return;
  state.titleScale = btn.dataset.scale;
  document.querySelectorAll('#seg-scale .seg-item').forEach((b) => b.classList.toggle('is-active', b === btn));
  update();
});

// ---------- 图片上传（仅本机处理，不外传） ----------
const MAGIC = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  webp: [0x52, 0x49, 0x46, 0x46],
};

function startsWith(buf, sig) {
  return sig.every((b, i) => buf[i] === b);
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function probeImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => reject(new Error('图片解码失败'));
    im.src = dataUrl;
  });
}

function syncImageStatus() {
  if (state.image) {
    const mb = (state.image.size / 1024 / 1024).toFixed(2);
    els.imgStatus.textContent = `当前图片：${state.image.name}（${state.image.w}×${state.image.h}，${mb}MB），用于图文志模板。`;
    els.btnRemoveImg.hidden = false;
  } else {
    els.imgStatus.textContent = '支持 PNG / JPG / WebP，不超过 5MB。默认使用内置插画。';
    els.btnRemoveImg.hidden = true;
  }
}

async function handleImageFile(file) {
  if (!file) return;
  const typeOk = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
  if (file.type === 'image/svg+xml' || /\.(svg)$/i.test(file.name)) {
    toast('不支持 SVG 图片：请上传 PNG / JPG / WebP'); return;
  }
  if (!typeOk) { toast('不支持的图片类型：请上传 PNG / JPG / WebP'); return; }
  if (file.size > LIMITS.imageBytes) { toast('图片超过 5MB 上限，请压缩后再试'); return; }
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const sniff = startsWith(head, MAGIC.png) || startsWith(head, MAGIC.jpeg) || startsWith(head, MAGIC.webp);
    if (!sniff && !(startsWith(head, MAGIC.webp) || String.fromCharCode(...head.slice(8, 12)) === 'WEBP')) {
      toast('文件内容与扩展名不符：请上传真实的 PNG / JPG / WebP 图片'); return;
    }
    const dataUrl = await readAsDataURL(file);
    const { w, h } = await probeImage(dataUrl);
    state.image = { dataUrl, name: file.name.slice(0, 80), size: file.size, w, h };
    await idbPutImage(state.image);
    syncImageStatus();
    update();
    toast('图片已应用（用于图文志模板）');
  } catch {
    toast('图片读取失败，请换一张再试');
  }
}

els.btnUpload.addEventListener('click', () => els.fileImage.click());
els.fileImage.addEventListener('change', async () => {
  await handleImageFile(els.fileImage.files && els.fileImage.files[0]);
  els.fileImage.value = '';
});
els.btnRemoveImg.addEventListener('click', async () => {
  state.image = null;
  await idbDeleteImage();
  syncImageStatus();
  update();
  toast('已移除图片，恢复内置插画 / 占位');
});

// ---------- 导出 ----------
els.btnPng.addEventListener('click', async () => {
  try {
    els.btnPng.disabled = true;
    const r = await downloadPNG(state);
    toast(`PNG 已导出（${r.width}×${r.height}，${(r.bytes / 1024).toFixed(0)}KB）`);
  } catch (e) {
    toast('PNG 导出失败：' + (e && e.message ? e.message : '未知错误'));
  } finally {
    els.btnPng.disabled = false;
  }
});

els.btnSvg.addEventListener('click', async () => {
  try {
    const r = await downloadSVG(state);
    toast(`SVG 已导出（${r.width}×${r.height}，${(r.bytes / 1024).toFixed(0)}KB）`);
  } catch (e) {
    toast('SVG 导出失败：' + (e && e.message ? e.message : '未知错误'));
  }
});

els.btnExportJson.addEventListener('click', () => {
  const r = downloadProject(state);
  toast(`项目 JSON 已导出（${(r.bytes / 1024).toFixed(0)}KB）`);
});

// ---------- 项目导入 ----------
els.btnImport.addEventListener('click', () => els.fileImport.click());
els.fileImport.addEventListener('change', async () => {
  const file = els.fileImport.files && els.fileImport.files[0];
  els.fileImport.value = '';
  if (!file) return;
  if (file.size > LIMITS.projectBytes) { toast('项目文件超过 12MB 上限'); return; }
  try {
    const text = await file.text();
    let raw;
    try { raw = JSON.parse(text); } catch { toast('导入失败：不是有效的 JSON 文件'); return; }
    const v = validateProject(raw);
    if (!v.ok) { toast('导入失败：' + v.errors.slice(0, 3).join('；')); return; }
    state = v.state;
    if (state.image) await idbPutImage(state.image);
    else await idbDeleteImage();
    syncFormFromState();
    update();
    toast('项目已导入');
  } catch {
    toast('导入失败：文件读取错误');
  }
});

// ---------- 重置（两步确认，不用 confirm 弹窗） ----------
els.btnReset.addEventListener('click', async () => {
  if (els.btnReset.dataset.armed !== '1') {
    els.btnReset.dataset.armed = '1';
    els.btnReset.textContent = '再点一次确认重置';
    setTimeout(() => { els.btnReset.dataset.armed = ''; els.btnReset.textContent = '重置示例'; }, 3000);
    return;
  }
  els.btnReset.dataset.armed = '';
  els.btnReset.textContent = '重置示例';
  state = defaultState();
  clearDraft();
  await idbDeleteImage();
  syncFormFromState();
  update();
  toast('已恢复示例内容');
});

// ---------- AI 提示词 ----------
$('seg-prompt').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-prompt]');
  if (!btn) return;
  promptTab = btn.dataset.prompt;
  document.querySelectorAll('#seg-prompt .seg-item').forEach((b) => b.classList.toggle('is-active', b === btn));
  refreshPrompt();
});

function refreshPrompt() {
  if (!els.promptOut) return;
  els.promptOut.value = promptTab === 'copy' ? buildCopyPrompt(state) : buildImagePrompt(state);
}

els.btnCopyPrompt.addEventListener('click', async () => {
  const text = els.promptOut.value;
  try {
    await navigator.clipboard.writeText(text);
    toast('提示词已复制');
  } catch {
    els.promptOut.focus();
    els.promptOut.select();
    els.promptTip.textContent = '自动复制被浏览器拦截：文本已全选，请按 ⌘C / Ctrl+C 手动复制。';
    toast('复制失败：请手动复制选中的文本');
  }
});

// ---------- toast ----------
let toastTimer = null;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  els.toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-show');
    setTimeout(() => { els.toast.hidden = true; }, 300);
  }, 2600);
}

// ---------- 启动 ----------
els.version.textContent = 'v' + APP_VERSION;
syncFormFromState();
render();
getEditorialAsset().then((d) => {
  if (d) { assetData = d; scheduleRender(); }
});
idbGetImage().then((rec) => {
  if (rec && rec.dataUrl) {
    state.image = rec;
    syncImageStatus();
    scheduleRender();
  }
});
