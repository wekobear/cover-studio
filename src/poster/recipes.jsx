/* 六个真实 recipe 的 React 实现（编号与结构对应上游 layout-recipes.md）。
 * 全部排版类名来自种子模板 CSS（editorial.css / swiss.css，由脚本从
 * vendor/guizang 生成）；仅少量组合粘合在 extras.css。
 * 每个 recipe 按画幅（xhs 3:4 / square 1:1 / wide 21:9）独立构图，
 * 方形绝不硬裁剪 —— 见 WeChat Adaptation 一节的构图规则。
 */
import React from 'react';

const Lines = ({ text }) => {
  const parts = String(text || '').split('\n').filter((s) => s.length > 0);
  if (!parts.length) return null;
  return parts.map((p, i) => <React.Fragment key={i}>{i > 0 && <br />}{p}</React.Fragment>);
};

const tag = (c, i) => (c.tags && c.tags[i]) || '';
const item = (c, i) => c.items[i] || { title: '', desc: '' };
const hasItem = (c, i) => Boolean(c.items[i] && (c.items[i].title || c.items[i].desc));

/* ============================= Editorial M01 刊首封面 ============================= */
/* 结构：刊头行 / 衬线大标题(2–4行) / 影像窗 35–55% / 底部刊条 3–5 点。 */
export function M01({ state, image, board }) {
  const { content: c } = state;
  const img = image && image.dataUrl;
  const strip = c.items.map((it, i) => (hasItem(c, i) ? it.title : '')).filter(Boolean);

  if (board === 'wide') {
    return (
      <>
        <div className="content stack gap-2 safe-bottom">
          <div className="issue-row">
            <span>Vol.01</span><span className="dot"></span><span>{tag(c, 0) || 'Cover'}</span>
          </div>
          <div className="col-2-7-5 grow">
            <div className="stack">
              <p className="kicker">{c.kicker || 'Cover'}</p>
              <h1 className="h-display"><Lines text={c.title} /></h1>
              {c.subtitle && <p className="lead">{c.subtitle}</p>}
              <div className="grow"></div>
              <p className="meta">{c.signature}</p>
            </div>
            {img ? (
              <figure className="frame-img r-4x3"><img src={img} alt="" /></figure>
            ) : (
              <figure className="frame-img r-4x3 fit-contain">
                <img src={BUILTIN_IMG} alt="" />
              </figure>
            )}
          </div>
        </div>
        <div className="issue-strip">
          <span>{strip[0] || c.signature}</span>
          <span>—</span>
          <span>{strip[1] || 'Issue · Magazine'}</span>
          <span>—</span>
          <span>{strip[2] || c.signature}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="content stack gap-2 safe-bottom">
        <div className="issue-row">
          <span>Vol.01</span><span className="dot"></span><span>{tag(c, 0) || 'Cover'}</span>
        </div>
        <div>
          <p className="kicker">{c.kicker || 'Cover'}</p>
          <h1 className="h-display"><Lines text={c.title} /></h1>
          {c.subtitle && board === 'xhs' && <p className="h-sub">{c.subtitle}</p>}
        </div>
        {img ? (
          <figure className={`frame-img ${board === 'square' ? 'r-21x9' : 'r-16x10'}`}>
            <img src={img} alt="" />
          </figure>
        ) : (
          <p className="callout">
            {c.subtitle}
            <span className="callout-src">{c.signature}</span>
          </p>
        )}
        {img && c.signature && <p className="img-cap">{c.signature}</p>}
        <div className="grow"></div>
      </div>
      <div className="issue-strip">
        <span>{strip[0] || c.signature}</span>
        <span>—</span>
        <span>{strip[1] || 'Issue · Magazine'}</span>
        <span>—</span>
        <span>{strip[2] || c.signature}</span>
      </div>
    </>
  );
}

/* 内置插画 dataURL 由 Poster 注入（window.__CW_BUILTIN__），避免在这里 import 二进制。 */
let BUILTIN_IMG = '';
export const setBuiltinImage = (url) => { BUILTIN_IMG = url; };

/* ============================= Editorial M16 影像封面 ============================= */
/* 整幅照片 + 纸奶油色衬线标题；xhs=模式A 顶压底沉 / square=模式D 下沉条带 / wide=模式B 侧栏立柱。 */
export function M16({ state, image, board }) {
  const { content: c } = state;
  const img = (image && image.dataUrl) || BUILTIN_IMG;
  const Title = () => <h1 className="m16-title"><Lines text={c.title} /></h1>;
  const Kicker = () => <p className="m16-kicker">{c.kicker || tag(c, 0) || 'Cover'}</p>;
  const Strip = ({ children }) => <p className="m16-strip">{children}</p>;

  if (board === 'wide') {
    return (
      <>
        <div className="m16-hero"><img src={img} alt="" /></div>
        <div className="m16-scrim side"></div>
        <div className="m16-cols">
          <div className="m16-text stack" style={{ justifyContent: 'center' }}>
            <Strip>{tag(c, 0) || 'Cover'} · Vol.01</Strip>
            <div className="stack" style={{ marginTop: 48 }}>
              <Kicker />
              <Title />
              {c.subtitle && <p className="m16-sub">{c.subtitle}</p>}
              <hr className="m16-rule" />
              <Strip>{c.signature}</Strip>
            </div>
          </div>
          <div></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="m16-hero"><img src={img} alt="" /></div>
      <div className="m16-scrim"></div>
      <div className="content m16-text stack" style={{ justifyContent: 'space-between' }}>
        <Strip>{tag(c, 0) || 'Cover'} · Vol.01</Strip>
        <div className="stack" style={{ gap: 0 }}>
          <Kicker />
          <Title />
          {c.subtitle && <p className="m16-sub">{c.subtitle}</p>}
          <hr className="m16-rule" />
          <Strip>{c.signature}</Strip>
        </div>
      </div>
    </>
  );
}

/* ============================= Editorial M08 长账本 ============================= */
/* 刊头 + 4–6 条高行距账目行（mono 序号 / 衬线条目 / 注记），底部刊条。 */
export function M08({ state, image, board }) {
  const { content: c } = state;
  const rows = c.items;

  const Ledger = ({ className }) => (
    <div className={`ledger ${className || ''}`}>
      {rows.map((it, i) => (
        <div className="ledger-row tall" key={i}>
          <span className="ledger-nb">{String(i + 1).padStart(2, '0')}</span>
          <span className="ledger-title">{it.title}</span>
          <span className="ledger-note">{it.desc}</span>
        </div>
      ))}
    </div>
  );

  if (board === 'wide') {
    return (
      <div className="content stack gap-2">
        <div className="issue-row">
          <span>{tag(c, 0) || 'Issue'}</span><span className="dot"></span><span>Vol.01</span>
        </div>
        <div className="grid-12 grow">
          <div className="span-4 stack">
            <p className="kicker">{c.kicker || 'Ledger'}</p>
            <h1 className="h-xl"><Lines text={c.title} /></h1>
            {c.subtitle && <p className="lead">{c.subtitle}</p>}
            <div className="grow"></div>
            <p className="meta">{c.signature}</p>
          </div>
          <div className="span-8">
            <Ledger />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="content stack gap-2 safe-bottom">
        <div className="issue-row">
          <span>{tag(c, 0) || 'Issue'}</span><span className="dot"></span><span>Vol.01</span>
        </div>
        <p className="kicker">{c.kicker || 'Ledger'}</p>
        <h1 className="h-xl"><Lines text={c.title} /></h1>
        {c.subtitle && <p className="lead">{c.subtitle}</p>}
        <div className="ledger grow">
          {rows.map((it, i) => (
            <div className="ledger-row tall" key={i}>
              <span className="ledger-nb">{String(i + 1).padStart(2, '0')}</span>
              <span className="ledger-title">{it.title}</span>
              <span className="ledger-note">{it.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="issue-strip">
        <span>{c.signature || 'Notes'}</span>
        <span>—</span>
        <span>{tag(c, 1) || 'Ledger'}</span>
      </div>
    </>
  );
}

/* ============================= Swiss S01 强调封面 ============================= */
/* 极细大字 + 抽象系统块（两节点）+ 底部元信息条。 */
export function S01({ state, image, board }) {
  const { content: c } = state;
  const Node = ({ idx, cls }) => (
    <div className={`${cls} grow`}>
      <p className="t-meta">0{idx + 1}</p>
      <p className="h-md">{item(c, idx).title}</p>
      <p className="body">{item(c, idx).desc}</p>
    </div>
  );

  if (board === 'square') {
    return (
      <div className="content stack gap-9">
        <div className="chrome-min">
          <span>{tag(c, 0) || 'Vol.01'}</span>
          <span>{c.signature || 'Cover'}</span>
        </div>
        <div className="stack gap-7 center grow" style={{ justifyContent: 'center' }}>
          <p className="t-cat center">{c.kicker || 'Cover'}</p>
          <h1 className="h-statement center"><Lines text={c.title} /></h1>
        </div>
        <div className="card-accent center">
          <p className="h-md">{c.subtitle}</p>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="t-meta">{tag(c, 1) || 'Issue 01'}</p>
          <p className="t-meta">{c.signature}</p>
        </div>
      </div>
    );
  }

  if (board === 'wide') {
    return (
      <div className="content stack gap-8">
        <div className="chrome-min">
          <span>{tag(c, 0) || 'Vol.01 · Swiss'}</span>
          <span>{c.signature || 'Cover'}</span>
        </div>
        <div className="grid-12 grow">
          <div className="span-6 stack gap-7">
            <p className="t-cat">{c.kicker || 'Cover'}</p>
            <h1 className="h-statement"><Lines text={c.title} /></h1>
            {c.subtitle && <p className="lead">{c.subtitle}</p>}
          </div>
          <div className="span-6 stack gap-6">
            {hasItem(c, 0) && <Node idx={0} cls="card-ink" />}
            {hasItem(c, 1) && <Node idx={1} cls="card-accent" />}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="t-meta">{tag(c, 1) || 'Issue 01'}</p>
          <p className="t-meta">{c.signature}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content stack gap-9">
      <div className="chrome-min">
        <span>{tag(c, 0) || 'Vol.01 · Swiss'}</span>
        <span>{c.signature || 'Cover'}</span>
      </div>
      <div className="stack gap-7">
        <p className="t-cat">{c.kicker || 'Cover'}</p>
        <h1 className="h-statement"><Lines text={c.title} /></h1>
      </div>
      <div className="grow"></div>
      {(hasItem(c, 0) || hasItem(c, 1)) && (
        <div className="row gap-6">
          {hasItem(c, 0) && <Node idx={0} cls="card-ink" />}
          {hasItem(c, 1) && <Node idx={1} cls="card-accent" />}
        </div>
      )}
      <hr className="hr-accent" />
      {c.subtitle && <p className="lead">{c.subtitle}</p>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="t-meta">{tag(c, 1) || 'Issue 01'}</p>
        <p className="t-meta">{c.signature}</p>
      </div>
    </div>
  );
}

/* ============================= Swiss S02 双信号 ============================= */
/* 页标题 + 两个大模块（一实 card-ink / 一空 card-outlined）+ 各自注记 + 底部结语。 */
export function S02({ state, image, board }) {
  const { content: c } = state;
  const Module = ({ idx, cls }) => (
    <div className={cls}>
      <p className="t-meta">{idx === 0 ? 'A' : 'B'}</p>
      <p className="h-md">{item(c, idx).title}</p>
      <p className="body">{item(c, idx).desc}</p>
    </div>
  );
  const Bottom = () =>
    hasItem(c, 2) ? (
      <div>
        <hr className="hr-hairline" />
        <div className="row gap-6" style={{ alignItems: 'baseline' }}>
          <p className="t-meta">→</p>
          <p className="body grow">{item(c, 2).title}{item(c, 2).desc ? `：${item(c, 2).desc}` : ''}</p>
        </div>
      </div>
    ) : null;

  if (board === 'wide') {
    return (
      <div className="content stack gap-8">
        <div className="chrome-min">
          <span>{tag(c, 0) || 'Vol.01 · Swiss'}</span>
          <span>{c.signature || 'Signals'}</span>
        </div>
        <div className="grid-12 grow">
          <div className="span-4 stack gap-6">
            <p className="t-cat">{c.kicker || 'Two Signals'}</p>
            <h1 className="h-xl"><Lines text={c.title} /></h1>
            {c.subtitle && <p className="lead">{c.subtitle}</p>}
          </div>
          <div className="span-8 stack gap-6">
            <div className="grid-2-9 grow">
              {hasItem(c, 0) && <Module idx={0} cls="card-ink" />}
              {hasItem(c, 1) && <Module idx={1} cls="card-outlined" />}
            </div>
            <Bottom />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content stack gap-9">
      <div className="chrome-min">
        <span>{tag(c, 0) || 'Vol.01 · Swiss'}</span>
        <span>{c.signature || 'Signals'}</span>
      </div>
      <div className="stack gap-6">
        <p className="t-cat">{c.kicker || 'Two Signals'}</p>
        <h1 className="h-xl"><Lines text={c.title} /></h1>
        {c.subtitle && <p className="lead">{c.subtitle}</p>}
      </div>
      <div className="grow"></div>
      {(hasItem(c, 0) || hasItem(c, 1)) && (
        <div className="grid-2-9">
          {hasItem(c, 0) && <Module idx={0} cls="card-ink" />}
          {hasItem(c, 1) && <Module idx={1} cls="card-outlined" />}
        </div>
      )}
      <Bottom />
    </div>
  );
}

/* ============================= Swiss S05 警示清单 ============================= */
/* 警示大标题 + 三条横行（左 mono 标签 / 右后果），发丝线分隔。 */
export function S05({ state, image, board }) {
  const { content: c } = state;
  const Rows = () => (
    <div>
      {c.items.map((it, i) => (
        <div className="s05-row" key={i}>
          <p className="t-meta">{String(i + 1).padStart(2, '0')} / {it.title}</p>
          <p className="body">{it.desc}</p>
        </div>
      ))}
    </div>
  );

  if (board === 'wide') {
    return (
      <div className="content stack gap-8">
        <div className="chrome-min">
          <span>{tag(c, 0) || 'Vol.01 · Swiss'}</span>
          <span>{c.signature || 'Checklist'}</span>
        </div>
        <div className="grid-12 grow">
          <div className="span-4 stack gap-6">
            <p className="t-cat">{c.kicker || 'Watch Out'}</p>
            <h1 className="h-xl"><Lines text={c.title} /></h1>
            {c.subtitle && <p className="lead">{c.subtitle}</p>}
          </div>
          <div className="span-8">
            <Rows />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content stack gap-9">
      <div className="chrome-min">
        <span>{tag(c, 0) || 'Vol.01 · Swiss'}</span>
        <span>{c.signature || 'Checklist'}</span>
      </div>
      <div className="stack gap-6">
        <p className="t-cat">{c.kicker || 'Watch Out'}</p>
        <h1 className="h-xl"><Lines text={c.title} /></h1>
        {c.subtitle && <p className="lead">{c.subtitle}</p>}
      </div>
      <div className="grow"></div>
      <Rows />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="t-meta">{tag(c, 1) || 'Note'}</p>
        <p className="t-meta">{c.signature}</p>
      </div>
    </div>
  );
}

export const RECIPE_COMPONENTS = { M01, M16, M08, S01, S02, S05 };
