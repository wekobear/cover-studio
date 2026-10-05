/* 项目 JSON 校验（version 2；兼容导入 version 1 并走迁移）。
 * 原则：结构/类型/长度/图片严格校验，非法即拒绝并给出中文原因；
 * 不执行任何输入内容；图片仅接受 data:image/(png|jpeg|webp) 的 base64。
 */

import { RECIPES, BOARDS, SYSTEMS, LIMITS, isThemeLegal, defaultThemeOf } from './poster/model.js';
import { cleanText, cleanMultiline, charCount } from './text.js';
import { migrateV1State } from './migrate.js';

export const PROJECT_FORMAT = 'cover-workshop-project';
export const PROJECT_VERSION = 2;
export const DATAURL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const RECIPE_IDS = RECIPES.map((r) => r.id);
const BOARD_IDS = BOARDS.map((b) => b.id);

function err(errors, msg) {
  errors.push(msg);
}

/* 校验即清洗：先按渲染前的清洗值（去控制字符/折叠空白）量长度，再产出干净 content。
 * 返回清洗后的 content 对象；content 本身缺失时返回 null。 */
function validateContent(content, errors) {
  if (!content || typeof content !== 'object') {
    err(errors, '缺少 content 内容对象');
    return null;
  }
  const c = content;
  const out = { kicker: '', title: '', subtitle: '', signature: '', tags: [], items: [] };

  if (typeof c.title !== 'string') err(errors, '主标题必须是文本');
  else {
    out.title = cleanMultiline(c.title);
    if (charCount(out.title) > LIMITS.title) err(errors, `主标题过长（≤${LIMITS.title} 字）`);
  }

  const fieldLabel = { kicker: '刊眉', subtitle: '副标题', signature: '署名' };
  for (const field of ['kicker', 'subtitle', 'signature']) {
    const v = c[field];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string') {
      err(errors, `${fieldLabel[field]}必须是文本`);
      continue;
    }
    out[field] = cleanText(v);
    if (charCount(out[field]) > LIMITS[field]) {
      err(errors, `${fieldLabel[field]}过长（≤${LIMITS[field]} 字）`);
    }
  }

  if (c.tags !== undefined) {
    if (!Array.isArray(c.tags)) err(errors, 'tags 必须是数组');
    else {
      if (c.tags.length > LIMITS.tagCount) err(errors, `标签最多 ${LIMITS.tagCount} 个`);
      out.tags = c.tags
        .map((t) => {
          if (typeof t !== 'string') {
            err(errors, '标签必须是文本');
            return null;
          }
          return cleanText(t);
        })
        .filter((t) => t !== null && t !== '');
      out.tags.forEach((t, i) => {
        if (charCount(t) > LIMITS.tag) err(errors, `标签 ${i + 1} 过长（≤${LIMITS.tag} 字）`);
      });
    }
  }

  if (!Array.isArray(c.items)) {
    err(errors, `条目必须是 1–${LIMITS.itemCount} 条的数组`);
  } else {
    if (c.items.length < 1 || c.items.length > LIMITS.itemCount) {
      err(errors, `条目数量需在 1–${LIMITS.itemCount} 之间`);
    }
    out.items = c.items.map((it) => {
      if (!it || typeof it !== 'object') {
        err(errors, '条目格式错误');
        return null;
      }
      if (typeof it.title !== 'string') {
        err(errors, '条目标题必须是文本');
        return null;
      }
      if (typeof it.desc !== 'string') {
        err(errors, '条目说明必须是文本');
        return null;
      }
      return { title: cleanText(it.title), desc: cleanText(it.desc) };
    });
    out.items.forEach((it, i) => {
      if (!it) return;
      if (charCount(it.title) > LIMITS.itemTitle) err(errors, `条目 ${i + 1} 标题过长（≤${LIMITS.itemTitle} 字）`);
      if (charCount(it.desc) > LIMITS.itemDesc) err(errors, `条目 ${i + 1} 说明过长（≤${LIMITS.itemDesc} 字）`);
    });
    out.items = out.items.filter(Boolean);
  }
  return out;
}

function validateImage(image, errors) {
  if (image === undefined || image === null) return;
  if (typeof image !== 'object') {
    err(errors, 'image 必须是对象');
    return;
  }
  if (typeof image.dataUrl !== 'string' || !DATAURL_RE.test(image.dataUrl)) {
    err(errors, '图片仅支持 PNG / JPEG / WebP 的 base64 data URL');
    return;
  }
  const bytes = Math.floor((image.dataUrl.length - image.dataUrl.indexOf(',') - 1) * 3 / 4);
  if (bytes > LIMITS.imageBytes) err(errors, '图片超过 5MB 上限');
}

