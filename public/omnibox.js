/**
 * Chrome 地址栏 Omnibox 集成（manifest keyword: lp）
 * 用法：地址栏输入 lp + 空格 + 命令，例如 lp /t deep
 */
(function initLaunchPadOmnibox(global) {
  if (!global.chrome?.omnibox || !global.LPCommands) return;

  const {
    parseSlashCommand,
    parseInputQuery,
    segmentationContent,
    hasDefaultEngineFilterPrefix,
    stripDefaultEngineFilterPrefix,
    buildJumpToData,
    resolveSearchUrl,
  } = global.LPCommands;

  const storage = global.__lpStorage;
  const tabsApi = global.__lpTabsApi;
  if (!storage || !tabsApi) return;

  const DEFAULT_JUMP_DATA = [
    { key: ['bd', 'baidu'], label: '百度', jumpUrl: 'https://www.baidu.com/s?ie=utf-8&wd=&<query>' },
    { key: ['gg', 'google'], label: 'Google', jumpUrl: 'https://www.google.com/search?q=&<query>' },
    { key: ['ddg', 'duck'], label: 'DuckDuckGo', jumpUrl: 'https://duckduckgo.com/?q=&<query>' },
    { key: ['bi', 'bing'], label: 'Bing 必应', jumpUrl: 'https://www.bing.com/search?q=&<query>&mkt=zh-CN' },
  ];

  const TAB_PREFIX = 'tab:';
  const URL_PREFIX = 'url:';
  const CD_PREFIX = 'cd:';

  let omniboxEnabled = true;

  function parseJumpData(raw) {
    if (!raw) return [...DEFAULT_JUMP_DATA];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_JUMP_DATA];
    } catch {
      return [...DEFAULT_JUMP_DATA];
    }
  }

  async function loadContext() {
    const [defaultKey, jumpDataRaw] = await Promise.all([
      storage.get('defaultKey'),
      storage.get('jumpData'),
    ]);
    const jumpData = parseJumpData(jumpDataRaw);
    const key = defaultKey || jumpData[0]?.key?.[0] || 'bd';
    const jumpToData = buildJumpToData(jumpData);
    return { defaultKey: key, jumpData, jumpToData };
  }

  function clip(text, max = 90) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  async function buildSuggestions(text) {
    const trimmed = (text || '').trim();
    const out = [];

    if (!trimmed) {
      return [
        { content: '/new', description: '打开新标签页' },
        { content: '/t ', description: '搜索已打开的标签页' },
        { content: '* ', description: '搜索收藏夹' },
        { content: 'cd ', description: '切换默认搜索引擎' },
        { content: '! ', description: '强制使用默认引擎搜索' },
        { content: 'bd ', description: '百度搜索' },
      ];
    }

    const slash = parseSlashCommand(trimmed);
    if (slash?.type === 'new') {
      return [{ content: '/new', description: '打开新标签页 · Enter 确认' }];
    }
    if (slash?.type === 'tab-index') {
      return [{ content: trimmed, description: `切换到第 ${slash.index} 个标签页` }];
    }
    if (slash?.type === 'tab-search') {
      const tabs = await tabsApi.queryWindowTabs(slash.query);
      tabs.slice(0, 8).forEach((tab) => {
        out.push({
          content: `${TAB_PREFIX}${tab.id}`,
          description: `t${tab.index} · ${clip(tab.title)}`,
        });
      });
      if (!out.length) out.push({ content: trimmed, description: '未找到匹配的标签页' });
      return out;
    }

    if (trimmed.startsWith('*')) {
      const q = trimmed.slice(1).trim();
      if (!q) return [{ content: '* ', description: '输入收藏夹关键词' }];
      const bookmarks = await chrome.bookmarks.search(q);
      bookmarks
        .filter((b) => b.url)
        .slice(0, 8)
        .forEach((bm) => {
          out.push({
            content: `${URL_PREFIX}${bm.url}`,
            description: `收藏 · ${clip(bm.title)}`,
          });
        });
      if (!out.length) out.push({ content: trimmed, description: '未找到收藏夹' });
      return out;
    }

    if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
      const ctx = await loadContext();
      const filter = (trimmed.split(/\s+/)[1] || '').toLowerCase();
      const list = ctx.jumpData.filter((e) => {
        if (!filter) return true;
        return (
          e.key.some((k) => k.toLowerCase().includes(filter)) ||
          String(e.label || '').toLowerCase().includes(filter)
        );
      });
      list.slice(0, 8).forEach((engine) => {
        const primary = engine.key[0];
        out.push({
          content: `${CD_PREFIX}${primary}`,
          description: `切换默认引擎 · ${engine.label} (${engine.key.join('/')})`,
        });
      });
      if (!out.length) out.push({ content: 'cd ', description: '无匹配引擎' });
      return out;
    }

    const ctx = await loadContext();
    const { engineKey, query } = parseInputQuery(trimmed, ctx.jumpToData, ctx.defaultKey);
    const engine = ctx.jumpToData.get(engineKey);
    const label = engine?.label || engineKey;

    if (query) {
      const url = resolveSearchUrl(engineKey, query, ctx.jumpToData, ctx.defaultKey);
      out.push({
        content: url ? `${URL_PREFIX}${url}` : trimmed,
        description: `${label} 搜索 · ${clip(query)}`,
      });
    } else {
      out.push({ content: `${engineKey} `, description: `${label} · 继续输入关键词` });
      ctx.jumpData.slice(0, 5).forEach((eng) => {
        if (eng.key[0] === engineKey) return;
        out.push({
          content: `${eng.key[0]} `,
          description: `切换到 ${eng.label}`,
        });
      });
    }

    return out.slice(0, 12);
  }

  async function openUrl(url, disposition) {
    if (!url) return;
    if (disposition === 'newForegroundTab' || disposition === 'newBackgroundTab') {
      await chrome.tabs.create({
        url,
        active: disposition === 'newForegroundTab',
      });
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.update(tab.id, { url });
    else await chrome.tabs.create({ url });
  }

  async function executeInput(text, disposition) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    if (trimmed.startsWith(TAB_PREFIX)) {
      const tabId = parseInt(trimmed.slice(TAB_PREFIX.length), 10);
      if (tabId) await tabsApi.activateTabById(tabId);
      return;
    }

    if (trimmed.startsWith(URL_PREFIX)) {
      await openUrl(trimmed.slice(URL_PREFIX.length), disposition);
      return;
    }

    if (trimmed.startsWith(CD_PREFIX)) {
      const key = trimmed.slice(CD_PREFIX.length);
      if (key) await storage.set('defaultKey', key);
      return;
    }

    const slash = parseSlashCommand(trimmed);
    if (slash?.type === 'new') {
      await tabsApi.createNewTab();
      return;
    }
    if (slash?.type === 'tab-index') {
      await tabsApi.activateTabByIndex(slash.index);
      return;
    }
    if (slash?.type === 'tab-search') {
      const tabs = await tabsApi.queryWindowTabs(slash.query);
      if (tabs[0]?.id) await tabsApi.activateTabById(tabs[0].id);
      return;
    }

    if (trimmed.startsWith('*')) {
      const q = trimmed.slice(1).trim();
      if (!q) return;
      const bookmarks = await chrome.bookmarks.search(q);
      const first = bookmarks.find((b) => b.url);
      if (first?.url) await openUrl(first.url, disposition);
      return;
    }

    if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
      const key = trimmed.split(/\s+/)[1];
      if (key) await storage.set('defaultKey', key);
      return;
    }

    const ctx = await loadContext();
    let url = '';

    if (hasDefaultEngineFilterPrefix(trimmed)) {
      url = resolveSearchUrl(
        ctx.defaultKey,
        stripDefaultEngineFilterPrefix(trimmed),
        ctx.jumpToData,
        ctx.defaultKey
      );
    } else if (trimmed.includes(' ')) {
      const [a, b] = segmentationContent(' ', trimmed);
      url = resolveSearchUrl(a, b, ctx.jumpToData, ctx.defaultKey);
    } else {
      url = resolveSearchUrl(ctx.defaultKey, trimmed, ctx.jumpToData, ctx.defaultKey);
    }

    if (url) await openUrl(url, disposition);
  }

  storage.get('omniboxEnabled').then((v) => {
    if (v === false) omniboxEnabled = false;
  });

  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes.omniboxEnabled) return;
    omniboxEnabled = changes.omniboxEnabled.newValue !== false;
  });

  chrome.omnibox.onInputStarted.addListener(() => {
    if (!omniboxEnabled) return;
    chrome.omnibox.setDefaultSuggestion({
      description: 'LaunchPad：/new · /t 关键词 · * 收藏 · bd/gg 搜索',
    });
  });

  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    if (!omniboxEnabled) {
      suggest([]);
      return;
    }
    buildSuggestions(text)
      .then((items) => suggest(items))
      .catch((err) => {
        console.error('Omnibox suggest error:', err);
        suggest([]);
      });
  });

  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    if (!omniboxEnabled) return;
    executeInput(text, disposition).catch((err) => console.error('Omnibox execute error:', err));
  });
})(typeof globalThis !== 'undefined' ? globalThis : self);
