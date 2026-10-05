/* 海报领域模型：体系 / 配方 / 画幅 / 主题 / 限制。
 * 结构与命名对应 Guizang Social Card Skill 的 layout-recipes.md 与 theme-presets.md：
 *  - Editorial Magazine × E-ink（M 系 recipe，6 套 data-theme）
 *  - Swiss International（S 系 recipe，4 套 data-accent）
 * 画幅 board 类名与种子模板一致：xhs(3:4) / square(1:1) / wide(21:9)。
 */

export const SYSTEMS = {
  editorial: {
    id: 'editorial',
    label: '杂志图志',
    en: 'Editorial Magazine × E-ink',
    themeAttr: 'data-theme',
    themes: ['ink-classic', 'indigo-porcelain', 'forest-ink', 'kraft-paper', 'dune', 'midnight-ink'],
  },
  swiss: {
    id: 'swiss',
    label: '国际瑞士',
    en: 'Swiss International',
    themeAttr: 'data-accent',
    themes: ['ikb', 'lemon-yellow', 'lemon-green', 'safety-orange'],
  },
};

/* 六个真实 recipe（编号取自上游 references/layout-recipes.md，先读后选）。 */
export const RECIPES = [
  {
    id: 'M01',
    system: 'editorial',
    label: 'M01 刊首封面',
    desc: '刊头行 + 衬线大标题 + 影像窗 + 底部刊条',
    usesImage: 'optional',
    boardHint: { xhs: '图占 35–55%', square: '横幅图窗', wide: '左文右图' },
  },
  {
    id: 'M16',
    system: 'editorial',
    label: 'M16 影像封面',
    desc: '整幅照片 + 纸奶油色衬线标题（Kinfolk 式）',
    usesImage: 'required',
    boardHint: { xhs: '顶刊眉 + 底标题', square: '底部条带', wide: '左文柱' },
  },
  {
    id: 'M08',
    system: 'editorial',
    label: 'M08 长账本',
    desc: '刊头 + 4–6 条高行距账目行（序号/条目/注记）',
    usesImage: 'none',
    boardHint: { xhs: '全宽行', square: '紧凑行', wide: '左题右账' },
  },
  {
    id: 'S01',
    system: 'swiss',
    label: 'S01 强调封面',
    desc: '极细大字 + 抽象系统块 + 底部信息条',
    usesImage: 'none',
    boardHint: { xhs: '纵向排布', square: '居中构图', wide: '左字右块' },
  },
  {
    id: 'S02',
    system: 'swiss',
    label: 'S02 双信号',
    desc: '两大模块对比（一实一空）+ 各自注记',
    usesImage: 'none',
    boardHint: { xhs: '上下留白', square: '双列模块', wide: '左题右模块' },
  },
  {
    id: 'S05',
    system: 'swiss',
    label: 'S05 警示清单',
    desc: '警示大标题 + 三条横行（左 mono 标签右后果）',
    usesImage: 'none',
    boardHint: { xhs: '全宽行', square: '紧凑行', wide: '左题右行' },
  },
];

export const BOARDS = [
  { id: '3:4', board: 'xhs', w: 1080, h: 1440, label: '3:4 小红书', note: '1080×1440' },
  { id: '1:1', board: 'square', w: 1080, h: 1080, label: '1:1 方图', note: '1080×1080 独立排版' },
  { id: '21:9', board: 'wide', w: 2100, h: 900, label: '21:9 公众号', note: '2100×900' },
];

export const LIMITS = {
  kicker: 16,
  title: 26,
  subtitle: 60,
  signature: 24,
  tagCount: 3,
  tag: 10,
  itemCount: 5,
  itemTitle: 12,
  itemDesc: 34,
  imageBytes: 5 * 1024 * 1024,
  projectBytes: 12 * 1024 * 1024,
};

/* 各 recipe 对内容长度的实际可用预算（超出给警告，不截断）。
 * 依据：components.md 中文标题长度分带 / M16 标题预算表。 */
export const TITLE_BUDGETS = {
  M01: { xhs: 18, square: 14, wide: 16 },
  M16: { xhs: 12, square: 10, wide: 14 },
  M08: { xhs: 16, square: 12, wide: 16 },
  S01: { xhs: 14, square: 10, wide: 18 },
  S02: { xhs: 16, square: 12, wide: 18 },
  S05: { xhs: 16, square: 12, wide: 18 },
};

export const getRecipe = (id) => RECIPES.find((r) => r.id === id) || null;
export const getBoard = (id) => BOARDS.find((b) => b.id === id) || BOARDS[0];
export const recipesOfSystem = (systemId) => RECIPES.filter((r) => r.system === systemId);

/* 主题合法性：主题必须属于当前体系（切换体系时由 store 负责换默认主题）。 */
export function isThemeLegal(systemId, theme) {
  const sys = SYSTEMS[systemId];
  return Boolean(sys && sys.themes.includes(theme));
}

export function defaultThemeOf(systemId) {
  return systemId === 'swiss' ? 'ikb' : 'ink-classic';
}

/* 切换体系：recipe/theme 一并落到合法值，内容字段全部保留。 */
export function coerceStateShape(state) {
  const system = SYSTEMS[state.system] ? state.system : 'editorial';
  let recipe = getRecipe(state.recipe);
  if (!recipe || recipe.system !== system) {
    recipe = RECIPES.find((r) => r.system === system);
  }
  const theme = isThemeLegal(system, state.theme) ? state.theme : defaultThemeOf(system);
  const board = getBoard(state.ratio);
  return { system, recipe: recipe.id, theme, ratio: board.id };
}
