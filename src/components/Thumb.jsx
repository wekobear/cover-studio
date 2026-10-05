/* 真实结构缩略图：直接渲染同一个 Poster 组件（无 WebGL，缩放显示），
 * 保证模板选择器里看到的就是真实版式结构，不是抽象图标。 */
import React, { useEffect, useRef, useState } from 'react';
import Poster from '../poster/Poster.jsx';

export default function RecipeThumb({ state, image }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(0.1);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setScale(el.clientWidth / 1080);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const thumbState = { ...state, ratio: '3:4' };

  return (
    <div className="cw-thumb" ref={boxRef} aria-hidden="true">
      <div className="cw-thumb-scale" style={{ width: 1080, transform: `scale(${scale})` }}>
        <Poster state={thumbState} image={image} webgl={false} />
      </div>
    </div>
  );
}
