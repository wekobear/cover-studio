# 封面工坊 v0.3.0

浏览器本地使用的封面设计工具。排版内核来自开源项目
[Guizang Social Card Skill](https://github.com/op7418/guizang-social-card-skill)（AGPL-3.0，
commit `cf4b810`，字节级引入见 `vendor/guizang/PROVENANCE.md`）：

- **2 套体系**：杂志图志 Editorial Magazine × E-ink（衬线、纸色 6 主题）／
  国际瑞士 Swiss International（极细无衬线、4 强调色）
- **6 个配方**：M01 刊首封面 / M16 影像封面 / M08 长账本 / S01 强调封面 / S02 双栏卡 / S05 清单
- **3 档画幅**：3:4（1080×1440）、1:1（1080×1080）、21:9（2100×900），各自独立排版
- 体系切换保留内容；上传图片（PNG/JPEG/WebP ≤5MB，按文件头校验）存 IndexedDB，刷新可恢复；
  一键复制「排版还原提示词 / 生图提示词」
- **纯本地**：无服务端、无外部 API、无遥测；导出 PNG / SVG / 单文件 HTML / 项目 JSON

## 运行

```bash
npm install
npm run dev        # 本地开发（Vite）
npm test           # node:test 单元测试（40 项：模型 / 校验 / 迁移 / 存储 / 提示词 / 文本）
npm run build      # 产出 dist/（静态站点）
npm run preview    # 本地预览构建产物
```

需要 Node.js 20+（与 netlify.toml 一致）。

## 部署（Netlify）

`netlify.toml`：构建 `npm run build`，发布 `dist`，Node 20，严格 CSP 等安全响应头。
线上地址：[封面工坊](https://wekobear-cover-studio.netlify.app/)。

## 导出格式说明（如实）

- **PNG**：真实尺寸光栅化，与预览共用同一 DOM 与同一种子 CSS（所见即所得）。
- **SVG**：通过 `<foreignObject>` 内嵌**真实排版 DOM**（文本是真实文字、可选中复制）。
  与 0.2.0 的纯 `<text>` SVG 不同，部分工具（如 Figma）对 foreignObject 支持有限——
  需要矢量编辑场景请以 PNG 或 HTML 导出为对照。
- **HTML**：完整单文件，内联全部 CSS 与图片（data URL），无外部请求、无脚本。
  打开即静态展示，不会执行任何输入内容。

## 字体

海报排版使用**系统字体栈**（Noto Serif SC / Songti SC / Inter / SF Mono 等，按体系在
种子 CSS 中声明），不下载任何远程字体——与 CSP `font-src 'self'` 一致，也无 FOUT。
不同操作系统上字形略有差异属预期行为。

## CSP 说明

`script-src 'self'`（构建产物无内联脚本）；`style-src 'self'` 之外仅允许**一个内容
hash**（`sha256-38Rh…`）：react-aria（HeroUI 底层）在运行时注入的固定
`touch-action` 规则 `<style>`，内容确定，无 `unsafe-inline`。若升级 HeroUI 后
控制台出现样式被拒，重新计算该 hash 并更新 `netlify.toml`。

## 从 v0.2.0 迁移（可解释、不静默丢弃）

| 0.2.0 | 0.3.0 | 行为 |
| ---- | ---- | ---- |
| 模板 大字报 poster | 国际瑞士 S01 强调封面 | 大问句大字 → 极细大字体系；内容全保留 |
| 模板 方法卡 method | 国际瑞士 S05 清单 | 三步条目 → 条目行式；内容全保留 |
| 模板 图文志 editorial | 杂志图志 M01 刊首封面 | 图 + 标题排版就近映射 |
| 主题 paper | 杂志图志→墨韵经典 / 瑞士→克莱因蓝 | 按目标体系落到色感最接近的合法主题 |
| 主题 ink | 杂志图志→午夜墨色 / 瑞士→克莱因蓝 | Swiss 无深色主题，取默认蓝 |
| 主题 cream | 杂志图志→牛皮纸 / 瑞士→柠檬黄 | 暖色就近 |
| localStorage 草稿 `cw.draft.v1` | `cw.draft.v2` | 打开新版自动迁移并覆盖为 v2；不回写旧键 |
| IndexedDB 图片（旧对象形态） | 字符串形态 | 两种形态都识别（`src/store.js` 归一化），旧上传图直接恢复 |
| 项目 JSON v1 | v2 | 导入时严格校验旧 schema 再迁移；合法图片 dataUrl 保留，非法文件拒绝并提示原因 |

## 上游引入与重放（生成期，非运行时）

两份第三方素材由脚本从固定上游提交引入并做哈希核验，网站本身零网络请求：

- **Guizang 排版内核**：`node scripts/vendor-guizang.mjs`。来源为已安装的 Skill 目录
  （`GUIZANG_SKILL_DIR` 环境变量可覆盖，默认 `~/.codex/skills/guizang-social-card-skill`），
  15 个文件逐一比对 git blob sha1（见 `vendor/guizang/PROVENANCE.md`）。
- **Reicon 图标**：`node scripts/extract-reicon.mjs [icon-data.json路径]`。输入解析顺序：
  CLI 参数 > `REICON_ICON_DATA` 环境变量 > 本地缓存
  （`~/.cache/cover-workshop/reicon-icon-data.json`）> 从固定 GitHub commit 拉取
  （校验 blob sha1 后写入缓存）。MIT 许可证全文见 `vendor/reicon/LICENSE`。

## 与 Guizang Agent Skill 的关系

本工具的作者环境已将完整 Skill 安装在 Codex（`~/.codex/skills/`）与 Claude
（`~/.claude/skills/`）的技能目录中，可在新会话里直接调用——Skill 内含完整
28 个 recipe 与生图工作流。封面工坊网站不运行任何本地 CLI：Netlify 上跑的是
**vendored 产物**（两份种子 CSS + 精选 6 recipe + 10 主题，构建期固化进
`src/poster/`），无需安装、也不修改上游 Skill。

## 许可证

本项目整体以 **GNU AGPL-3.0** 发布（[LICENSE](LICENSE)），因集成了 AGPL-3.0 的
Guizang 排版内核。第三方组件（Reicon 图标 MIT、HeroUI Apache-2.0、html-to-image MIT 等）
见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
