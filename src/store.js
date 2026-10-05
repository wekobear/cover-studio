/* 应用状态与持久化。
 * - localStorage 草稿：cw.draft.v2（新版）；cw.draft.v1 只读迁移，迁移后原键保留不删。
 * - 用户图片：IndexedDB（cover-workshop / images / user-image），与 0.2.0 同库同键，刷新可恢复。
 * - 图片对象仅在内存保存 dataUrl；草稿只存 imageRef 标记，避免 localStorage 超额。
 */

import { coerceStateShape, defaultThemeOf, LIMITS } from './poster/model.js';
import { cleanText, cleanMultiline } from './text.js';
import { normalizeDraft } from './migrate.js';
import { DATAURL_RE } from './validate.js';

export const DRAFT_KEY_V2 = 'cw.draft.v2';
export const DRAFT_KEY_V1 = 'cw.draft.v1';

export function defaultState() {
  return {
    version: 2,
    system: 'editorial',
    recipe: 'M01',
    theme: 'ink-classic',
    ratio: '3:4',
    content: {
      kicker: '城市选择 · City',
      title: '毕业后，\n去哪座城？',
      subtitle: '36 座城市，把选择摊开看',
      signature: 'Weko · 设计与 AI',
      tags: ['城市选择', '毕业生'],
      items: [
        { title: '就业机会', desc: '先看岗位多不多，再谈生活成本' },
        { title: '生活成本', desc: '房租与通勤决定每月留下的钱' },
        { title: '留下来的理由', desc: '朋友圈、气候与长期归属感' },
      ],
    },
    imageRef: false,
  };
}

/* ---------- 内容更新（全部走清洗，保持单一数据流） ---------- */

export function updateField(state, field, value) {
  return { ...state, content: { ...state.content, [field]: value } };
}

export function updateItem(state, index, part, value) {
  const items = state.content.items.map((it, i) => (i === index ? { ...it, [part]: value } : it));
  return { ...state, content: { ...state.content, items } };
}

export function addItem(state) {
  if (state.content.items.length >= 5) return state;
  return {
    ...state,
    content: { ...state.content, items: [...state.content.items, { title: '', desc: '' }] },
  };
}

export function removeItem(state, index) {
  if (state.content.items.length <= 1) return state;
  return {
    ...state,
    content: { ...state.content, items: state.content.items.filter((_, i) => i !== index) },
  };
}

/* ---------- 体系 / 配方 / 主题 / 画幅切换：内容永不丢弃 ---------- */

export function selectSystem(state, system) {
  const next = coerceStateShape({ ...state, system });
  // recipe/theme 落到目标体系的默认合法值时保持内容不变
  return { ...state, ...next };
}

export function selectRecipe(state, recipe) {
  const next = coerceStateShape({ ...state, recipe });
  return { ...state, ...next };
}

export function selectTheme(state, theme) {
  const next = coerceStateShape({ ...state, theme });
  return { ...state, ...next };
}

export function selectRatio(state, ratio) {
  const next = coerceStateShape({ ...state, ratio });
  return { ...state, ...next };
}

/* ---------- 草稿 ---------- */

export function saveDraft(state) {
  try {
    const payload = JSON.stringify({ ...state, imageRef: state.imageRef });
    localStorage.setItem(DRAFT_KEY_V2, payload);
    return true;
  } catch {
    return false;
  }
}

export function loadDraft() {
  let raw = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY_V2);
  } catch {
    raw = null;
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const norm = normalizeDraft(parsed);
      if (norm) return { ...norm, from: 'v2' };
    } catch {
      /* fallthrough to v1 */
    }
  }
  try {
    const v1 = localStorage.getItem(DRAFT_KEY_V1);
    if (v1) {
      const parsed = JSON.parse(v1);
      const norm = normalizeDraft(parsed);
      if (norm) return { ...norm, from: 'v1' };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY_V2);
  } catch {
    /* ignore */
  }
}

/* ---------- IndexedDB（沿用 0.2.0 的库名/仓库名/主键） ---------- */

/* 0.2.0 在同一主键下存的是对象 {dataUrl,name,size,w,h}；0.3.0 直接存 dataUrl 字符串。
 * 读取时归一化两种形态：合法（PNG/JPEG/WebP base64 且 ≤5MB）返回 dataUrl，否则 null。 */
export function normalizeStoredImage(value) {
  if (typeof value === 'string' && DATAURL_RE.test(value)) {
    const bytes = Math.floor((value.length - value.indexOf(',') - 1) * 3 / 4);
    return bytes <= LIMITS.imageBytes ? value : null;
  }
  if (value && typeof value === 'object' && typeof value.dataUrl === 'string') {
    return normalizeStoredImage(value.dataUrl);
  }
  return null;
}

const DB_NAME = 'cover-workshop';
const STORE = 'images';
const IMAGE_KEY = 'user-image';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPutImage(dataUrl) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, IMAGE_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetImage() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(IMAGE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDeleteImage() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(IMAGE_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
