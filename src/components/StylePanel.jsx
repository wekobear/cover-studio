/* 左栏：体系 / 配方（真实缩略图）/ 画幅 / 主题。 */
import React from 'react';
import { SYSTEMS, RECIPES, BOARDS, recipesOfSystem } from '../poster/model.js';
import { EDITORIAL_THEMES, SWISS_ACCENTS } from '../poster/theme-data.js';
import RecipeThumb from './Thumb.jsx';

function themeDots(vars) {
  const dots = [];
  if (vars['--paper']) dots.push(vars['--paper']);
  if (vars['--ink']) dots.push(vars['--ink']);
  if (vars['--accent']) dots.push(vars['--accent']);
  if (vars['--paper-2']) dots.push(vars['--paper-2']);
  return dots.slice(0, 4);
}

export default function StylePanel({ state, onSelectSystem, onSelectRecipe, onSelectRatio, onSelectTheme, image }) {
  const sys = SYSTEMS[state.system];
  const recipes = recipesOfSystem(state.system);
  const themes = state.system === 'swiss' ? SWISS_ACCENTS : EDITORIAL_THEMES;

  return (
    <aside className="cw-panel cw-panel-left" aria-label="样式与版式库">
      <div className="cw-block">
        <h3 className="cw-block-title">体系 System</h3>
        <div className="cw-system-seg" role="group" aria-label="选择体系">
          {Object.values(SYSTEMS).map((s) => (
            <button
              key={s.id}
              type="button"
              className="cw-system-btn"
              aria-pressed={state.system === s.id}
              onClick={() => onSelectSystem(s.id)}
            >
              <span className="cw-system-btn-name">{s.label}</span>
              <span className="cw-system-btn-en">{s.en}</span>
              <span className="cw-system-btn-en">{s.themes.length} 套主题 · {recipesOfSystem(s.id).length} 个配方</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cw-block">
        <h3 className="cw-block-title">配方 Recipe <span className="cw-block-hint">编号来自底层 Skill</span></h3>
        <div className="cw-recipe-list" role="group" aria-label="选择配方">
          {recipes.map((r) => (
            <button
              key={r.id}
              type="button"
              className="cw-recipe-card"
              aria-pressed={state.recipe === r.id}
              onClick={() => onSelectRecipe(r.id)}
              title={`${r.label}：${r.desc}`}
            >
              <RecipeThumb state={{ ...state, recipe: r.id }} image={image} />
              <span className="cw-recipe-name">{r.label}</span>
              <span className="cw-recipe-desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cw-block">
        <h3 className="cw-block-title">画幅 Ratio</h3>
        <div className="cw-seg" role="group" aria-label="选择画幅">
          {BOARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              className="cw-seg-item"
              aria-pressed={state.ratio === b.id}
              onClick={() => onSelectRatio(b.id)}
            >
              {b.label}
              <span className="cw-seg-note">{b.note}</span>
            </button>
          ))}
        </div>
        <p className="cw-side-note">1:1 与 21:9 均为独立排版，非裁剪。</p>
      </div>

      <div className="cw-block">
        <h3 className="cw-block-title">主题 {state.system === 'swiss' ? 'Accent' : 'Theme'} <span className="cw-block-hint">{sys.en}</span></h3>
        <div className="cw-themes" role="group" aria-label="选择主题">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              className="cw-theme-btn"
              aria-pressed={state.theme === t.id}
              onClick={() => onSelectTheme(t.id)}
            >
              <span className="cw-theme-dots" aria-hidden="true">
                {themeDots(t.vars).map((v, i) => <i key={i} style={{ background: v }} />)}
              </span>
              {t.label}
            </button>
          ))}
        </div>
        <p className="cw-side-note">
          {state.system === 'swiss'
            ? '一整套封面只用一种强调色（Swiss 规则）。'
            : '主题含纸色/墨色/氛围层成套变量，深色仅「午夜墨色」。'}
        </p>
      </div>

      <p className="cw-side-note">
        模板（配方）决定结构，主题决定色彩体系 —— 两者独立切换，内容自动保留。
        底层种子来自 Guizang Social Card Skill（AGPL-3.0）。
      </p>
    </aside>
  );
}
