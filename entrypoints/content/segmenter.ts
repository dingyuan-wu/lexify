import { extractInline, hasTranslatableText, type InlineRecord } from './inline';

// 把页面切分成「翻译单元」：块级、含有意义文本、且不再包含更小的块级单元。

const BLOCK_SELECTOR = [
  'p',
  'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote',
  'dd', 'dt',
  'td', 'th',
  'caption', 'figcaption',
  'summary',
].join(',');

// 独立的行内单元：标签/按钮/链接等，本身就是一段独立文本（不在句子块里）。
const INLINE_UNIT_SELECTOR = 'a, button, span, label, [role="button"], [role="tab"]';

// 这些容器内部一律不翻译
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP',
  'SVG', 'CANVAS', 'TEXTAREA', 'IMG', 'VIDEO', 'AUDIO', 'IFRAME',
  'SELECT', 'OPTION', 'MAP',
]);

export const BLOCK_ATTR = 'data-lexify-block';

export interface Unit {
  el: HTMLElement;
  source: string; // 带行内标签/占位的可译字符串
  records: InlineRecord[];
}

export function collectUnits(root: ParentNode = document.body): Unit[] {
  const seen = new Set<HTMLElement>();
  const units: Unit[] = [];

  const tryAdd = (el: HTMLElement) => {
    if (seen.has(el) || el.hasAttribute(BLOCK_ATTR)) return;
    if (isSkipped(el) || !isVisible(el)) return;
    const { source, records } = extractInline(el);
    if (!hasTranslatableText(source)) return; // 纯代码/纯符号/空白，跳过
    seen.add(el);
    units.push({ el, source, records });
  };

  // 1) 块级文本单元：取「叶子块」（内部不再含更小的块）
  for (const el of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if (el.querySelector(BLOCK_SELECTOR)) continue;
    tryAdd(el);
  }

  // 2) 独立行内单元：标签/按钮/链接，且不在任何块级文本容器内
  //    （句子里的 a/span 已作为行内标签随句子翻译，这里要排除掉）
  for (const el of root.querySelectorAll<HTMLElement>(INLINE_UNIT_SELECTOR)) {
    if (el.closest(BLOCK_SELECTOR)) continue; // 被句子块覆盖
    if (el.querySelector(BLOCK_SELECTOR)) continue; // 是容器，交给块处理
    // 取最外层行内单元，避免 <a><span>X</span></a> 重复
    const parent = el.parentElement;
    if (parent && parent.closest(INLINE_UNIT_SELECTOR) && !parent.closest(BLOCK_SELECTOR)) continue;
    tryAdd(el);
  }

  return units;
}

function isSkipped(el: HTMLElement): boolean {
  if (el.closest('[contenteditable=""],[contenteditable="true"]')) return true;
  let node: HTMLElement | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    node = node.parentElement;
  }
  return false;
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  // offsetParent 为 null 多为隐藏（fixed 元素除外，这里从简）
  return el.getClientRects().length > 0;
}
