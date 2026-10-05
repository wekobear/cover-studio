import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
/* 工具 UI（HeroUI + Tailwind v4） */
import './styles/app.css';
/* Guizang 种子模板 CSS（已按体系作用域化）+ 配方粘合层。
 * 预览 / 缩略图 / PNG 光栅化共用这三份样式；导出用 posterCss.js 的同源文本。 */
import './poster/css/editorial.css';
import './poster/css/swiss.css';
import './poster/css/extras.css';

createRoot(document.getElementById('root')).render(<App />);
