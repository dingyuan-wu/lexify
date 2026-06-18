import { mapWithConcurrency, type Translator } from './translator';

/**
 * Google 免费网页接口（translate_a/single, client=gtx）。
 * 无需 API key，单段翻译稳定；批量用并发池逐段请求。
 */
export const googleTranslator: Translator = {
  id: 'google',
  async translate(texts, from, to) {
    return mapWithConcurrency(texts, 8, (text) => translateOne(text, from, to));
  },
};

async function translateOne(text: string, from: string, to: string): Promise<string> {
  if (!text.trim()) return '';
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`google http ${res.status}`);
    const data = (await res.json()) as GoogleResponse;
    // data[0] 是句子分段数组，每段 [译文, 原文, ...]
    const sentences = data?.[0];
    if (!Array.isArray(sentences)) return '';
    return sentences.map((s) => s?.[0] ?? '').join('');
  } catch (e) {
    console.warn('[lexify] google translate failed:', e);
    return ''; // 失败回退：保留原文
  }
}

type GoogleResponse = [Array<[string, string, ...unknown[]]>, ...unknown[]];
