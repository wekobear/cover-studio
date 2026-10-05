/* 提示词生成：参数必须真实（体系/主题/配方取自当前状态与主题数据），
 * 可在调用 Guizang Social Card Skill 时复现同一方向。
 * 不暗示浏览器已调用本地 CLI 或在线 AI —— 这里只产出可复制的参数化提示词。
 */

import { getRecipe, getBoard } from './poster/model.js';
import { EDITORIAL_THEMES, SWISS_ACCENTS } from './poster/theme-data.js';

export const SKILL_SOURCE = 'guizang-social-card-skill @ cf4b810 (github.com/op7418/guizang-social-card-skill)';

function themeInfo(state) {
  if (state.system === 'swiss') {
    const t = SWISS_ACCENTS.find((x) => x.id === state.theme) || SWISS_ACCENTS[0];
    return { kind: 'accent', label: t.label, vars: t.vars };
  }
  const t = EDITORIAL_THEMES.find((x) => x.id === state.theme) || EDITORIAL_THEMES[0];
  return { kind: 'theme', label: t.label, vars: t.vars };
}

function varLines(vars) {
  return Object.entries(vars)
    .filter(([k]) => !k.endsWith('-rgb'))
    .map(([k, v]) => `    ${k}: ${v}`)
    .join('\n');
}

function systemEn(system) {
  return system === 'swiss' ? 'Swiss International' : 'Editorial Magazine × E-ink';
}

export function buildCopyPrompt(state) {
  const recipe = getRecipe(state.recipe);
  const board = getBoard(state.ratio);
  const theme = themeInfo(state);
  const c = state.content;
  const items = c.items
    .map((it, i) => `${i + 1}. ${it.title}${it.desc ? '——' + it.desc : ''}`)
    .join('\n');
  return `请按以下参数为一篇社交内容产出封面文案（不编造数据与指标，不写技术实现/使用提示）：

[渲染体系] ${systemEn(state.system)}
[来源 Skill] ${SKILL_SOURCE}
[配方 Recipe] ${recipe.id} ${recipe.label.replace(recipe.id + ' ', '')}
[画幅] ${board.label} ${board.w}×${board.h}
[${theme.kind === 'accent' ? '强调色 accent' : '主题 theme'}] ${state.theme}（${theme.label}）
    ${varLines(theme.vars)}

[现有内容]
主标题：${c.title.replace(/\n/g, '/')}
副标题：${c.subtitle}
刊眉：${c.kicker}
署名：${c.signature}
条目：
${items}

[要求]
- 保持上述体系/配方/主题不变，只优化文字表达；标题遵循配方长度预算。
- 输出：主标题（可含换行）、副标题、条目标题与一句话说明。
- 中文优先，英文术语保留原文；不添加未提供的数字。`;
}

export function buildImagePrompt(state) {
  const theme = themeInfo(state);
  const mood =
    state.system === 'swiss'
      ? '干净棚拍感、大面纯色留白、无杂物，适合瑞士国际主义排版'
      : '柔和自然光、纸感颗粒、安静的生活氛围，适合杂志编辑风排版';
  return `为一张社交封面生成配图（图内不要出现任何文字、水印、Logo、界面边框）：

[风格基调] ${mood}
[适配主题] ${state.theme}（${theme.label}；纸面色 ${theme.vars['--paper'] || ''}）
[用途] ${state.system === 'swiss' ? '瑞士式' : '杂志式'}封面配图，主体居中或偏下，上方/一侧留出低细节安静区供标题排字
[禁止] 高饱和午间强光、正面闪光、游客打卡式构图、含字海报
[输出] 3:4 或 4:3 高分辨率照片风格

（排版与文字由封面工坊在浏览器内完成，此提示词仅用于生成底图。）`;
}
