# Lexify · 网页双语对照翻译扩展

保留原文与样式，把译文紧随其后注入，形成双语对照阅读。当前 MVP 支持 **Google 免费接口**全页翻译；Microsoft / 百度 / LLM 引擎规划中。

## 功能（MVP）

- 一键把当前网页翻译成目标语言，**双语对照**展示
- 译文以独立自定义标签注入，**不修改原页面样式**；再点一下即可零残留还原
- 智能段落识别：按块级元素切分，跳过 `code/pre/script` 等不可译区域
- 翻译请求经 background 代理，绕过页面 CORS 限制
- 工具栏图标 / 快捷键 `Alt+T` / popup 三种触发方式

## 开发

```bash
pnpm install
pnpm dev          # 启动开发模式（Chrome，自动热更新）
pnpm dev:firefox  # Firefox
pnpm build        # 生产构建 -> .output/chrome-mv3
pnpm compile      # 类型检查
```

### 在浏览器中加载（生产构建）

1. `pnpm build`
2. 打开 `chrome://extensions`，开启「开发者模式」
3. 「加载已解压的扩展程序」选择 `.output/chrome-mv3`

## 架构

```
content script  解析 DOM / 切分翻译单元 / 注入译文 / 还原
     │ message
background SW    翻译引擎调度 + 请求代理（绕过 CORS）
     │
popup (Svelte)  开关 / 目标语言 / 引擎切换
storage         chrome.storage.sync 保存配置
```

| 路径 | 职责 |
|---|---|
| `entrypoints/content/segmenter.ts` | DOM 段落识别，输出「翻译单元」 |
| `entrypoints/content/injector.ts` | 双语注入 / 样式 / 还原 |
| `entrypoints/content/index.ts` | 内容脚本编排 + 消息处理 |
| `entrypoints/background.ts` | 翻译代理、图标/快捷键 |
| `lib/engines/` | 翻译引擎抽象 + Google 实现 |
| `lib/storage.ts` `lib/types.ts` | 配置存储与共享类型 |
| `entrypoints/popup/` | Svelte 弹窗 UI |

## 路线图

- [x] MVP：扩展骨架 + 段落识别 + 双语注入 + Google 全页翻译
- [x] 行内结构保留：代码不翻译、加粗/链接/高亮样式随译文保留（占位符+标签重建）
- [ ] 视口懒翻译（IntersectionObserver）+ 译文缓存
- [ ] Microsoft / 百度引擎
- [ ] LLM 引擎（OpenAI 兼容协议，用户自填 url/key/model）+ options 配置页
- [ ] 网站黑白名单、双语样式自定义、Firefox 兼容
