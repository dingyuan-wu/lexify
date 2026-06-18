import { rebuildInline } from './inline';
import { BLOCK_ATTR, type Unit } from './segmenter';
import type { TranslateMode } from '@/lib/types';

// 自定义标签，绝不与页面已有 class 冲突；样式由注入的 CSS 控制。
const TR_TAG = 'lexify-tr';
const ORIG_TAG = 'lexify-orig';

/**
 * 注入译文：
 * - bilingual（双语）：译文作为块级子节点追加到原文之后，原文不动。
 * - translation（仅译文）：把原文子节点移入隐藏的 <lexify-orig>，仅显示译文；可逆。
 * 两种模式下原文节点都被保留，移除译文即可零残留还原。
 */
export function injectTranslation(unit: Unit, translated: string, mode: TranslateMode) {
  if (!translated || !translated.trim()) return; // 翻译失败，保留原文不注入
  const el = unit.el;
  if (el.querySelector(`:scope > ${TR_TAG}`)) return; // 避免重复注入
  el.setAttribute(BLOCK_ATTR, mode);

  const tr = document.createElement(TR_TAG);
  tr.appendChild(rebuildInline(translated, unit.records));

  if (mode === 'translation') {
    const orig = document.createElement(ORIG_TAG);
    while (el.firstChild) orig.appendChild(el.firstChild);
    el.appendChild(orig); // CSS 设为 display:none
  }
  el.appendChild(tr);
}

/** 移除全部译文并还原原文到零残留状态。 */
export function removeAllTranslations(root: ParentNode = document) {
  root.querySelectorAll(TR_TAG).forEach((n) => n.remove());
  // 还原「仅译文」模式下被隐藏的原文：把子节点移回原位再删除包裹层
  root.querySelectorAll(ORIG_TAG).forEach((orig) => {
    const parent = orig.parentNode;
    if (!parent) return;
    while (orig.firstChild) parent.insertBefore(orig.firstChild, orig);
    orig.remove();
  });
  root.querySelectorAll(`[${BLOCK_ATTR}]`).forEach((n) => n.removeAttribute(BLOCK_ATTR));
}

/** 注入一次全局样式。 */
export function ensureStyleInjected() {
  const id = 'lexify-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    ${TR_TAG} {
      display: block;
      width: 100%;
      flex-basis: 100%;
      margin-top: 0.2em;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
      text-align: inherit;
      white-space: normal;
    }
    ${ORIG_TAG} { display: none !important; }
    /* 仅译文模式：译文是唯一可见内容，去掉上间距 */
    [${BLOCK_ATTR}="translation"] > ${TR_TAG} { margin-top: 0; }
  `;
  document.documentElement.appendChild(style);
}