export function validateProject(raw, rawText) {
  const errors = [];
  if (typeof rawText === 'string' && rawText.length > LIMITS.projectBytes) {
    return { ok: false, errors: ['项目文件超过 12MB 上限'] };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['不是有效的 JSON 对象'] };
  }
  if (raw.format !== PROJECT_FORMAT) {
    return { ok: false, errors: [`format 必须是 ${PROJECT_FORMAT}`] };
  }
  if (raw.version === 1) {
    return validateV1Project(raw);
  }
  if (raw.version !== PROJECT_VERSION) {
    return { ok: false, errors: [`不支持的版本 ${raw.version}（当前支持 1 / ${PROJECT_VERSION}）`] };
  }
  const s = raw.state;
  if (!s || typeof s !== 'object') return { ok: false, errors: ['缺少 state'] };

  const system = SYSTEMS[s.system] ? s.system : null;
  if (!system) err(errors, `system 必须是 ${Object.keys(SYSTEMS).join(' / ')}`);
  if (!RECIPE_IDS.includes(s.recipe)) err(errors, `recipe 必须是 ${RECIPE_IDS.join(' / ')}`);
  else if (system && RECIPES.find((r) => r.id === s.recipe).system !== system) {
    err(errors, `recipe ${s.recipe} 不属于体系 ${system}`);
  }
  if (!BOARD_IDS.includes(s.ratio)) err(errors, `ratio 必须是 ${BOARD_IDS.join(' / ')}`);
  if (system && !isThemeLegal(system, s.theme)) {
    err(errors, `主题 ${s.theme} 不属于体系 ${system}（合法值：${SYSTEMS[system].themes.join(' / ')}）`);
  }
  const content = validateContent(s.content, errors);
  validateImage(s.image, errors);
  if (errors.length || !content) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    state: {
      version: 2,
      system,
      recipe: s.recipe,
      theme: s.theme,
      ratio: s.ratio,
      content,
      image: s.image ?? null,
      imageRef: false,
    },
  };
}

/* ---------- v1（0.2.0）项目：先严格校验旧 schema，再迁移 ----------
 * 旧枚举：template（editorial/poster/method）/ theme（paper/ink/cream）/ ratio（3:4/1:1）。
 * 旧内容限额与 v2 相同（title 26 / subtitle 60 / signature 24 / tag 10×3 / item 12/34）。
 * 旧图片对象形如 {dataUrl,name,size,w,h}：dataUrl 通过 PNG/JPEG/WebP base64 与 5MB
 * 校验的，迁移为 {source:'upload', dataUrl} 保留；非法 v1（含非法图片）一律拒绝。 */
const V1_TEMPLATES = ['editorial', 'poster', 'method'];
const V1_THEMES = ['paper', 'ink', 'cream'];
const V1_RATIOS = ['3:4', '1:1'];

function validateV1Project(raw) {
  const errors = [];
  const s = raw.state && typeof raw.state === 'object' ? raw.state : raw;
  if (!V1_TEMPLATES.includes(s.template)) {
    err(errors, `v1 template 必须是 ${V1_TEMPLATES.join(' / ')}`);
  }
  if (s.theme !== undefined && !V1_THEMES.includes(s.theme)) {
    err(errors, `v1 theme 必须是 ${V1_THEMES.join(' / ')}`);
  }
  if (s.ratio !== undefined && !V1_RATIOS.includes(s.ratio)) {
    err(errors, `v1 ratio 必须是 ${V1_RATIOS.join(' / ')}`);
  }
  const content = validateContent(s.content, errors);
  validateImage(s.image, errors);
  if (errors.length) return { ok: false, errors };

  const { state, notes } = migrateV1State(s);
  const dataUrl = s.image && typeof s.image === 'object' && DATAURL_RE.test(s.image.dataUrl || '')
    ? s.image.dataUrl
    : null;
  state.image = dataUrl ? { source: 'upload', dataUrl } : null;
  return { ok: true, errors: [], state, migrated: true, migrationNotes: notes };
}

export function projectFromState(state, image) {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    generator: 'cover-workshop',
    exportedAt: new Date().toISOString(),
    state: {
      version: 2,
      system: state.system,
      recipe: state.recipe,
      theme: state.theme,
      ratio: state.ratio,
      content: state.content,
      ...(image ? { image: { source: image.source, dataUrl: image.dataUrl } } : {}),
    },
  };
}
