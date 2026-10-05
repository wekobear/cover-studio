/* 中心画布：浅灰底 + 等比缩放预览（与导出同一 DOM 结构与样式）。 */
import React, { useEffect, useRef, useState } from 'react';
import Poster from '../poster/Poster.jsx';
import { getBoard, getRecipe } from '../poster/model.js';
import { boardMeta } from '../exporters.js';

export default function Stage({ state, image, warnings }) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(0.4);
  const board = getBoard(state.ratio);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const measure = () => {
      const mobile = window.innerWidth <= 960;
      const pad = mobile ? 32 : 64;
      /* 移动端只按可用宽度算：单列布局里 canvas 高度由预览自身决定，
         若再除以 clientHeight 会形成"高度由缩放定、缩放又由高度定"的反馈，图被压成小图。 */
      const s = mobile
        ? Math.min((el.clientWidth - pad) / board.w, 1)
        : Math.min((el.clientWidth - pad) / board.w, (el.clientHeight - pad) / board.h, 1);
      setScale(Math.max(s, 0.05));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [board.w, board.h]);

  const recipe = getRecipe(state.recipe);

  return (
    <section className="cw-stage" aria-label="封面预览">
      {warnings && warnings.length > 0 && (
        <div className="cw-warnbar" role="status">
          <b>排版提示</b>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
      <div className="cw-stage-canvas" ref={canvasRef}>
        <div
          className="cw-poster-shell"
          style={{ width: board.w * scale, height: board.h * scale }}
        >
          <div
            className="cw-poster-scale"
            style={{ width: board.w, transform: `scale(${scale})` }}
          >
            <Poster state={state} image={image} webgl={state.system === 'editorial'} />
          </div>
        </div>
      </div>
      <div className="cw-stage-meta">
        <span>{boardMeta(state)}</span>
        <span>{recipe.desc}</span>
        <span style={{ marginLeft: 'auto' }}>预览与导出共用同一 DOM 与样式</span>
      </div>
    </section>
  );
}
