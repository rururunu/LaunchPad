# LaunchPad ✨

打开新标签页，也可以很有意思。

当前版本：**0.0.3**

<img width="700" alt="preview" src="https://github.com/user-attachments/assets/164532ca-d247-4b70-8362-a48a6caba961" />

<img width="700" alt="preview" src="https://github.com/user-attachments/assets/41d43a18-f0ec-494e-8417-b7a478b210d7" />

---

## 🔍 随手搜，不打断

任何页面按下 `Alt + S`，搜索框就弹出来了——不用切标签，不用动鼠标。新标签页主搜索框与 `Alt + S` 浮层**共用同一套命令**。

<img width="700" alt="search box" src="https://github.com/user-attachments/assets/6b8563c6-2a18-4839-91eb-404679dad201" />

<img width="700" alt="search suggestion" src="https://github.com/user-attachments/assets/8f316856-0730-4858-9e36-87a10aa3018e" />

---

## 🎮 玩法

### 快捷键

| 操作 | 效果 |
|------|------|
| `Alt + S` | 任意网页唤起全局搜索浮层 |
| `↑` `↓` | 在下拉列表中移动 |
| `Enter` | 确认选中项 / 执行命令 |
| `→` | 用搜索建议填充输入框（不提交） |
| `Esc` | 先关闭下拉，再关闭浮层 |

### 搜索与前缀命令

| 输入 | 效果 |
|------|------|
| `bd 关键词` | 用百度搜（`gg`、`bi` 等同理） |
| `cd` | 展开引擎列表，`↑↓` 选择后 `Enter` 切换默认引擎 |
| `cd gg` | 过滤引擎列表（输入 `cd` 后接缩写） |
| `* 关键词` | 在收藏夹里搜书签 |
| `! 关键词` | 强制用默认引擎搜，避免首词被当成引擎缩写 |
| `/new` | 打开新标签页，`Enter` 确认 |
| `/t1` | 切换到当前窗口第 1 个标签页（`/t2`、`/t3` …） |
| `/t` | 列出当前窗口全部标签页 |
| `/t 关键词` | 列出标题或 URL 包含关键词的标签页，`↑↓` 选择后 `Enter` 切换 |

直接输入内容（无前缀）时，使用当前默认搜索引擎。

- **壁纸随心换** — 塞一张自己喜欢的图，每次打开都是好心情
- **搜索引擎一键切** — 输 `cd` 加引擎缩写，想用哪个用哪个
- **书签不再难找** — `*` 开头，直接搜收藏栏
- **标签页快切** — `/t` 系列命令，不用鼠标点标签栏
- **输入有提示** — 搜什么，边打边猜
- **AI 对话填词** — 对 ChatGPT、Kimi、DeepSeek 等站点，扩展用 `_lp_q` 传词并在页面内自动填词发送

---

## 🤖 AI 填词说明

部分 AI 站点不支持 `?q=` 深链，甚至可能被错误参数卡死（例如 Kimi）。LaunchPad 对**已开启「填词」**的引擎使用扩展专用参数：

```
https://www.kimi.com/?_lp_q=你的问题
```

`ai-prompt-inject.js` 会读取 `_lp_q`（并兼容旧的 `q` / `p` / `prompt`），在目标页主世界填词后清除地址栏参数。

---

## 🛠 开发

### 环境要求

- Node.js 18+
- pnpm 8+

### 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 新标签页本地开发（Vite）
pnpm build            # 构建 dist/（加载扩展前需执行）
pnpm typecheck        # TypeScript 检查
pnpm test             # Vitest 单元测试
pnpm check            # lint + test + build
```

### 加载扩展

1. `pnpm build`
2. 打开 `chrome://extensions`
3. 开启「开发者模式」→「加载已解压的扩展程序」→ 选择 `dist` 目录
4. 修改 `public/` 下 content script / background 后需重新 build 并**重新加载扩展**
5. 新增 `tabs` 等权限后，Chrome 可能提示重新授权，点「重新加载」即可

### 目录速览

| 路径 | 说明 |
|------|------|
| `src/` | 新标签页 Vue 应用 |
| `public/manifest.json` | 扩展清单（版本号与 `package.json` 对齐） |
| `public/content-script.js` | Alt+S 全局搜索浮层 |
| `public/background.js` | Service Worker、标签页 API、主世界填词 |
| `public/ai-prompt-inject.js` | AI 对话页填词 |
| `src/utils/searchEngines.ts` | 搜索引擎预设与 URL 构建 |
| `src/utils/searchCommands.ts` | `!` 默认引擎前缀、`/` 标签页命令解析 |
| `src/utils/jumpDataMigration.ts` | jumpData 老数据迁移 |

---

## 📦 版本与迁移

### 0.0.3

- AI 填词 URL 占位符由 `?q=` / `?p=` 迁移为 `?_lp_q=`（仅 `injectPrompt: true` 的引擎）
- 加载 `jumpData` 时自动迁移并写回 storage（新标签页、设置页、Alt+S 内容脚本）
- 补充 Claude / 豆包 / 通义等 `host_permissions`
- 新增 `!` 前缀：强制使用默认引擎搜索
- 新增 `/` 标签页命令：`/new`、`/tN`、`/t 关键词`（新标签页与 Alt+S 均可用）
- 新增 `tabs` 权限，用于查询与切换标签页
- 引入 Vitest，覆盖迁移、命令解析与 URL 构建逻辑

旧配置无需手动修改；若曾自定义 Kimi 等 AI 引擎地址，打开设置或新标签页一次即可完成迁移。

---

## 📄 License

MIT
