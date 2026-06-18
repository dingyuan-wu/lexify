import { getSettings } from '@/lib/storage';
import type { ContentMessage, ContentState, TranslateRequest, TranslateResponse } from '@/lib/types';
import { collectUnits } from './segmenter';
import { ensureStyleInjected, injectTranslation, removeAllTranslations } from './injector';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let translated = false;
    let running = false;

    browser.runtime.onMessage.addListener((msg: ContentMessage, _s, sendResponse) => {
      switch (msg?.type) {
        case 'TRANSLATE_PAGE':
          translatePage();
          break;
        case 'RESTORE_PAGE':
          restorePage();
          break;
        case 'TOGGLE_PAGE':
          translated ? restorePage() : translatePage();
          break;
        case 'GET_STATE':
          sendResponse({ translated } as ContentState);
          return;
      }
    });

    async function translatePage() {
      if (running || translated) return;
      running = true;
      try {
        const settings = await getSettings();
        ensureStyleInjected();

        const units = collectUnits();
        if (units.length === 0) return;

        // 分批送往 background 代理翻译（避免单条消息过大）
        const BATCH = 40;
        for (let i = 0; i < units.length; i += BATCH) {
          const slice = units.slice(i, i + BATCH);
          const req: TranslateRequest = {
            type: 'TRANSLATE',
            texts: slice.map((u) => u.source),
            from: 'auto',
            to: settings.targetLang,
            engine: settings.engine,
          };
          const res = (await browser.runtime.sendMessage(req)) as TranslateResponse;
          if (res?.error) console.warn('[lexify]', res.error);
          (res?.translations ?? []).forEach((t, j) => injectTranslation(slice[j], t, settings.mode));
        }
        translated = true;
      } finally {
        running = false;
      }
    }

    function restorePage() {
      removeAllTranslations();
      translated = false;
    }
  },
});
