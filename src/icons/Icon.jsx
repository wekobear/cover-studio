/* Reicon 线性图标渲染（数据由 scripts/extract-reicon.mjs 从上游生成，仅本文件消费）。 */
import React from 'react';
import { REICON_ICONS } from './reicon.js';

export default function Icon({ name, size = 18, className = '', label }) {
  const icon = REICON_ICONS[name];
  if (!icon) return null;
  return (
    <svg
      className={`cw-icon ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: icon.code }}
    />
  );
}
