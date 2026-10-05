/* 海报框架：体系 wrapper + board 尺寸类 + 体系主题属性 + Editorial 氛围层。
 * - wrapper .cw-sys-{system} 是生成 CSS 的作用域根（两套种子共享同名 class，
 *   靠 wrapper 隔离；:root 变量也已落到 wrapper 上）。
 * - 氛围层来自种子模板：canvas.mag-bg（vendor 的 magazine-bg-webgl.js，确定性
 *   frozenTime）+ .grain + .paper-wash —— Editorial 身份测试要求至少一层氛围。
 * - data-theme / data-accent 挂在 section 上，主题变量块由种子 CSS 提供。
 * - webgl=false 用于缩略图（性能）与 SVG/HTML 导出（canvas 无法序列化，纸纹+纸洗仍在）。
 */
import React, { useEffect, useRef } from 'react';
import { getBoard } from './model.js';
import { RECIPE_COMPONENTS } from './recipes.jsx';

export default function Poster({ state, image, webgl = false, domRef }) {
  const board = getBoard(state.ratio).board;
  const Recipe = RECIPE_COMPONENTS[state.recipe] || RECIPE_COMPONENTS.M01;
  const sectionEl = useRef(null);
  const canvasEl = useRef(null);
  const editorial = state.system === 'editorial';
  const themeAttr = editorial ? { 'data-theme': state.theme } : { 'data-accent': state.theme };

  useEffect(() => {
    if (!editorial || !webgl) return undefined;
    let cancelled = false;
    // 直接 import 上游 vendored 脚本（IIFE 挂 window.MagazineBg）
    import('../../vendor/guizang/assets/magazine-bg-webgl.js').then(() => {
      if (cancelled || !canvasEl.current || !sectionEl.current) return;
      const mount = window.MagazineBg && window.MagazineBg.mount;
      if (!mount) return;
      const cs = getComputedStyle(sectionEl.current);
      const parse = (name, fallback) => {
        const raw = cs.getPropertyValue(name).trim();
        if (!raw) return fallback;
        const p = raw.split(',').map((x) => parseInt(x, 10));
        return p.length === 3 && p.every((n) => Number.isFinite(n)) ? p : fallback;
      };
      // 与种子模板一致的确定性参数（strength 0.32 / frozenTime 12.5）
      mount(canvasEl.current, {
        ink: parse('--ink-rgb', [10, 10, 11]),
        paper: parse('--paper-rgb', [243, 240, 232]),
        accent: parse('--accent-rgb', [17, 17, 17]),
        strength: 0.32,
        frozenTime: 12.5,
      });
    }).catch(() => { /* WebGL 背景缺失时仍有纸纹+纸洗氛围层 */ });
    return () => { cancelled = true; };
  }, [editorial, webgl, state.theme, state.recipe, state.ratio]);

  return (
    <div
      ref={domRef}
      className={`cw-sys-${state.system}`}
      style={{ display: 'block', width: 'fit-content' }}
    >
      <section
        ref={sectionEl}
        className={`poster ${board}`}
        {...themeAttr}
      >
        {editorial && (
          <>
            {webgl && <canvas key={`bg-${state.theme}`} className="mag-bg" ref={canvasEl} />}
            <div className="grain"></div>
            <div className="paper-wash"></div>
          </>
        )}
        <Recipe state={state} image={image} board={board} />
      </section>
    </div>
  );
}
