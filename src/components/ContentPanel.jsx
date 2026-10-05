/* 右栏：内容编辑（刊眉/标题/副题/署名/标签/条目/图片）+ 提示词。 */
import React, { useMemo, useRef, useState } from 'react';
import { Button, Input, TextArea } from '@heroui/react';
import Icon from '../icons/Icon.jsx';
import { LIMITS, getRecipe } from '../poster/model.js';
import { charCount } from '../text.js';
import { buildCopyPrompt, buildImagePrompt } from '../prompts.js';

function Counter({ value, max }) {
  const n = charCount(value);
  return (
    <span className={`cw-counter ${n > max ? 'over' : ''}`}>{n}/{max}</span>
  );
}

function Field({ label, max, value, onChange, placeholder, multiline, rows }) {
  const common = {
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    maxLength: max * (multiline ? 2 : 1) + 8,
    placeholder,
    'aria-label': label,
    fullWidth: true,
  };
  return (
    <div className="cw-field">
      <div className="cw-field-label">
        <b>{label}</b>
        <Counter value={value} max={max} />
      </div>
      {multiline
        ? <TextArea {...common} rows={rows || 2} className="cw-textarea" />
        : <Input {...common} className="cw-input" />}
    </div>
  );
}

export default function ContentPanel({
  state, onField, onItem, onAddItem, onRemoveItem,
  image, onUpload, onRemoveImage, onCopyPrompt,
}) {
  const c = state.content;
  const recipe = getRecipe(state.recipe);
  const fileRef = useRef(null);
  const [promptTab, setPromptTab] = useState('copy');
  const prompt = useMemo(
    () => (promptTab === 'copy' ? buildCopyPrompt(state) : buildImagePrompt(state)),
    [state, promptTab],
  );

  const itemHint = recipe.id === 'S02' ? '前两条为 A/B 模块，第三条为底部结语'
    : recipe.id === 'S01' ? '前两条为封面系统块'
    : recipe.id === 'M08' ? '账目行（建议 3–5 条）'
    : recipe.id === 'S05' ? '警示行（建议 3–5 条）'
    : recipe.id === 'M01' ? '条目标题进入底部刊条'
    : '条目不显示在影像封面';

  return (
    <aside className="cw-panel cw-panel-right" aria-label="内容编辑">
      <div className="cw-block">
        <h3 className="cw-block-title">内容 Content</h3>
        <Field label="刊眉 Kicker" max={LIMITS.kicker} value={c.kicker} onChange={(v) => onField('kicker', v)} placeholder="例：城市选择 · City" />
        <Field label="主标题（可换行）" max={LIMITS.title} value={c.title} onChange={(v) => onField('title', v)} placeholder="例：毕业后，去哪座城？" multiline rows={2} />
        <Field label="副标题" max={LIMITS.subtitle} value={c.subtitle} onChange={(v) => onField('subtitle', v)} placeholder="一句话说清真实价值" />
        <Field label="署名" max={LIMITS.signature} value={c.signature} onChange={(v) => onField('signature', v)} placeholder="例：Weko · 设计与 AI" />
        <div className="cw-field">
          <div className="cw-field-label"><b>标签（用于刊眉/刊条）</b></div>
          <div className="cw-tags-row">
            {[0, 1, 2].map((i) => (
              <Input
                key={i}
                value={c.tags[i] || ''}
                onChange={(e) => {
                  const tags = [...c.tags];
                  tags[i] = e.target.value;
                  onField('tags', tags.map((t) => t || '').filter((t, idx) => t || idx === i));
                }}
                maxLength={LIMITS.tag}
                placeholder={`标签${'一二三'[i]}`}
                className="cw-input"
                aria-label={`标签${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="cw-block">
        <h3 className="cw-block-title">条目 Items <span className="cw-block-hint">{itemHint}</span></h3>
        {c.items.map((it, i) => (
          <div className="cw-item-edit" key={i}>
            <div className="cw-item-head">
              <span className="cw-item-no">ITEM {String(i + 1).padStart(2, '0')}</span>
              <span className="cw-item-remove">
                <Button
                  variant="ghost" size="sm" isIconOnly
                  aria-label={`删除条目 ${i + 1}`}
                  isDisabled={c.items.length <= 1}
                  onPress={() => onRemoveItem(i)}
                >
                  <Icon name="trash" size={14} />
                </Button>
              </span>
            </div>
            <div className="cw-item-grid">
              <div>
                <div className="cw-field-label"><b>标题</b><Counter value={it.title} max={LIMITS.itemTitle} /></div>
                <Input
                  value={it.title}
                  onChange={(e) => onItem(i, 'title', e.target.value)}
                  maxLength={LIMITS.itemTitle}
                  className="cw-input"
                  aria-label={`条目 ${i + 1} 标题`}
                />
              </div>
              <div>
                <div className="cw-field-label"><b>说明</b><Counter value={it.desc} max={LIMITS.itemDesc} /></div>
                <Input
                  value={it.desc}
                  onChange={(e) => onItem(i, 'desc', e.target.value)}
                  maxLength={LIMITS.itemDesc}
                  className="cw-input"
                  aria-label={`条目 ${i + 1} 说明`}
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="outline" size="sm"
          isDisabled={c.items.length >= LIMITS.itemCount}
          onPress={onAddItem}
        >
          <Icon name="plus" size={14} /> 加一条（{c.items.length}/{LIMITS.itemCount}）
        </Button>
      </div>

      <div className="cw-block">
        <h3 className="cw-block-title">图片 Image <span className="cw-block-hint">M01 / M16 使用</span></h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onPress={() => fileRef.current && fileRef.current.click()}>
            <Icon name="upload" size={14} /> {image && image.source === 'upload' ? '更换图片' : '选择图片'}
          </Button>
          {image && image.source === 'upload' && (
            <Button variant="ghost" size="sm" onPress={onRemoveImage}>
              <Icon name="x" size={14} /> 移除图片
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => { onUpload(e.target.files && e.target.files[0]); e.target.value = ''; }}
          />
        </div>
        <p className="cw-img-status">
          支持 PNG / JPG / WebP，不超过 5MB（魔数校验）。当前：
          {image && image.source === 'upload' ? '已使用上传图片（存于本机 IndexedDB，刷新可恢复）' : '内置插画'}
          {recipe.usesImage === 'required' && '；此配方以影像为主图。'}
        </p>
      </div>

      <div className="cw-block">
        <h3 className="cw-block-title">提示词 Prompt <span className="cw-block-hint">本地生成，可复制</span></h3>
        <div className="cw-seg" role="group" aria-label="提示词类型" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" className="cw-seg-item" aria-pressed={promptTab === 'copy'} onClick={() => setPromptTab('copy')}>文案提示词</button>
          <button type="button" className="cw-seg-item" aria-pressed={promptTab === 'image'} onClick={() => setPromptTab('image')}>生图提示词</button>
        </div>
        <textarea className="cw-prompt-out" readOnly value={prompt} aria-label="提示词内容" />
        <div className="cw-prompt-actions">
          <Button variant="primary" size="sm" onPress={() => onCopyPrompt(prompt)}>
            <Icon name="copy" size={14} /> 复制提示词
          </Button>
          <span className="cw-prompt-tip">含真实 system / theme / recipe 参数，调用 Skill 时可复现方向。</span>
        </div>
      </div>
    </aside>
  );
}
