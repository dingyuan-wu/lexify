<script lang="ts">
  import { getSettings, setSettings } from '@/lib/storage';
  import type { ContentMessage, ContentState, EngineId, TranslateMode } from '@/lib/types';

  const LANGS = [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
  ];

  // MVP 仅 google 可用，其余占位
  const ENGINES: { id: EngineId; name: string; ready: boolean }[] = [
    { id: 'google', name: 'Google', ready: true },
    { id: 'microsoft', name: 'Microsoft', ready: false },
    { id: 'baidu', name: '百度', ready: false },
    { id: 'llm', name: 'LLM', ready: false },
  ];

  let engine = $state<EngineId>('google');
  let targetLang = $state('zh-CN');
  let mode = $state<TranslateMode>('bilingual');
  let translated = $state(false);
  let loading = $state(true);

  $effect(() => {
    init();
  });

  async function init() {
    const s = await getSettings();
    engine = s.engine;
    targetLang = s.targetLang;
    mode = s.mode;
    const tab = await activeTab();
    if (tab?.id != null) {
      try {
        const state = (await browser.tabs.sendMessage(tab.id, { type: 'GET_STATE' } as ContentMessage)) as ContentState;
        translated = !!state?.translated;
      } catch {
        /* 当前页未注入内容脚本 */
      }
    }
    loading = false;
  }

  async function activeTab() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function send(type: ContentMessage['type']) {
    const tab = await activeTab();
    if (tab?.id != null) {
      try {
        await browser.tabs.sendMessage(tab.id, { type } as ContentMessage);
      } catch {
        /* 忽略不可注入页面 */
      }
    }
  }

  async function onToggle() {
    if (translated) {
      await send('RESTORE_PAGE');
      translated = false;
    } else {
      await send('TRANSLATE_PAGE');
      translated = true;
    }
  }

  async function onEngine(e: Event) {
    engine = (e.target as HTMLSelectElement).value as EngineId;
    await setSettings({ engine });
  }

  async function onLang(e: Event) {
    targetLang = (e.target as HTMLSelectElement).value;
    await setSettings({ targetLang });
  }

  async function setMode(next: TranslateMode) {
    if (mode === next) return;
    mode = next;
    await setSettings({ mode });
    // 若当前页已翻译，立即按新模式重渲染
    if (translated) {
      await send('RESTORE_PAGE');
      await send('TRANSLATE_PAGE');
    }
  }
</script>

<main>
  <h1>Lexify 双语翻译</h1>

  <div class="field">
    <span class="field-label">翻译模式</span>
    <div class="segmented" role="group">
      <button
        class:active={mode === 'bilingual'}
        onclick={() => setMode('bilingual')}
        disabled={loading}>双语对照</button>
      <button
        class:active={mode === 'translation'}
        onclick={() => setMode('translation')}
        disabled={loading}>仅译文</button>
    </div>
  </div>

  <label>
    目标语言
    <select value={targetLang} onchange={onLang} disabled={loading}>
      {#each LANGS as l}
        <option value={l.code}>{l.name}</option>
      {/each}
    </select>
  </label>

  <label>
    翻译引擎
    <select value={engine} onchange={onEngine} disabled={loading}>
      {#each ENGINES as e}
        <option value={e.id} disabled={!e.ready}>{e.name}{e.ready ? '' : '（即将支持）'}</option>
      {/each}
    </select>
  </label>

  <button class="primary" onclick={onToggle} disabled={loading}>
    {translated ? '还原原文' : '翻译此页'}
  </button>

  <p class="hint">快捷键 Alt+T 切换 · 点击工具栏图标亦可</p>
</main>

<style>
  main {
    width: 260px;
    padding: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    color: #1a1a1a;
  }
  h1 {
    font-size: 15px;
    margin: 0 0 14px;
  }
  label,
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #555;
    margin-bottom: 12px;
  }
  .field-label {
    font-size: 12px;
    color: #555;
  }
  .segmented {
    display: flex;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    overflow: hidden;
  }
  .segmented button {
    flex: 1;
    padding: 7px 0;
    font-size: 13px;
    background: #fff;
    border: none;
    cursor: pointer;
    color: #444;
  }
  .segmented button + button {
    border-left: 1px solid #d0d0d0;
  }
  .segmented button.active {
    background: #e8552a;
    color: #fff;
    font-weight: 600;
  }
  .segmented button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  select {
    padding: 6px 8px;
    font-size: 13px;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    background: #fff;
  }
  button.primary {
    width: 100%;
    padding: 9px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    background: #e8552a;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  button.primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .hint {
    margin: 12px 0 0;
    font-size: 11px;
    color: #999;
    text-align: center;
  }
</style>
