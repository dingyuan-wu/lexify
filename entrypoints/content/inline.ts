// 行内结构保留：把块内容序列化为「带占位的可译字符串」，翻译后再重建 DOM。
//
//  - 代码类元素（code/kbd/...）-> 占位 token `%%i%%`，其文本【不送翻译】，
//    重建时整体克隆原节点（代码原样、方框样式保留）。
//  - 其它行内元素（strong/em/a/span/...）-> 包裹标签 `<n{i}>…</n{i}>`，
//    内部文本送翻译；Google 免费接口会把标签搬到对应译词周围。
//    重建时浅克隆原元素（保留 class/href/style）包住译文。

export interface InlineRecord {
  kind: 'wrap' | 'verbatim';
  el: HTMLElement;
}

// 内容应原样保留、绝不翻译的行内元素
const VERBATIM = new Set(['CODE', 'KBD', 'SAMP', 'VAR', 'TT', 'PRE']);

// 用私有区字符转义正文里的 & < > %，避免与我们的标签/占位语法冲突
const E_AMP = String.fromCharCode(0xe000);
const E_LT = String.fromCharCode(0xe001);
const E_GT = String.fromCharCode(0xe002);
const E_PCT = String.fromCharCode(0xe003);
const E_ALL = new RegExp(`[${E_AMP}${E_LT}${E_GT}${E_PCT}]`, 'g');
const UNESC: Record<string, string> = { [E_AMP]: '&', [E_LT]: '<', [E_GT]: '>', [E_PCT]: '%' };

function escapeText(s: string): string {
  return s
    .replace(/&/g, E_AMP)
    .replace(/</g, E_LT)
    .replace(/>/g, E_GT)
    .replace(/%/g, E_PCT);
}
function unescapeText(s: string): string {
  return s.replace(E_ALL, (c) => UNESC[c]);
}

export interface Extracted {
  source: string;
  records: InlineRecord[];
}

export function extractInline(root: HTMLElement): Extracted {
  const records: InlineRecord[] = [];
  let out = '';

  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += escapeText(child.nodeValue ?? '');
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const el = child as HTMLElement;
      if (VERBATIM.has(el.tagName)) {
        const i = records.push({ kind: 'verbatim', el }) - 1;
        out += `%%${i}%%`;
      } else {
        const i = records.push({ kind: 'wrap', el }) - 1;
        out += `<n${i}>`;
        walk(el);
        out += `</n${i}>`;
      }
    });
  };

  walk(root);
  return { source: out.replace(/\s+/g, ' ').trim(), records };
}

/** 去掉标签/占位后是否仍有可译文字（纯代码块则无需翻译）。 */
export function hasTranslatableText(source: string): boolean {
  const plain = source.replace(/<\/?n\d+>/g, '').replace(/%%\d+%%/g, '');
  return /\p{L}/u.test(plain);
}

/** 把译文字符串（含 `<n{i}>` 标签与 `%%i%%` 占位）重建为 DOM 片段。 */
export function rebuildInline(translated: string, records: InlineRecord[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  let parent: Node = frag;
  const stack: Node[] = [];

  const pushText = (raw: string) => {
    if (raw) parent.appendChild(document.createTextNode(unescapeText(raw)));
  };

  const re = /<n(\d+)>|<\/n(\d+)>|%%(\d+)%%/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(translated))) {
    pushText(translated.slice(last, m.index));
    last = re.lastIndex;

    if (m[1] !== undefined) {
      // 进入行内元素 -> 浅克隆原元素（保留标签/属性/样式，不带子节点）
      const rec = records[Number(m[1])];
      const clone = rec ? shallowClone(rec.el) : document.createElement('span');
      parent.appendChild(clone);
      stack.push(parent);
      parent = clone;
    } else if (m[2] !== undefined) {
      // 退出行内元素
      if (stack.length) parent = stack.pop()!;
    } else if (m[3] !== undefined) {
      // 代码类占位 -> 深克隆原节点（文本原样、不翻译）
      const rec = records[Number(m[3])];
      if (rec) parent.appendChild(stripIds(rec.el.cloneNode(true) as HTMLElement));
    }
  }
  pushText(translated.slice(last));
  return frag;
}

function shallowClone(el: HTMLElement): HTMLElement {
  const c = document.createElement(el.tagName);
  // 复制属性以保留 class/href/style 等样式与行为；但去掉 id 避免重复 id
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'id') continue;
    c.setAttribute(attr.name, attr.value);
  }
  return c;
}

function stripIds(el: HTMLElement): HTMLElement {
  el.removeAttribute('id');
  el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  return el;
}
