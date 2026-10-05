/* v0.2.0（项目格式 version 1）→ v0.3.0（version 2）迁移。
 *
 * 旧模型：template（poster 大字报 / method 方法卡 / editorial 图文志）
 *         + theme（paper 纸墨橙 / ink 墨蓝夜 / cream 暖奶油）+ titleScale。
 * 新模型：system（editorial / swiss）+ recipe（M01…/S01…）+ theme（10 套 Guizang 主题）。
 *
 * 映射全部可解释（README 同步记录）：
 *   template=editorial（图文志：图 + 标题排版）→ editorial / M01 刊首封面
 *   template=poster（大字报：大问句大字）     → swiss / S01 强调封面（极细大字）
 *   template=method（方法卡：三步条目）       → swiss / S05 警示清单（条目行式）
 *   theme 按目标体系落到色感最接近的合法主题：
 *     paper → editorial:ink-classic（纸+墨的中性古典）/ swiss:ikb（默认纸白+蓝）
 *     ink   → editorial:midnight-ink（唯一官方深色）/ swiss:ikb（Swiss 无深色，取默认蓝）
 *     cream → editorial:kraft-paper（暖牛皮纸）/ swiss:lemon-yellow（暖亮黄）
 *   titleScale：新排版由 recipe 类名接管（越大越细的字号体系），字段停用。
 */

import { coerceStateShape, defaultThemeOf } from './poster/model.js';
import { cleanText, cleanMultiline } from './text.js';

const TEMPLATE_MAP = {
  editorial: { system: 'editorial', recipe: 'M01' },
  poster: { system: 'swiss', recipe: 'S01' },
  method: { system: 'swiss', recipe: 'S05' },
};

const THEME_MAP = {
  paper: { editorial: 'ink-classic', swiss: 'ikb' },
  ink: { editorial: 'midnight-ink', swiss: 'ikb' },
  cream: { editorial: 'kraft-paper', swiss: 'lemon-yellow' },
};

const THEME_LABEL = {
  paper: '纸墨橙', ink: '墨蓝夜', cream: '暖奶油',
  'ink-classic': '墨韵经典', 'midnight-ink': '午夜墨色', kraft: '牛皮纸',
  'kraft-paper': '牛皮纸', ikb: '国际克莱因蓝', 'lemon-yellow': '柠檬黄',
};
const TEMPLATE_LABEL = { poster: '大字报', method: '方法卡', editorial: '图文志' };

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const it of items.slice(0, 5)) {
    if (!it || typeof it !== 'object') continue;
    const title = cleanText(String(it.title ?? ''));
    const desc = cleanText(String(it.desc ?? ''));
    if (title || desc) out.push({ title, desc });
  }
  return out;
}

export function migrateV1State(old) {
  const src = old && typeof old === 'object' ? old : {};
  const template = TEMPLATE_MAP[src.template] ? src.template : 'poster';
  const { system, recipe } = TEMPLATE_MAP[template];
  const oldTheme = THEME_MAP[src.theme] ? src.theme : 'paper';
  const theme = THEME_MAP[oldTheme][system] || defaultThemeOf(system);

  const ratio = src.ratio === '1:1' ? '1:1' : '3:4';
  const oldContent = src.content && typeof src.content === 'object' ? src.content : {};
  const items = cleanItems(oldContent.items);
  if (!items.length) items.push({ title: '', desc: '' });

  const state = {
    version: 2,
    ...coerceStateShape({ system, recipe, theme, ratio }),
    content: {
      kicker: cleanText(String(oldContent.kicker ?? '')),
      title: cleanMultiline(String(oldContent.title ?? '')),
      subtitle: cleanText(String(oldContent.subtitle ?? '')),
      signature: cleanText(String(oldContent.signature ?? '')),
      tags: Array.isArray(oldContent.tags)
        ? oldContent.tags.slice(0, 3).map((t) => cleanText(String(t))).filter(Boolean)
        : [],
      items,
    },
    imageRef: false,
  };

  const notes = [
    `模板「${TEMPLATE_LABEL[template]}」→ ${system === 'editorial' ? '杂志图志' : '国际瑞士'} ${recipe}`,
    `配色「${THEME_LABEL[oldTheme]}」→ ${THEME_LABEL[theme] || theme}`,
    '标题字号档位已停用（新版字号由模板排版接管）',
  ];
  return { state, notes };
}

/* localStorage 草稿可能是 v1 或 v2；统一入口。 */
export function normalizeDraft(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version === 2 || raw.recipe) {
    return { state: coerceDraftV2(raw), notes: [] };
  }
  return migrateV1State(raw);
}

function coerceDraftV2(d) {
  const content = d.content && typeof d.content === 'object' ? d.content : {};
  const items = cleanItems(content.items);
  return {
    version: 2,
    ...coerceStateShape({
      system: d.system, recipe: d.recipe, theme: d.theme, ratio: d.ratio,
    }),
    content: {
      kicker: cleanText(String(content.kicker ?? '')),
      title: cleanMultiline(String(content.title ?? '')),
      subtitle: cleanText(String(content.subtitle ?? '')),
      signature: cleanText(String(content.signature ?? '')),
      tags: Array.isArray(content.tags)
        ? content.tags.slice(0, 3).map((t) => cleanText(String(t))).filter(Boolean)
        : [],
      items: items.length ? items : [{ title: '', desc: '' }],
    },
    imageRef: Boolean(d.imageRef),
  };
}
