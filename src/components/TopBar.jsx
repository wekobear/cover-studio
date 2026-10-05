/* 顶栏：品牌 / 导入导出 / 开源源码与帮助。
 * 桌面全部平铺；移动端品牌不换行、PNG 主操作直出，次要操作收进「更多」Popover。 */
import React from 'react';
import { Button, Popover } from '@heroui/react';
import Icon from '../icons/Icon.jsx';
import { APP_VERSION } from '../version.js';

export const REPO_URL = 'https://github.com/wekobear/cover-studio';
export const GUIZANG_URL = 'https://github.com/op7418/guizang-social-card-skill';
export const REICON_URL = 'https://github.com/wekobear/reicon';
export const HEROUI_URL = 'https://www.heroui.com';

export function HelpContent() {
  return (
    <div className="cw-help">
      <h4>关于封面工坊</h4>
      <p>
        底层渲染来自开源 <a className="cw-link" href={GUIZANG_URL} target="_blank" rel="noreferrer">Guizang Social Card Skill</a>
        （AGPL-3.0）的种子模板：两套体系（杂志图志 / 国际瑞士）× 六个真实配方 × 十套主题，
        在浏览器内本地排版与导出，无联网上传、无遥测。
      </p>
      <h4>导出说明</h4>
      <ul>
        <li>PNG：真实尺寸 1080×1440 / 1080×1080 / 2100×900，与预览一致。</li>
        <li>SVG：以 foreignObject 内嵌真实排版（非旧版纯文本矢量），Figma 等对其支持有限。</li>
        <li>HTML：完整单文件（内联 CSS 与图片，无外部请求、无脚本）。</li>
        <li>JSON：可再导入的项目文件（含内容与图片）。</li>
      </ul>
      <h4>开源源码</h4>
      <p>
        本工具以 AGPL-3.0 发布，源码在{' '}
        <a className="cw-link" href={REPO_URL} target="_blank" rel="noreferrer">GitHub · wekobear/cover-studio</a>；
        UI 组件 <a className="cw-link" href={HEROUI_URL} target="_blank" rel="noreferrer">HeroUI</a>（Apache-2.0）、
        图标 <a className="cw-link" href={REICON_URL} target="_blank" rel="noreferrer">Reicon</a>（MIT），
        完整第三方声明见仓库 THIRD_PARTY_NOTICES.md。
      </p>
      <p className="cw-help-src">所有文字与图片仅在本地浏览器处理。</p>
    </div>
  );
}

function HelpButton() {
  return (
    <Popover>
      <Button variant="ghost" size="sm" isIconOnly aria-label="帮助与开源信息">
        <Icon name="help" size={16} />
      </Button>
      <Popover.Content>
        <Popover.Dialog>
          <HelpContent />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/* 移动端「更多」：次要导入/导出/重置收进 Popover，全部仍是可键盘触达的真按钮。 */
function MoreMenu({ onImport, onExportJSON, onExportSVG, onExportHTML, onReset, busy }) {
  return (
    <Popover placement="bottom-end">
      <Button variant="ghost" size="sm" isIconOnly aria-label="更多操作">
        <Icon name="menu" size={18} />
      </Button>
      <Popover.Content>
        <Popover.Dialog aria-label="更多操作">
          <div className="cw-more-menu">
            <Button variant="ghost" size="sm" isDisabled={busy} onPress={onImport}>导入项目</Button>
            <Button variant="ghost" size="sm" isDisabled={busy} onPress={onExportJSON}>导出 JSON</Button>
            <Button variant="ghost" size="sm" isDisabled={busy} onPress={onExportSVG}>导出 SVG</Button>
            <Button variant="ghost" size="sm" isDisabled={busy} onPress={onExportHTML}>导出 HTML</Button>
            <Button variant="ghost" size="sm" isDisabled={busy} onPress={onReset}>重置示例</Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default function TopBar({
  onImport, onExportPNG, onExportSVG, onExportHTML, onExportJSON, onReset, busy,
}) {
  return (
    <header className="cw-topbar">
      <div className="cw-brand">
        <span className="cw-brand-name">封面工坊</span>
        <span className="cw-brand-ver">v{APP_VERSION}</span>
      </div>
      <div className="cw-topbar-actions">
        <span className="cw-only-desktop">
          <Button variant="ghost" size="sm" isDisabled={busy} onPress={onImport}>导入项目</Button>
        </span>
        <span className="cw-only-desktop">
          <Button variant="ghost" size="sm" isDisabled={busy} onPress={onExportJSON}>导出 JSON</Button>
        </span>
        <span className="cw-only-desktop">
          <Button variant="ghost" size="sm" isDisabled={busy} onPress={onReset}>重置示例</Button>
        </span>
        <span className="cw-only-desktop">
          <Button variant="outline" size="sm" isDisabled={busy} onPress={onExportSVG}>导出 SVG</Button>
        </span>
        <span className="cw-only-desktop">
          <Button variant="outline" size="sm" isDisabled={busy} onPress={onExportHTML}>导出 HTML</Button>
        </span>
        <Button variant="primary" size="sm" isDisabled={busy} onPress={onExportPNG}>
          <Icon name="download" size={15} /> 导出 PNG
        </Button>
        <span className="cw-only-mobile">
          <MoreMenu
            onImport={onImport}
            onExportJSON={onExportJSON}
            onExportSVG={onExportSVG}
            onExportHTML={onExportHTML}
            onReset={onReset}
            busy={busy}
          />
        </span>
        <HelpButton />
      </div>
    </header>
  );
}
