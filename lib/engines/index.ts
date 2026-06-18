import type { EngineId } from '../types';
import { googleTranslator } from './google';
import type { Translator } from './translator';

const registry: Partial<Record<EngineId, Translator>> = {
  google: googleTranslator,
  // microsoft / baidu / llm 后续接入
};

export function getEngine(id: EngineId): Translator {
  return registry[id] ?? googleTranslator;
}
