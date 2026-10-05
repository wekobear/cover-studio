// AI 提示词模板：基于已填写内容生成可复制的提示词。
// 这是「提示词模板」，由用户自行粘贴到外部 AI 工具，本站不提供在线生成。
import { RATIOS, THEMES, TEMPLATES } from './themes.js';

const THEME_MOOD = {
  paper: '暖白纸感背景，深墨蓝主色，鲜橙点缀，编辑杂志式克制排版',
  ink: '深墨蓝底，反白主色，暖橙点缀，夜色沉稳氛围',
  cream: '暖奶油底，深棕主色，深橙点缀，温暖轻盈',
};

export function buildCopyPrompt(state) {
  const c = state.content;
  const tags = (c.tags || []).filter((t) => t && t.trim());
  const items = (c.items || [])
    .filter((it) => it && ((it.title || '').trim() || (it.desc || '').trim()))
    .map((it, i) => `${i + 1}. ${(it.title || '').trim()}${(it.desc || '').trim() ? '——' + it.desc.trim() : ''}`)
    .join('\n');

  return [
    '请为一条小红书笔记打磨封面文案。只基于我给出的真实信息改写，不要编造数据、人数、收益或权威背书，不要「最适合 / 精准大数据」类说法。',
    '',
    `【主题】${(c.title || '').trim() || '（待填）'}`,
    `【现有副标题】${(c.subtitle || '').trim() || '（待填）'}`,
    `【标签】${tags.length ? tags.join('、') : '（待填）'}`,
    items ? `【方法卡条目】\n${items}` : '【方法卡条目】（未填写）',
    `【署名】${(c.signature || '').trim() || '（待填）'}`,
    '',
    '要求：',
    '1. 主标题不超过 14 字，口语化、有信息量，不用夸张符号堆砌。',
    '2. 副标题不超过 20 字，说清真实价值。',
    '3. 标签 2-3 个，每个不超过 6 字。',
    '4. 输出 3 组备选，直接给结果，不用解释。',
  ].join('\n');
}

export function buildImagePrompt(state) {
  const t = THEMES[state.theme] || THEMES.paper;
  const ratio = RATIOS[state.ratio] || RATIOS['3:4'];
  const topic = (state.content.title || '').trim() || '（待填主题）';
  return [
    '请生成一张用于社交媒体封面的插画。画面中不出现任何中文、英文、数字、logo、水印、人像或真实地标——文字由我后期在封面编辑器里排版，素材与文字保持分离。',
    '',
    `【用途】${(TEMPLATES[state.template] || TEMPLATES.poster).label}风格封面底图，比例 ${ratio.label}`,
    `【主题氛围】与「${topic}」相关，编辑杂志式、高级克制、留白充足`,
    `【配色】${THEME_MOOD[state.theme] || THEME_MOOD.paper}（主色 ${t.bg} / ${t.ink} / ${t.accent} 附近）`,
    '【构图】画面主体位于中下方，上方约三分之一保留干净空间，供后期叠加标题',
    '【避免】任何文字元素、假 UI 截图、二维码、联系方式、虚构排名或对比表',
  ].join('\n');
}
