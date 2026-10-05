// 模板 / 画幅 / 配色的静态定义。配色沿用静态封面项目的三色体系（深墨蓝 / 暖白 / 鲜橙）。
export const FONT_STACK = 'PingFang SC, Hiragino Sans GB, Noto Sans SC, Microsoft YaHei, sans-serif';

export const RATIOS = {
  '3:4': { w: 1080, h: 1440, label: '3:4 · 1080×1440' },
  '1:1': { w: 1080, h: 1080, label: '1:1 · 1080×1080' },
};

export const TITLE_SCALES = { s: 0.85, m: 1, l: 1.15 };

export const THEMES = {
  paper: {
    label: '纸墨橙',
    bg: '#FAF6F0', ink: '#14213D', accent: '#FF5A1F',
    muted: '#5A6478', faint: '#8A93A8', panel: '#EFE7DA', deco: '#E2D7C4',
  },
  ink: {
    label: '墨蓝夜',
    bg: '#14213D', ink: '#FAF6F0', accent: '#FF7A3D',
    muted: '#C9CFDD', faint: '#8A93A8', panel: '#1F2F55', deco: '#2E4066',
  },
  cream: {
    label: '暖奶油',
    bg: '#FBE9D3', ink: '#4A2C17', accent: '#E04E15',
    muted: '#8C7A6B', faint: '#A6958A', panel: '#F3D9BA', deco: '#EACBA2',
  },
};

export const TEMPLATES = {
  poster: { label: '大字报', desc: '大问句 + 城市几何' },
  method: { label: '方法卡', desc: '三步条目编辑式' },
  editorial: { label: '图文志', desc: '插画 + 标题排版' },
};

// 内容长度上限（UI maxlength 与项目导入校验共用）
export const LIMITS = {
  title: 26,
  subtitle: 60,
  signature: 24,
  tagCount: 3,
  tag: 10,
  itemCount: 3,
  itemTitle: 12,
  itemDesc: 34,
  imageBytes: 5 * 1024 * 1024,
  projectBytes: 12 * 1024 * 1024,
};
