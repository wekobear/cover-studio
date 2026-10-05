/* 封面工坊 v0.3.0 主应用：React 19 + HeroUI v3 工具 UI，Guizang 种子模板为底层渲染。 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs } from '@heroui/react';
import TopBar from './components/TopBar.jsx';
import StylePanel from './components/StylePanel.jsx';
import ContentPanel from './components/ContentPanel.jsx';
import Stage from './components/Stage.jsx';
import Poster from './poster/Poster.jsx';
import { setBuiltinImage } from './poster/recipes.jsx';
import {
  defaultState, updateField, updateItem, addItem, removeItem,
  selectSystem, selectRecipe, selectTheme, selectRatio,
  saveDraft, loadDraft, clearDraft, normalizeStoredImage,
  idbPutImage, idbGetImage, idbDeleteImage,
} from './store.js';
import { validateProject, projectFromState } from './validate.js';
import { exportPNG, exportSVG, exportHTML, exportJSON } from './exporters.js';
import { loadBuiltinImage } from './asset.js';
import { TITLE_BUDGETS, getBoard, LIMITS } from './poster/model.js';
import { charCount } from './text.js';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function sniffImage(bytes) {
  const startsWith = (magic) => magic.every((b, i) => bytes[i] === b);
  if (startsWith(PNG_MAGIC)) return 'png';
  if (startsWith(JPEG_MAGIC)) return 'jpeg';
  if (bytes.length > 12 && startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50])) {
    return 'webp';
  }
  return null;
}

function computeWarnings(state) {
  const ws = [];
  const board = getBoard(state.ratio).board;
  const budget = TITLE_BUDGETS[state.recipe] && TITLE_BUDGETS[state.recipe][board];
  const tLen = charCount(state.content.title);
  if (tLen === 0) ws.push('主标题为空');
  else if (budget && tLen > budget) {
    ws.push(`${state.recipe} × ${board} 的主标题建议 ≤${budget} 字（当前 ${tLen} 字），过长会压缩排版`);
  }
  const usesItems = ['M08', 'S05', 'S02', 'S01', 'M01'].includes(state.recipe);
  if (usesItems) {
    const empty = state.content.items.filter((it) => !it.title && !it.desc).length;
    if (empty) ws.push(`有 ${empty} 条空白条目会以空行呈现`);
    if ((state.recipe === 'M08' || state.recipe === 'S05') && state.content.items.length < 3) {
      ws.push(`${state.recipe} 建议 3–5 条，当前 ${state.content.items.length} 条`);
    }
  }
  if (state.recipe === 'S01' && !state.content.items.slice(0, 2).some((it) => it.title)) {
    ws.push('S01 的系统块取条目 1/2，建议填写条目标题');
  }
  return ws;
}

export default function App() {
  const [state, setState] = useState(defaultState);
  const [image, setImage] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState('content');
  const [exportKey, setExportKey] = useState(0);
  const importFileRef = useRef(null);
  const exportNodeRef = useRef(null);
  const resetArmedAt = useRef(0);
  const toastTimer = useRef(null);

  const notify = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), isError ? 6000 : 3200);
  }, []);

  /* ---------- 初始化：草稿（含 v1 迁移）+ 图片恢复 ---------- */
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.state) {
      setState(draft.state);
      if (draft.from === 'v1') {
        notify(`已从 0.2.0 草稿迁移：${draft.notes.join('；')}。原草稿保留在 cw.draft.v1。`);
      }
    }
    (async () => {
      let stored = null;
      try {
        stored = await idbGetImage();
      } catch {
        stored = null;
      }
      /* 0.2.0 存对象 {dataUrl,…}，0.3.0 存字符串 —— 统一归一化校验后使用 */
      const uploaded = normalizeStoredImage(stored);
      if (uploaded) {
        setImage({ source: 'upload', dataUrl: uploaded });
      } else {
        const builtin = await loadBuiltinImage();
        setBuiltinImage(builtin || '');
        setImage(builtin ? { source: 'builtin', dataUrl: builtin } : null);
      }
    })();
  }, [notify]);

  /* ---------- 草稿持久化 ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft({ ...state, imageRef: image && image.source === 'upload' });
    }, 400);
    return () => clearTimeout(t);
  }, [state, image]);

  /* ---------- 编辑动作 ---------- */
  const onField = useCallback((field, value) => {
    setState((s) => updateField(s, field, value));
  }, []);
  const onItem = useCallback((i, part, value) => {
    setState((s) => updateItem(s, i, part, value));
  }, []);
  const onAddItem = useCallback(() => setState((s) => addItem(s)), []);
  const onRemoveItem = useCallback((i) => setState((s) => removeItem(s, i)), []);
  const onSelectSystem = useCallback((sys) => setState((s) => selectSystem(s, sys)), []);
  const onSelectRecipe = useCallback((r) => setState((s) => selectRecipe(s, r)), []);
  const onSelectTheme = useCallback((t) => setState((s) => selectTheme(s, t)), []);
  const onSelectRatio = useCallback((r) => setState((s) => selectRatio(s, r)), []);

  /* ---------- 图片上传（魔数 + 大小校验） ---------- */
  const onUpload = useCallback(async (file) => {
    if (!file) return;
    if (file.size > LIMITS.imageBytes) {
      notify('图片超过 5MB 上限', true);
      return;
    }
    try {
      const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const kind = sniffImage(buf);
      if (!kind) {
        notify('仅支持 PNG / JPEG / WebP（已按文件头校验拒绝）', true);
        return;
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(file);
      });
      await idbPutImage(dataUrl);
      setImage({ source: 'upload', dataUrl });
      notify(`已使用上传图片（${kind.toUpperCase()}，${(file.size / 1024).toFixed(0)}KB），刷新后仍可恢复`);
    } catch (err) {
      notify(`图片读取失败：${err && err.message ? err.message : '未知错误'}`, true);
    }
  }, [notify]);

  const onRemoveImage = useCallback(async () => {
    try {
      await idbDeleteImage();
    } catch {
      /* ignore */
    }
    const builtin = await loadBuiltinImage();
    setBuiltinImage(builtin || '');
    setImage(builtin ? { source: 'builtin', dataUrl: builtin } : null);
    notify('已移除上传图片，恢复内置插画');
  }, [notify]);

  /* ---------- 导入项目 ---------- */
  const onImport = useCallback(() => {
    if (importFileRef.current) importFileRef.current.click();
  }, []);

  const onImportFile = useCallback(async (file) => {
    if (!file) return;
    try {
      if (file.size > LIMITS.projectBytes) {
        notify('项目文件超过 12MB 上限', true);
        return;
      }
      const text = await file.text();
      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        notify('不是有效的 JSON 文件', true);
        return;
      }
      const result = validateProject(raw, text);
      if (!result.ok) {
        notify(`导入被拒绝：${result.errors.join('；')}`, true);
        return;
      }
      const next = { ...result.state, imageRef: false };
      if (result.state.image && result.state.image.dataUrl) {
        /* 导入项目携带图片：落库并作为当前上传图 */
        await idbPutImage(result.state.image.dataUrl);
        setImage({ source: 'upload', dataUrl: result.state.image.dataUrl });
        next.imageRef = true;
        delete next.image;
      } else {
        /* 导入项目无图片：清掉旧上传，回到内置插画（图片状态由新项目决定） */
        try {
          await idbDeleteImage();
        } catch {
          /* ignore */
        }
        const builtin = await loadBuiltinImage();
        setBuiltinImage(builtin || '');
        setImage(builtin ? { source: 'builtin', dataUrl: builtin } : null);
        delete next.image;
      }
      setState(next);
      notify(result.migrated
        ? `已导入并迁移 0.2.0 项目：${result.migrationNotes.join('；')}`
        : '项目导入成功');
    } catch (err) {
      notify(`导入失败：${err && err.message ? err.message : '未知错误'}`, true);
    }
  }, [notify]);

  /* ---------- 导出 ---------- */
  const refreshExportNode = useCallback(() => new Promise((resolve) => {
    setExportKey((k) => k + 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 160)));
  }), []);

  const runExport = useCallback(async (kind) => {
    setBusy(true);
    try {
      await refreshExportNode();
      const node = exportNodeRef.current;
      if (!node) throw new Error('导出节点未就绪');
      if (kind === 'png') {
        const r = await exportPNG(node, state);
        notify(`PNG 已导出（${r.w}×${r.h}，${(r.bytes / 1024).toFixed(0)}KB）`);
      } else if (kind === 'svg') {
        const r = exportSVG(node, state);
        notify(`SVG 已导出（${(r.bytes / 1024).toFixed(0)}KB，foreignObject 内嵌真实排版）`);
      } else if (kind === 'html') {
        const r = exportHTML(node, state);
        notify(`HTML 单文件已导出（${(r.bytes / 1024).toFixed(0)}KB，无外部请求）`);
      } else if (kind === 'json') {
        const project = projectFromState(
          state,
          image && image.source === 'upload' ? image : null,
        );
        const r = exportJSON(project);
        notify(`项目 JSON 已导出（${(r.bytes / 1024).toFixed(0)}KB）`);
      }
    } catch (err) {
      notify(`导出失败：${err && err.message ? err.message : '未知错误'}`, true);
    } finally {
      setBusy(false);
    }
  }, [state, image, notify, refreshExportNode]);

  /* ---------- 重置（两步确认） ---------- */
  const onReset = useCallback(async () => {
    const now = Date.now();
    if (now - resetArmedAt.current > 4000) {
      resetArmedAt.current = now;
      notify('再点一次「重置示例」确认：将清空草稿与上传图片（4 秒内有效）');
      return;
    }
    resetArmedAt.current = 0;
    clearDraft();
    try {
      await idbDeleteImage();
    } catch {
      /* ignore */
    }
    const builtin = await loadBuiltinImage();
    setBuiltinImage(builtin || '');
    setImage(builtin ? { source: 'builtin', dataUrl: builtin } : null);
    setState(defaultState());
    notify('已恢复示例内容（0.2.0 草稿键 cw.draft.v1 未动）');
  }, [notify]);

  /* ---------- 复制提示词 ---------- */
  const onCopyPrompt = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      notify('提示词已复制');
    } catch {
      notify('复制失败，请手动全选复制', true);
    }
  }, [notify]);

  const warnings = useMemo(() => computeWarnings(state), [state]);

  return (
    <div className="cw-app">
      <TopBar
        busy={busy}
        onImport={onImport}
        onExportPNG={() => runExport('png')}
        onExportSVG={() => runExport('svg')}
        onExportHTML={() => runExport('html')}
        onExportJSON={() => runExport('json')}
        onReset={onReset}
      />
      <input
        ref={importFileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => { onImportFile(e.target.files && e.target.files[0]); e.target.value = ''; }}
      />

      <div className="cw-mobile-tabs">
        <Tabs
          selectedKey={mobileTab}
          onSelectionChange={(k) => setMobileTab(k)}
          aria-label="移动端面板切换"
        >
          <Tabs.List>
            <Tabs.Tab id="content">内容</Tabs.Tab>
            <Tabs.Tab id="style">样式</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>

      <main className="cw-workbench">
        {/* 左右 panel 的 wrapper 是 grid/flex 的真实子节点：高度约束与排序都作用在这里，
            内层 aside 才能拿到有限高度形成自身滚动（桌面）/自然高度（移动）。 */}
        <div className={`cw-side cw-side-left ${mobileTab === 'style' ? '' : 'cw-panel-hidden'}`}>
          <StylePanel
            state={state}
            image={image}
            onSelectSystem={onSelectSystem}
            onSelectRecipe={onSelectRecipe}
            onSelectRatio={onSelectRatio}
            onSelectTheme={onSelectTheme}
          />
        </div>
        <Stage state={state} image={image} warnings={warnings} />
        <div className={`cw-side cw-side-right ${mobileTab === 'content' ? '' : 'cw-panel-hidden'}`}>
          <ContentPanel
            state={state}
            image={image}
            onField={onField}
            onItem={onItem}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onUpload={onUpload}
            onRemoveImage={onRemoveImage}
            onCopyPrompt={onCopyPrompt}
          />
        </div>
      </main>

      {/* 离屏导出节点：自然尺寸渲染，与预览同一组件与样式 */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: '-20000px', zIndex: -1, background: 'transparent' }}
      >
        <Poster
          key={exportKey}
          domRef={(el) => { exportNodeRef.current = el; }}
          state={state}
          image={image}
          webgl={state.system === 'editorial'}
        />
      </div>

      {toast && (
        <div className={`cw-toast ${toast.isError ? 'cw-toast-error' : ''}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
