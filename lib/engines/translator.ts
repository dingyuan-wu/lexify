import type { EngineId } from '../types';

export interface Translator {
  id: EngineId;
  /** 批量翻译；返回顺序与 texts 一一对应。失败的项返回空串（由上层保留原文）。 */
  translate(texts: string[], from: string, to: string): Promise<string[]>;
}

/** 并发受限的批量映射，避免一次性打满免费接口被限流。 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
