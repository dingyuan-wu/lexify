import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Lexify 双语翻译',
    description: '网页双语对照翻译 —— 保留原文样式，译文紧随其后',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Lexify 翻译此页',
    },
    commands: {
      'toggle-translate': {
        suggested_key: { default: 'Alt+T' },
        description: '翻译/还原当前页面',
      },
    },
  },
});
