// 应用状态：默认示例（真实城市选择内容）+ 草稿持久化。
// 文字草稿存 localStorage（小数据）；图片单独存 IndexedDB（避免 quota 问题）。
import { LIMITS } from './themes.js';
import { cleanText } from './text.js';

const DRAFT_KEY = 'cw.draft.v1';

export function defaultState() {
  return {
    template: 'poster',
    ratio: '3:4',
    theme: 'paper',
    titleScale: 'm',
    content: {
      title: '毕业后，去哪座城？',
      subtitle: '36 座城市，把选择摊开看',
      signature: 'Weko · 设计与 AI',
      tags: ['城市选择', '毕业生'],
      items: [
        { title: '就业机会', desc: '先看岗位多不多，再谈城市好坏' },
        { title: '生活成本', desc: '房租、通勤、日常开销，按到手收入算' },
        { title: '你的偏好', desc: '行业、节奏、气候，权重由你定' },
      ],
    },
    image: null,
  };
}

function saneDraft(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.content !== 'object' || raw.content === null) return null;
  const c = raw.content;
  if (typeof c.title !== 'string' && typeof c.subtitle !== 'string') return null;
  return {
    template: typeof raw.template === 'string' ? raw.template : 'poster',
    ratio: typeof raw.ratio === 'string' ? raw.ratio : '3:4',
    theme: typeof raw.theme === 'string' ? raw.theme : 'paper',
    titleScale: typeof raw.titleScale === 'string' ? raw.titleScale : 'm',
    content: {
      title: cleanText(c.title ?? ''),
      subtitle: cleanText(c.subtitle ?? ''),
      signature: cleanText(c.signature ?? ''),
      tags: Array.isArray(c.tags) ? c.tags.slice(0, LIMITS.tagCount).map((t) => cleanText(t).slice(0, LIMITS.tag)) : [],
      items: Array.isArray(c.items)
        ? c.items.slice(0, LIMITS.itemCount).map((it) => ({
            title: cleanText(it && it.title).slice(0, LIMITS.itemTitle),
            desc: cleanText(it && it.desc).slice(0, LIMITS.itemDesc),
          }))
        : [],
    },
    image: null,
  };
}

export function loadDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return saneDraft(raw);
  } catch {
    return null;
  }
}

export function saveDraft(state) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      template: state.template,
      ratio: state.ratio,
      theme: state.theme,
      titleScale: state.titleScale,
      content: state.content,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* 忽略 */ }
}

// ---------- IndexedDB：单条用户图片 ----------
const DB_NAME = 'cover-workshop';
const STORE = 'images';
const IMG_KEY = 'user-image';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no idb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, mode);
    const st = tx.objectStore(STORE);
    let result;
    try { result = fn(st); } catch (e) { resolve(undefined); return; }
    tx.oncomplete = () => resolve(result ? result.result ?? result : undefined);
    tx.onerror = () => resolve(undefined);
    tx.onabort = () => resolve(undefined);
  });
}

export async function idbGetImage() {
  try {
    // withStore 在事务完成后已解包为记录本身（get 的 request.result）
    const rec = await withStore('readonly', (st) => st.get(IMG_KEY));
    return rec && rec.dataUrl ? rec : null;
  } catch {
    return null;
  }
}

export async function idbPutImage(rec) {
  try {
    await withStore('readwrite', (st) => st.put(rec, IMG_KEY));
    return true;
  } catch {
    return false;
  }
}

export async function idbDeleteImage() {
  try {
    await withStore('readwrite', (st) => st.delete(IMG_KEY));
    return true;
  } catch {
    return false;
  }
}
