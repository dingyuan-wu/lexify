// 翻译引擎标识
export type EngineId = 'google' | 'microsoft' | 'baidu' | 'llm';

// 翻译展示模式：双语对照 / 仅译文（直接替换原文）
export type TranslateMode = 'bilingual' | 'translation';

// 用户配置（存于 chrome.storage.sync）
export interface Settings {
  engine: EngineId;
  targetLang: string; // 目标语言，如 'zh-CN'
  mode: TranslateMode;
}

export const DEFAULT_SETTINGS: Settings = {
  engine: 'google',
  targetLang: 'zh-CN',
  mode: 'bilingual',
};

// ---- 消息协议 ----

// popup/background -> content script
export type ContentMessage =
  | { type: 'TRANSLATE_PAGE' }
  | { type: 'RESTORE_PAGE' }
  | { type: 'TOGGLE_PAGE' }
  | { type: 'GET_STATE' };

export interface ContentState {
  translated: boolean;
}

// content script -> background（请求翻译）
export interface TranslateRequest {
  type: 'TRANSLATE';
  texts: string[];
  from: string; // 'auto'
  to: string;
  engine: EngineId;
}

export interface TranslateResponse {
  translations: string[];
  error?: string;
}
