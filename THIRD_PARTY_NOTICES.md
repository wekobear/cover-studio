# 第三方组件声明

封面工坊 v0.3.0 是一个集成项目，整体以 GNU AGPL-3.0 发布（见根目录 [LICENSE](LICENSE)）。
以下第三方作品的许可证与其各自的上游要求一致。

## 1. Guizang Social Card Skill（排版内核，AGPL-3.0）

- 上游：<https://github.com/op7418/guizang-social-card-skill>
- 提交：`cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5`
- 引入方式：以 `scripts/vendor-guizang.mjs` 字节级复制到 `vendor/guizang/`，
  每个文件经 git blob sha1 与上游提交比对核验（见 `vendor/guizang/PROVENANCE.md`）。
- 实际使用：
  - `assets/template-editorial-card.html`、`assets/template-swiss-card.html`
    的 CSS 作为两套体系种子（构建期 scope 到 `.cw-sys-editorial` / `.cw-sys-swiss`，
    运行时代码在 `src/poster/`）；
  - `references/*.md` 作为 6 个配方（M01 / M16 / M08 / S01 / S02 / S05）、
    10 个主题与三档画幅规格的依据；
  - `assets/magazine-bg-webgl.js` 在 `src/poster/Poster.jsx` 中直接加载，提供确定性的 WebGL 氛围层。
- 许可证：AGPL-3.0（上游仓库根 LICENSE；其 package.json 误标 ISC，以 LICENSE 为准）。

## 2. Reicon 图标（MIT）

- 上游：<https://github.com/wekobear/reicon>，提交 `a6ce0bbb5ee2f67072360d61ee146e4fddab30db`
- 引入方式：`scripts/extract-reicon.mjs` 从上游 `data/icon-data.json`
  提取 Outline 线性风格 45 枚到 `src/icons/reicon.js`，markup 为上游原文
  （源文件 blob sha1 `3642a7851b1093d21421f6294b3d002fa341ce67`）。
- 许可证：MIT，Copyright (c) 2025 REICON —— 全文原样保存于
  [vendor/reicon/LICENSE](vendor/reicon/LICENSE)（取自同一提交）。
  本工具界面图标全部来自此集（真实 SVG，无 Lucide、无 emoji）。

## 3. npm 依赖

下表「版本」为 package.json 声明的 semver **范围**；实际安装的精确版本以
`package-lock.json` 为准（交付时：react 19.3.0 / @heroui 3.2.6 / html-to-image
1.11.13 / tailwindcss 4.3.3 / vite 6.4.3）。

| 包 | 声明范围 | 许可证 | 用途 |
| ---- | ---- | ---- | ---- |
| react / react-dom | ^19.1.0 | MIT | UI 框架 |
| @heroui/react, @heroui/styles | ^3.2.6 | Apache-2.0 | 组件库（官方 npm） |
| html-to-image | ^1.11.13 | MIT | DOM → PNG 光栅化 |
| vite / @vitejs/plugin-react | ^6.3.5 / ^4.5.2 | MIT | 构建工具（开发期） |
| tailwindcss / @tailwindcss/vite | ^4.1.8 | MIT | 工具 UI 样式（仅工具界面，不进入海报种子 CSS） |

## 4. 系统字体

海报排版使用系统字体栈（Noto Serif SC / Songti SC / Inter / SF Mono 等，
按体系在种子 CSS 中声明），不请求任何远程字体 —— 与 CSP `font-src 'self'` 一致。

## 5. 上游同步

重放引入脚本即可与上游对齐核验（均为生成期操作，网站运行时零网络请求）：

```bash
node scripts/vendor-guizang.mjs    # Guizang：重新拷贝 + 哈希核验（来源见 GUIZANG_SKILL_DIR）
node scripts/extract-reicon.mjs    # Reicon：来源 CLI 参数 > REICON_ICON_DATA > 本地缓存 > 固定 commit 拉取
```
