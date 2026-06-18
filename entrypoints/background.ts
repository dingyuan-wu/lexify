import { getEngine } from '@/lib/engines';
import type { ContentMessage, TranslateRequest, TranslateResponse } from '@/lib/types';

export default defineBackground(() => {
  // content script 的翻译请求经此代理，绕过页面 CORS 限制
  browser.runtime.onMessage.addListener((msg: TranslateRequest, _sender, sendResponse) => {
    if (msg?.type !== 'TRANSLATE') return;
    handleTranslate(msg)
      .then(sendResponse)
      .catch((e) => sendResponse({ translations: [], error: String(e) } as TranslateResponse));
    return true; // 异步响应
  });

  // 点击工具栏图标 -> 切换当前页翻译
  browser.action.onClicked.addListener((tab) => {
    if (tab.id != null) sendToggle(tab.id);
  });

  // 快捷键 -> 切换当前页翻译
  browser.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-translate') return;
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id != null) sendToggle(tab.id);
    });
  });
});

async function handleTranslate(msg: TranslateRequest): Promise<TranslateResponse> {
  const engine = getEngine(msg.engine);
  const translations = await engine.translate(msg.texts, msg.from, msg.to);
  return { translations };
}

function sendToggle(tabId: number) {
  const m: ContentMessage = { type: 'TOGGLE_PAGE' };
  browser.tabs.sendMessage(tabId, m).catch(() => {
    /* content script 可能未注入（如 chrome:// 页面），忽略 */
  });
}
