# 封面工坊 v0.2.0

浏览器本地使用的小红书封面编辑器：三套模板（大字报 / 方法卡 / 图文志），实时预览，导出真实尺寸的 PNG 与 SVG。编辑的文字和图片只在本机浏览器处理，不上传到服务端。

## 运行

```bash
npm install
npm run dev        # 本地开发（Vite）
npm test           # node:test 单元测试（文本换行 / SVG 序列化 / 校验 / 场景）
npm run build      # 产出 dist/（静态站点）
npm run preview    # 本地预览构建产物
```

需要 Node.js 20+（与 netlify.toml 一致）。纯静态构建，无服务端、无外部 API 调用、无遥测。

## 部署（Netlify）

仓库根目录已含 `netlify.toml`：构建命令 `npm run build`，发布目录 `dist`，Node 版本 20，并配置了严格 CSP 等安全响应头。已上线：[封面工坊](https://wekobear-cover-studio.netlify.app/)。源码保存在 [GitHub](https://github.com/wekobear/cover-studio)，Netlify 已连接 `main` 分支，推送后自动构建。

## 输入保存范围

- 文字草稿（标题 / 副标题 / 标签 / 条目等）：保存在浏览器 `localStorage`，仅本机。
- 用户上传的图片：保存在浏览器 `IndexedDB`，仅本机。
- 清除浏览器站点数据即彻底删除；除「导出项目 / 导出 PNG / 导出 SVG」生成的下载文件外，没有任何数据离开浏览器。
- 图片上传仅接受 PNG / JPEG / WebP（≤5MB，魔数校验）；拒绝 SVG 上传以防脚本注入。

## 导出格式与边界

- **PNG**：固定实际尺寸 1080×1440（3:4）或 1080×1080（1:1），由同一渲染模型光栅化，与预览一致。
- **SVG**：保留 `<text>` 元素（非轮廓化、不用 foreignObject），字体为系统字体栈（PingFang SC 等）。**在其他工具（如 Figma）中导入 SVG 时，不保证文字保持可编辑**——是否可编辑取决于导入工具对系统字体与文本布局的支持。
- **项目 JSON**：完整保存当前内容与图片（data URL 形式），导入时会校验格式、版本、字段类型、长度与图片大小，非法文件会被中文错误提示拒绝。

## 已知边界

- 已在真实 Netlify 环境验证模板切换、文字编辑、插画显示、PNG 导出、提示词复制及刷新恢复；线上静态资产与验收构建一致。
- 本地验证：27 项单元测试及 17 项核心流程通过。
- E2E 验证使用系统 Chrome headless；Safari / Firefox 未测。
- 「AI 提示词」仅为本地生成的提示词模板，不包含也不宣称在线 AI 能力。
