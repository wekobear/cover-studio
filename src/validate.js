// 项目 JSON 的导出结构与导入校验（纯函数，node:test 直接测试）。
import { LIMITS, RATIOS, THEMES, TEMPLATES, TITLE_SCALES } from './themes.js';
import { cleanText } from './text.js';
import { APP_VERSION } from './version.js';

export const PROJECT_FORMAT = 'cover-workshop-project';
export const PROJECT_VERSION = 1;

// 只允许 png/jpeg/webp 的 base64 data URL，拒绝任意 URL 注入
const DATAURL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function projectFromState(state) {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    app: APP_VERSION,
    exportedAt: new Date().toISOString(),
    state: {
      template: state.template,
      ratio: state.ratio,
      theme: state.theme,
      titleScale: state.titleScale,
      content: {
        title: state.content.title,
        subtitle: state.content.subtitle,
        signature: state.content.signature,
        tags: [...state.content.tags],
        items: state.content.items.map((it) => ({ title: it.title, desc: it.desc })),
      },
      image: state.image
        ? { dataUrl: state.image.dataUrl, name: state.image.name, size: state.image.size, w: state.image.w, h: state.image.h }
        : null,
    },
  };
}

// 返回 { ok, errors: string[], state }；state 仅在 ok 时有效
export function validateProject(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['项目文件不是有效的 JSON 对象'], state: null };
  }
  if (raw.format !== PROJECT_FORMAT) errors.push('不是封面工坊项目文件（format 不匹配）');
  if (raw.version !== PROJECT_VERSION) errors.push(`项目版本不兼容（需要 version ${PROJECT_VERSION}）`);
  if (errors.length) return { ok: false, errors, state: null };

  const s = raw.state;
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    return { ok: false, errors: ['项目文件缺少 state 数据'], state: null };
  }

  const pick = (map, v, name) => {
    if (Object.prototype.hasOwnProperty.call(map, v)) return v;
    errors.push(`${name} 不是有效取值`);
    return Object.keys(map)[0];
  };
  const template = pick(TEMPLATES, s.template, '模板');
  const ratio = pick(RATIOS, s.ratio, '画幅');
  const theme = pick(THEMES, s.theme, '配色');
  const titleScale = pick(TITLE_SCALES, s.titleScale, '标题字号');

  const c = s.content && typeof s.content === 'object' && !Array.isArray(s.content) ? s.content : {};
  const str = (v, name, max) => {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') { errors.push(`${name} 应为字符串`); return ''; }
    const t = cleanText(v);
    if (t.length > max) errors.push(`${name} 超过 ${max} 字上限`);
    return t;
  };

  const title = str(c.title, '主标题', LIMITS.title);
  const subtitle = str(c.subtitle, '副标题', LIMITS.subtitle);
  const signature = str(c.signature, '署名', LIMITS.signature);

  let tags = [];
  if (c.tags !== undefined && c.tags !== null) {
    if (!Array.isArray(c.tags)) errors.push('标签应为数组');
    else {
      if (c.tags.length > LIMITS.tagCount) errors.push(`标签最多 ${LIMITS.tagCount} 个`);
      tags = c.tags.slice(0, LIMITS.tagCount).map((t, i) => str(t, `标签 ${i + 1}`, LIMITS.tag));
    }
  }

  let items = [];
  if (c.items !== undefined && c.items !== null) {
    if (!Array.isArray(c.items)) errors.push('方法卡条目应为数组');
    else {
      if (c.items.length > LIMITS.itemCount) errors.push(`方法卡条目最多 ${LIMITS.itemCount} 条`);
      items = c.items.slice(0, LIMITS.itemCount).map((it, i) => {
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          errors.push(`条目 ${i + 1} 格式不正确`);
          return { title: '', desc: '' };
        }
        return {
          title: str(it.title, `条目 ${i + 1} 标题`, LIMITS.itemTitle),
          desc: str(it.desc, `条目 ${i + 1} 说明`, LIMITS.itemDesc),
        };
      });
    }
  }
  while (items.length < LIMITS.itemCount) items.push({ title: '', desc: '' });

  let image = null;
  if (s.image !== undefined && s.image !== null) {
    const im = s.image;
    if (!im || typeof im !== 'object' || Array.isArray(im)) {
      errors.push('图片数据格式不正确');
    } else if (typeof im.dataUrl !== 'string' || !DATAURL_RE.test(im.dataUrl)) {
      errors.push('图片数据只支持 PNG / JPG / WebP 的 data URL，不允许外部链接');
    } else {
      const b64 = im.dataUrl.slice(im.dataUrl.indexOf(',') + 1);
      const bytes = Math.floor((b64.length * 3) / 4);
      if (bytes > LIMITS.imageBytes) errors.push(`图片数据超过 ${Math.round(LIMITS.imageBytes / 1024 / 1024)}MB 上限`);
      else {
        image = {
          dataUrl: im.dataUrl,
          name: str(im.name, '图片文件名', 80) || 'imported-image',
          size: typeof im.size === 'number' && im.size >= 0 ? im.size : bytes,
          w: typeof im.w === 'number' && im.w > 0 ? im.w : 0,
          h: typeof im.h === 'number' && im.h > 0 ? im.h : 0,
        };
      }
    }
  }

  const state = {
    template, ratio, theme, titleScale,
    content: { title, subtitle, signature, tags, items },
    image,
  };
  return { ok: errors.length === 0, errors, state };
}
