// 防止 content script 被多次执行（manifest + executeScript 双重注入场景）
if (window.__gsExtInit) { /* already initialized */ } else {
window.__gsExtInit = true;

const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage;

// ─── 数据 ────────────────────────────────────────────────
// 与 src/utils/searchEngines.ts DEFAULT_SEARCH_ENGINES 保持同步
const defaultJumpData = [
  { key: ['bd', 'baidu'], label: '百度', jumpUrl: 'https://www.baidu.com/s?ie=utf-8&wd=&<query>' },
  { key: ['gg', 'google'], label: 'Google', jumpUrl: 'https://www.google.com/search?q=&<query>' },
  { key: ['ddg', 'duck'], label: 'DuckDuckGo', jumpUrl: 'https://duckduckgo.com/?q=&<query>' },
  { key: ['bi', 'bing'], label: 'Bing 必应', jumpUrl: 'https://www.bing.com/search?q=&<query>&mkt=zh-CN' },
];

function buildSearchUrl(template, query) {
  const encoded = encodeURIComponent(query ?? '');
  if (template.includes('&<query>')) return template.replace('&<query>', encoded);
  return template.replace('<query>', encoded);
}

let jumpData     = defaultJumpData;
let jumpToData   = new Map();
let defaultKey   = 'bd';
let quickLinks   = [];
let quickLinkGroups = [];
let showQuickLinks = true;
let expandedQuickGroupId = null;

// Shadow DOM 根（完全隔离宿主页 CSS）
let gsShadow = null;
let gsHost   = null;

function gs$(sel) {
  return gsShadow ? gsShadow.querySelector(sel) : null;
}

function gs$$(sel) {
  return gsShadow ? gsShadow.querySelectorAll(sel) : [];
}

// ─── 存储 ────────────────────────────────────────────────
const storage = {
  async set(key, value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) { console.error('Storage set error:', e); }
  },
  async get(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const r = await chrome.storage.local.get(key);
        return r[key];
      } else {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch (e) { console.error('Storage get error:', e); return null; }
  },
};

// ─── Favicon 缓存（与 newtab / background 共用键与 TTL）──
const FAVICON_CACHE_PREFIX = 'favicon_';
const FAVICON_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const faviconMemCache = new Map(); // domain → { dataUrl, fetchedAt }
const faviconPending = new Map();  // domain → Promise

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function getFavicon(url) {
  try { return new URL(url).origin + '/favicon.ico'; } catch { return ''; }
}

function getInitialFavicon(pageUrl) {
  const domain = getDomain(pageUrl).replace(/^www\./i, '');
  const candidate = domain.charAt(0).toUpperCase();
  const initial = /^[A-Z0-9]$/.test(candidate) ? candidate : '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#eef2f7"/><text x="12" y="16.2" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#475569">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function parseFaviconEntry(stored) {
  if (typeof stored === 'string' && stored.startsWith('data:')) {
    return { dataUrl: stored, fetchedAt: 0 };
  }
  if (stored && typeof stored === 'object' && typeof stored.dataUrl === 'string' && stored.dataUrl.startsWith('data:')) {
    return {
      dataUrl: stored.dataUrl,
      fetchedAt: typeof stored.fetchedAt === 'number' ? stored.fetchedAt : 0,
    };
  }
  return null;
}

function isFaviconStale(fetchedAt) {
  return !fetchedAt || (Date.now() - fetchedAt > FAVICON_TTL_MS);
}

function requestFaviconFromBg(pageUrl, size, force) {
  return chrome.runtime.sendMessage({
    action: 'FETCH_FAVICON',
    url: pageUrl,
    size,
    force: !!force,
  });
}

function refreshFaviconInBackground(pageUrl, size) {
  const domain = getDomain(pageUrl);
  if (!domain || faviconPending.has(domain) || !isExtensionEnvironment) return;

  const task = (async () => {
    try {
      const resp = await requestFaviconFromBg(pageUrl, size, true);
      if (resp?.success && typeof resp.dataUrl === 'string' && resp.dataUrl.startsWith('data:')) {
        const entry = { dataUrl: resp.dataUrl, fetchedAt: Date.now() };
        faviconMemCache.set(domain, entry);
        return entry.dataUrl;
      }
      return faviconMemCache.get(domain)?.dataUrl || '';
    } catch {
      return faviconMemCache.get(domain)?.dataUrl || '';
    } finally {
      faviconPending.delete(domain);
    }
  })();

  faviconPending.set(domain, task);
}

/**
 * 解析并缓存 favicon：内存 → storage → background
 * 过期时先返回旧图，再后台强制刷新
 */
async function resolveFavicon(pageUrl, size = 32) {
  const domain = getDomain(pageUrl);
  if (!domain) return '';

  const mem = faviconMemCache.get(domain);
  if (mem?.dataUrl) {
    if (isFaviconStale(mem.fetchedAt)) refreshFaviconInBackground(pageUrl, size);
    return mem.dataUrl;
  }

  const pending = faviconPending.get(domain);
  if (pending) return pending;

  const task = (async () => {
    try {
      const cacheKey = FAVICON_CACHE_PREFIX + domain;
      const stored = await storage.get(cacheKey);
      const entry = parseFaviconEntry(stored);
      if (entry) {
        faviconMemCache.set(domain, entry);
        if (isFaviconStale(entry.fetchedAt)) refreshFaviconInBackground(pageUrl, size);
        return entry.dataUrl;
      }

      if (!isExtensionEnvironment) return getFavicon(pageUrl);

      const resp = await requestFaviconFromBg(pageUrl, size, false);
      if (resp?.success && typeof resp.dataUrl === 'string' && resp.dataUrl.startsWith('data:')) {
        faviconMemCache.set(domain, { dataUrl: resp.dataUrl, fetchedAt: Date.now() });
        return resp.dataUrl;
      }
      return '';
    } catch {
      return '';
    } finally {
      faviconPending.delete(domain);
    }
  })();

  faviconPending.set(domain, task);
  return task;
}

/**
 * 给 img 元素设置缓存后的 favicon
 */
async function applyFavicon(img, pageUrl) {
  if (!img) return;
  const requestId = (img._gsFaviconRequestId || 0) + 1;
  img._gsFaviconRequestId = requestId;
  const useDefault = () => {
    img.dataset.gsDefaultFavicon = 'true';
    img.src = getInitialFavicon(pageUrl);
    img.style.display = '';
  };
  img.onerror = () => {
    if (img.dataset.gsDefaultFavicon !== 'true') useDefault();
  };
  useDefault();

  const dataUrl = await resolveFavicon(pageUrl);
  if (img._gsFaviconRequestId !== requestId) return;
  if (dataUrl) {
    delete img.dataset.gsDefaultFavicon;
    img.src = dataUrl;
    img.style.display = '';
  }
}

function preloadEngineFavicons() {
  for (const engine of jumpData) {
    const iconSrc = engine?.iconUrl || engine?.jumpUrl;
    if (iconSrc) resolveFavicon(iconSrc).catch(() => {});
  }
}

function segmentationContent(medium, content) {
  const [first, ...rest] = content.split(medium);
  return [first, rest.join(' ')];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEFAULT_ENGINE_FILTER_PREFIX = '!';

function stripDefaultEngineFilterPrefix(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed.startsWith(DEFAULT_ENGINE_FILTER_PREFIX)) return value;
  return trimmed.slice(DEFAULT_ENGINE_FILTER_PREFIX.length).trimStart();
}

function hasDefaultEngineFilterPrefix(value) {
  return String(value || '').trim().startsWith(DEFAULT_ENGINE_FILTER_PREFIX);
}

function parseSlashCommand(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed === '/new') return { type: 'new' };
  const tabIndexMatch = trimmed.match(/^\/t(\d+)$/i);
  if (tabIndexMatch) {
    const index = parseInt(tabIndexMatch[1], 10);
    if (index >= 1) return { type: 'tab-index', index };
  }
  const tabSearchMatch = trimmed.match(/^\/t(?:\s+(.+))?$/i);
  if (tabSearchMatch) return { type: 'tab-search', query: (tabSearchMatch[1] || '').trim() };
  return null;
}

function isSlashCommand(value) {
  return parseSlashCommand(value) !== null;
}

function parseInputQuery(value) {
  if (hasDefaultEngineFilterPrefix(value)) {
    return { engineKey: defaultKey, query: stripDefaultEngineFilterPrefix(value) };
  }
  // 长 key 优先，避免短 key 误匹配
  const keys = [...jumpToData.keys()].sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (value === key || value === key + ' ') {
      return { engineKey: key, query: '' };
    }
    if (value.startsWith(key + ' ')) {
      return { engineKey: key, query: value.slice(key.length + 1).trim() };
    }
  }
  return { engineKey: defaultKey, query: value };
}

// ─── 样式（注入 Shadow DOM，不受页面 CSS 影响）────────────
const GS_STYLES = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color-scheme: light dark;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
  font: inherit;
  color: inherit;
  background: transparent;
  outline: none;
  box-shadow: none;
  text-decoration: none;
  list-style: none;
}

button {
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

img {
  display: block;
  max-width: 100%;
}

/* ── Overlay ── */
#gs-overlay {
  position: fixed;
  inset: 0;
  display: none;
  justify-content: center;
  align-items: flex-start;
  padding: 18vh 16px 24px;
  z-index: 2147483647;
  background: rgba(15, 15, 18, 0);
  backdrop-filter: blur(0px) saturate(100%);
  -webkit-backdrop-filter: blur(0px) saturate(100%);
  transition:
    background 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    backdrop-filter 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
  pointer-events: auto;
}
#gs-overlay.show {
  background: rgba(15, 15, 18, 0.42);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
}

/* ── Card ── */
#gs-box {
  position: relative;
  width: min(100%, 560px);
  max-height: calc(100dvh - 18vh - 24px);
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 16px 40px rgba(0, 0, 0, 0.12),
    0 40px 80px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  opacity: 0;
  transform: scale(0.96) translateY(-12px);
  transition:
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  cursor: default;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
}
#gs-box.show {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* ── Input row ── */
#gs-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  min-height: 60px;
  flex-shrink: 0;
}

#gs-engine-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  opacity: 0.9;
}
#gs-engine-btn:hover {
  opacity: 1;
  transform: scale(1.06);
}
#gs-engine-btn:active { transform: scale(0.96); }
#gs-engine-btn img {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: contain;
}
#gs-engine-btn .gs-fallback {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #6b7280;
}

#gs-input {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 450;
  letter-spacing: -0.01em;
  color: #111827;
  caret-color: #3b82f6;
  line-height: 1.4;
}
#gs-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

#gs-esc-hint {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #52525b;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-bottom-width: 2px;
  border-radius: 5px;
  letter-spacing: 0;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: auto;
  text-rendering: geometricPrecision;
}

.gs-divider {
  height: 1px;
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 0, 0, 0.08) 12%,
    rgba(0, 0, 0, 0.08) 88%,
    transparent
  );
}

/* ── Quick links (read-only) ── */
#gs-quick-links {
  position: absolute;
  top: calc(18vh + 72px);
  left: 50%;
  width: min(calc(100% - 32px), 560px);
  padding: 0 8px;
  box-sizing: border-box;
  opacity: 0;
  transform: translate(-50%, -6px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
#gs-overlay.show #gs-quick-links {
  opacity: 1;
  transform: translate(-50%, 0);
}
.gs-quick-flow,
.gs-quick-group-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}
.gs-quick-chip,
.gs-quick-group-chip {
  height: 36px;
  max-width: 190px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  color: #374151;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
}
.gs-quick-chip:hover,
.gs-quick-group-chip:hover,
.gs-quick-group-chip.open {
  border-color: rgba(15, 23, 42, 0.3);
  background: rgba(255, 255, 255, 0.94);
  transform: translateY(-1px);
}
.gs-quick-chip img {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  border-radius: 4px;
  object-fit: contain;
}
.gs-quick-chip > span,
.gs-quick-group-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gs-quick-group-chip { padding-right: 8px; }
.gs-quick-group-icons {
  height: 24px;
  padding-left: 5px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.gs-quick-group-icon {
  width: 22px;
  height: 22px;
  margin-left: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  background: #fff;
  box-sizing: border-box;
}
.gs-quick-group-icon img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.gs-quick-group-links {
  width: 100%;
  margin-top: 10px;
  padding: 0;
  box-sizing: border-box;
}

#gs-dropdown {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
  overscroll-behavior: contain;
}
#gs-dropdown::-webkit-scrollbar { width: 4px; height: 4px; }
#gs-dropdown::-webkit-scrollbar-track { background: transparent; }
#gs-dropdown::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 999px;
}
#gs-dropdown::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.28);
}

.gs-section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
  padding: 6px 10px 8px;
  user-select: none;
}
.gs-section-label--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-transform: none;
  letter-spacing: 0;
}
.gs-kbd-hints {
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.gs-kbd-hints kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin: 0 1px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.95);
  font-size: 10px;
  font-family: inherit;
  font-weight: 600;
  color: #6b7280;
}

.gs-engine-item,
.gs-bm-item,
.gs-sug-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s ease;
}
.gs-engine-item:hover,
.gs-engine-item.active,
.gs-engine-item.selected,
.gs-bm-item:hover,
.gs-bm-item.selected,
.gs-sug-item:hover,
.gs-sug-item.selected {
  background: rgba(59, 130, 246, 0.09);
}
.gs-engine-item.selected {
  background: rgba(59, 130, 246, 0.14);
}

.gs-engine-item img,
.gs-bm-item img {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: contain;
  flex-shrink: 0;
}

.gs-tab-badge {
  flex-shrink: 0;
  min-width: 28px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: #71717a;
  background: #f4f4f5;
}

@media (prefers-color-scheme: dark) {
  .gs-tab-badge {
    color: #a1a1aa;
    background: #27272a;
  }
}

.gs-engine-name {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gs-engine-key {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #52525b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-bottom-width: 2px;
  border-radius: 5px;
  letter-spacing: 0;
  -webkit-font-smoothing: auto;
  text-rendering: geometricPrecision;
}
.gs-engine-check {
  font-size: 13px;
  color: #3b82f6;
  flex-shrink: 0;
  font-weight: 600;
}
.gs-engine-enter {
  font-size: 11px;
  color: #3b82f6;
  font-weight: 500;
  flex-shrink: 0;
}

.gs-bm-info { flex: 1; min-width: 0; }
.gs-bm-title {
  font-size: 13.5px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gs-bm-url {
  font-size: 11px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.gs-sug-text {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gs-sug-hl {
  color: #9ca3af;
  font-weight: 400;
}

.gs-bm-enter,
.gs-sug-enter {
  font-size: 11px;
  color: #3b82f6;
  font-weight: 600;
  flex-shrink: 0;
  opacity: 0.9;
}

.gs-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  padding: 20px 12px;
}
.gs-more {
  text-align: center;
  color: #9ca3af;
  font-size: 11px;
  padding: 8px 0 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  margin-top: 4px;
}

@media (prefers-color-scheme: dark) {
  #gs-overlay.show {
    background: rgba(0, 0, 0, 0.55);
  }
  #gs-box {
    background: rgba(28, 28, 32, 0.94);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04) inset,
      0 1px 2px rgba(0, 0, 0, 0.2),
      0 20px 48px rgba(0, 0, 0, 0.45),
      0 40px 80px rgba(0, 0, 0, 0.25);
  }
  #gs-input { color: #f4f4f5; }
  #gs-input::placeholder { color: #71717a; }
  #gs-esc-hint {
    color: #d4d4d8;
    background: #27272a;
    border-color: #3f3f46;
  }
  #gs-engine-btn .gs-fallback {
    color: #a1a1aa;
  }
  .gs-divider {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.08) 12%,
      rgba(255, 255, 255, 0.08) 88%,
      transparent
    );
  }
  .gs-quick-chip,
  .gs-quick-group-chip {
    color: #e5e7eb;
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(39, 39, 42, 0.72);
  }
  .gs-quick-chip:hover,
  .gs-quick-group-chip:hover,
  .gs-quick-group-chip.open {
    border-color: rgba(255, 255, 255, 0.34);
    background: rgba(63, 63, 70, 0.9);
  }
  .gs-quick-group-icon {
    border-color: rgba(63, 63, 70, 0.96);
    background: #27272a;
  }
  #gs-dropdown { scrollbar-color: rgba(255, 255, 255, 0.15) transparent; }
  #gs-dropdown::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); }
  #gs-dropdown::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }
  .gs-section-label { color: #71717a; }
  .gs-kbd-hints kbd {
    color: #d4d4d8;
    background: #27272a;
    border-color: #3f3f46;
  }
  .gs-engine-item:hover,
  .gs-engine-item.active,
  .gs-engine-item.selected,
  .gs-bm-item:hover,
  .gs-bm-item.selected,
  .gs-sug-item:hover,
  .gs-sug-item.selected {
    background: rgba(59, 130, 246, 0.16);
  }
  .gs-engine-item.selected {
    background: rgba(59, 130, 246, 0.22);
  }
  .gs-engine-name,
  .gs-bm-title,
  .gs-sug-text { color: #f4f4f5; }
  .gs-engine-key {
    color: #d4d4d8;
    background: #27272a;
    border-color: #3f3f46;
  }
  .gs-bm-url,
  .gs-sug-hl,
  .gs-empty,
  .gs-more { color: #71717a; }
  .gs-more { border-top-color: rgba(255, 255, 255, 0.06); }
}
`;

// ─── 状态 ────────────────────────────────────────────────
let dropdownMode           = null; // 'engines' | 'bookmarks' | 'tabs' | 'slash-hint' | 'suggestions' | null
let selectedBookmarkIndex  = -1;
let currentBookmarkResults = [];
let selectedTabIndex       = -1;
let currentTabResults      = [];
let selectedEngineIndex    = 0;

let currentSuggestions      = [];
let selectedSuggestionIndex = -1;
let currentSearchQuery      = '';
let suggestionEngineKey     = 'bd';
let suggestAbortCtrl        = null;
let suggestTimer            = null;

function parseStoredList(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applyQuickLinks(rawLinks, rawGroups, rawVisibility = showQuickLinks) {
  quickLinks = parseStoredList(rawLinks).filter((link) =>
    link && typeof link.id === 'string' && typeof link.label === 'string' && typeof link.url === 'string'
  );
  quickLinkGroups = parseStoredList(rawGroups).filter((group) =>
    group && typeof group.id === 'string' && typeof group.label === 'string'
  );
  showQuickLinks = rawVisibility !== false && rawVisibility !== 'false';
  if (!quickLinkGroups.some((group) => group.id === expandedQuickGroupId)) {
    expandedQuickGroupId = null;
  }
  refreshQuickLinksPanel();
}

function getQuickTopItems() {
  const validGroupIds = new Set(quickLinkGroups.map((group) => group.id));
  const ungrouped = quickLinks.filter((link) => !link.groupId || !validGroupIds.has(link.groupId));
  const groups = quickLinkGroups
    .map((group) => ({ ...group, links: quickLinks.filter((link) => link.groupId === group.id) }))
    .filter((group) => group.links.length);
  return [
    ...ungrouped.map((link, index) => ({ kind: 'link', key: `link:${link.id}`, link, position: link.position, fallback: index })),
    ...groups.map((group, index) => ({ kind: 'group', key: `group:${group.id}`, group, position: group.position, fallback: ungrouped.length + index })),
  ].sort((a, b) => {
    if (Number.isFinite(a.position) && Number.isFinite(b.position)) return a.position - b.position;
    if (Number.isFinite(a.position)) return -1;
    if (Number.isFinite(b.position)) return 1;
    return a.fallback - b.fallback;
  });
}

function createQuickLinkChip(link) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'gs-quick-chip';
  chip.title = link.url;

  const img = document.createElement('img');
  img.alt = '';
  applyFavicon(img, link.url);
  const label = document.createElement('span');
  label.textContent = link.label;
  chip.appendChild(img);
  chip.appendChild(label);
  chip.addEventListener('click', () => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
    if (animateHide) animateHide();
  });
  return chip;
}

function renderQuickLinksPanel() {
  const panel = gs$('#gs-quick-links');
  if (!panel) return false;
  panel.innerHTML = '';
  const items = getQuickTopItems();
  if (!showQuickLinks || !items.length) return false;

  const flow = document.createElement('div');
  flow.className = 'gs-quick-flow';
  items.forEach((item) => {
    if (item.kind === 'link') {
      flow.appendChild(createQuickLinkChip(item.link));
      return;
    }

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'gs-quick-group-chip' + (expandedQuickGroupId === item.group.id ? ' open' : '');
    chip.setAttribute('aria-expanded', String(expandedQuickGroupId === item.group.id));
    const label = document.createElement('span');
    label.className = 'gs-quick-group-label';
    label.textContent = item.group.label;
    const icons = document.createElement('span');
    icons.className = 'gs-quick-group-icons';
    item.group.links.slice(0, 3).forEach((link) => {
      const icon = document.createElement('span');
      icon.className = 'gs-quick-group-icon';
      const img = document.createElement('img');
      img.alt = '';
      applyFavicon(img, link.url);
      icon.appendChild(img);
      icons.appendChild(icon);
    });
    chip.appendChild(label);
    chip.appendChild(icons);
    chip.addEventListener('click', () => {
      expandedQuickGroupId = expandedQuickGroupId === item.group.id ? null : item.group.id;
      renderQuickLinksPanel();
    });
    flow.appendChild(chip);
  });
  panel.appendChild(flow);

  const expanded = items.find((item) => item.kind === 'group' && item.group.id === expandedQuickGroupId);
  if (expanded) {
    const links = document.createElement('div');
    links.className = 'gs-quick-group-links';
    expanded.group.links.forEach((link) => links.appendChild(createQuickLinkChip(link)));
    panel.appendChild(links);
  }
  return true;
}

function showQuickLinksPanel() {
  const panel = gs$('#gs-quick-links');
  if (!panel) return;
  const hasLinks = renderQuickLinksPanel();
  panel.style.display = hasLinks ? 'block' : 'none';
}

function hideQuickLinksPanel() {
  const panel = gs$('#gs-quick-links');
  if (panel) panel.style.display = 'none';
}

function refreshQuickLinksPanel() {
  const input = gs$('#gs-input');
  if (input && !input.value.trim() && isSearchVisible()) showQuickLinksPanel();
}

function getFilteredEngines(filter) {
  const q = (filter || '').toLowerCase();
  if (!q) return jumpData;
  return jumpData.filter((e) =>
    e.key.some((k) => k.toLowerCase().startsWith(q) || k.toLowerCase().includes(q)) ||
    e.label.toLowerCase().includes(q)
  );
}

function initEngineSelection(list) {
  const idx = list.findIndex((e) => e.key.includes(defaultKey));
  selectedEngineIndex = idx >= 0 ? idx : 0;
}

async function applyEngineSelection(engine) {
  if (!engine?.key?.[0]) return;
  defaultKey = engine.key[0];
  await storage.set('defaultKey', engine.key[0]);
  engineBtnKey = '';
  updateEngineBtn();
  hideDropdown();
  const input = gs$('#gs-input');
  if (input) {
    const v = input.value.trim();
    if (v === 'cd' || v.startsWith('cd ')) input.value = '';
  }
}

// ─── 下拉渲染 ─────────────────────────────────────────────
function renderEngines(container, filter) {
  const list = getFilteredEngines(filter);
  if (selectedEngineIndex >= list.length) selectedEngineIndex = Math.max(0, list.length - 1);

  const head = document.createElement('div');
  head.className = 'gs-section-label gs-section-label--row';
  const title = document.createElement('span');
  title.textContent = '搜索引擎';
  const hints = document.createElement('span');
  hints.className = 'gs-kbd-hints';
  hints.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 确认 · <kbd>Esc</kbd> 关闭';
  head.appendChild(title);
  head.appendChild(hints);
  container.appendChild(head);

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'gs-empty';
    empty.textContent = '无匹配引擎';
    container.appendChild(empty);
    return;
  }

  list.forEach((engine, index) => {
    const item = document.createElement('div');
    const isCurrent = engine.key.includes(defaultKey);
    const isSelected = index === selectedEngineIndex;
    item.className = 'gs-engine-item'
      + (isCurrent ? ' active' : '')
      + (isSelected ? ' selected' : '');

    const img = document.createElement('img');
    img.alt = '';
    applyFavicon(img, engine.iconUrl || engine.jumpUrl);

    const name = document.createElement('span');
    name.className = 'gs-engine-name';
    name.textContent = engine.label;

    item.appendChild(img);
    item.appendChild(name);

    if (isSelected) {
      const enter = document.createElement('span');
      enter.className = 'gs-engine-enter';
      enter.textContent = 'Enter';
      item.appendChild(enter);
    } else {
      const key = document.createElement('span');
      key.className = 'gs-engine-key';
      key.textContent = (engine.key || []).filter(Boolean).join(' / ');
      item.appendChild(key);
      if (isCurrent) {
        const check = document.createElement('span');
        check.className = 'gs-engine-check';
        check.textContent = '✓';
        item.appendChild(check);
      }
    }

    item.addEventListener('mouseenter', () => {
      if (selectedEngineIndex === index) return;
      selectedEngineIndex = index;
      gs$$('.gs-engine-item').forEach((el, i) => {
        const on = i === selectedEngineIndex;
        el.classList.toggle('selected', on);
        const exist = el.querySelector('.gs-engine-enter');
        if (on && !exist) {
          const enter = document.createElement('span');
          enter.className = 'gs-engine-enter';
          enter.textContent = 'Enter';
          el.appendChild(enter);
        } else if (!on) {
          exist?.remove();
        }
      });
    });

    item.addEventListener('click', async () => {
      selectedEngineIndex = index;
      await applyEngineSelection(engine);
    });

    container.appendChild(item);
  });
}

function renderSlashHint(container, cmd) {
  const head = document.createElement('div');
  head.className = 'gs-section-label gs-section-label--row';
  const title = document.createElement('span');
  if (cmd.type === 'new') title.textContent = '打开新标签页';
  else if (cmd.type === 'tab-index') title.textContent = `切换到第 ${cmd.index} 个标签页`;
  else title.textContent = '标签页命令';
  const hints = document.createElement('span');
  hints.className = 'gs-kbd-hints';
  hints.innerHTML = '<kbd>Enter</kbd> 确认';
  head.appendChild(title);
  head.appendChild(hints);
  container.appendChild(head);
}

function renderTabs(container, results, selectedIndex) {
  const head = document.createElement('div');
  head.className = 'gs-section-label gs-section-label--row';
  const title = document.createElement('span');
  title.textContent = '标签页';
  const hints = document.createElement('span');
  hints.className = 'gs-kbd-hints';
  hints.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 切换';
  head.appendChild(title);
  head.appendChild(hints);
  container.appendChild(head);

  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'gs-empty';
    empty.textContent = '未找到匹配的标签页';
    container.appendChild(empty);
    return;
  }

  results.slice(0, 8).forEach((tab, i) => {
    const item = document.createElement('div');
    item.className = 'gs-bm-item gs-tab-item' + (i === selectedIndex ? ' selected' : '');

    const badge = document.createElement('span');
    badge.className = 'gs-tab-badge';
    badge.textContent = `t${tab.index}`;

    const img = document.createElement('img');
    img.alt = '';
    applyFavicon(img, tab.url);

    const info = document.createElement('div');
    info.className = 'gs-bm-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'gs-bm-title';
    titleEl.textContent = tab.title;

    const url = document.createElement('div');
    url.className = 'gs-bm-url';
    url.textContent = tab.url;

    info.appendChild(titleEl);
    info.appendChild(url);
    item.appendChild(badge);
    item.appendChild(img);
    item.appendChild(info);

    if (i === selectedIndex) {
      const enter = document.createElement('span');
      enter.className = 'gs-bm-enter';
      enter.textContent = 'Enter';
      item.appendChild(enter);
    }

    item.addEventListener('mouseenter', () => {
      selectedTabIndex = i;
      gs$$('.gs-tab-item').forEach((el, idx) => {
        el.classList.toggle('selected', idx === i);
        const exist = el.querySelector('.gs-bm-enter');
        if (idx === i && !exist) {
          const enter = document.createElement('span');
          enter.className = 'gs-bm-enter';
          enter.textContent = 'Enter';
          el.appendChild(enter);
        } else if (idx !== i) {
          exist?.remove();
        }
      });
    });

    item.addEventListener('click', async () => {
      if (tab.id && await activateTab(tab.id)) {
        hideDropdown();
        if (animateHide) animateHide();
      }
    });

    container.appendChild(item);
  });
}

function renderBookmarks(container, results, selectedIndex) {
  const head = document.createElement('div');
  head.className = 'gs-section-label gs-section-label--row';
  const title = document.createElement('span');
  title.textContent = '收藏夹';
  const hints = document.createElement('span');
  hints.className = 'gs-kbd-hints';
  hints.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 打开';
  head.appendChild(title);
  head.appendChild(hints);
  container.appendChild(head);

  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'gs-empty';
    empty.textContent = '未找到匹配的收藏夹';
    container.appendChild(empty);
    return;
  }

  results.slice(0, 5).forEach((bm, i) => {
    const item = document.createElement('div');
    item.className = 'gs-bm-item' + (i === selectedIndex ? ' selected' : '');

    const img = document.createElement('img');
    img.alt = '';
    applyFavicon(img, bm.url);

    const info = document.createElement('div');
    info.className = 'gs-bm-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'gs-bm-title';
    titleEl.textContent = bm.title;

    const url = document.createElement('div');
    url.className = 'gs-bm-url';
    url.textContent = bm.url;

    info.appendChild(titleEl);
    info.appendChild(url);
    item.appendChild(img);
    item.appendChild(info);

    if (i === selectedIndex) {
      const enter = document.createElement('span');
      enter.className = 'gs-bm-enter';
      enter.textContent = 'Enter';
      item.appendChild(enter);
    }

    item.addEventListener('mouseenter', () => {
      selectedBookmarkIndex = i;
      gs$$('.gs-bm-item').forEach((el, idx) => {
        el.classList.toggle('selected', idx === i);
        const exist = el.querySelector('.gs-bm-enter');
        if (idx === i && !exist) {
          const enter = document.createElement('span');
          enter.className = 'gs-bm-enter';
          enter.textContent = 'Enter';
          el.appendChild(enter);
        } else if (idx !== i) {
          exist?.remove();
        }
      });
    });

    item.addEventListener('click', () => {
      if (bm.url) {
        window.open(bm.url, '_blank', 'noopener,noreferrer');
        hideDropdown();
        if (animateHide) animateHide();
      }
    });

    container.appendChild(item);
  });

  if (results.length > 5) {
    const more = document.createElement('div');
    more.className = 'gs-more';
    more.textContent = `另有 ${results.length - 5} 条结果`;
    container.appendChild(more);
  }
}

// ─── 搜索建议 ─────────────────────────────────────────────
async function fetchSuggestions(query, engineKey) {
  if (!query || query.length < 1) { if (dropdownMode === 'suggestions') hideDropdown(); return; }
  if (!isExtensionEnvironment) return;

  if (suggestAbortCtrl) suggestAbortCtrl._cancelled = true;
  const ctrl = { _cancelled: false };
  suggestAbortCtrl = ctrl;

  let url = '';
  if      (['bd','baidu'].includes(engineKey))  url = `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(query)}`;
  else if (['gg','google'].includes(engineKey)) url = `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
  else if (['bi','bing'].includes(engineKey))   url = `https://api.bing.com/qsonhs.aspx?type=cb&q=${encodeURIComponent(query)}`;
  else { hideDropdown(); return; }

  try {
    const resp = await chrome.runtime.sendMessage({ action: 'FETCH_SUGGESTIONS', url });
    if (ctrl._cancelled) return;
    if (!resp?.success) throw new Error(resp?.error || 'fetch failed');

    const data = resp.data;
    let results = [];
    if      (['bd','baidu'].includes(engineKey))  results = (data.g || []).map(i => i.q).filter(Boolean);
    else if (['gg','google'].includes(engineKey)) results = data[1] || [];
    else if (['bi','bing'].includes(engineKey))   results = data.AS?.Results?.[0]?.Suggests?.map(s => s.Txt) || [];

    currentSuggestions      = results.slice(0, 8);
    selectedSuggestionIndex = -1;
    suggestionEngineKey     = engineKey;
    if (currentSuggestions.length > 0) showDropdown('suggestions');
    else if (dropdownMode === 'suggestions') hideDropdown();
  } catch (e) {
    if (!ctrl._cancelled) console.error('Suggestion fetch error:', e);
  }
}

function fillSuggestionValue(suggestion) {
  const input = gs$('#gs-input');
  if (!input) return;
  const eng = suggestionEngineKey || defaultKey;
  input.value = eng === defaultKey ? suggestion : `${eng} ${suggestion}`;
  syncEngineBtnFromInput();
}

function renderSuggestions(container) {
  const head = document.createElement('div');
  head.className = 'gs-section-label gs-section-label--row';
  const title = document.createElement('span');
  title.textContent = '搜索建议';
  const hints = document.createElement('span');
  hints.className = 'gs-kbd-hints';
  hints.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>→</kbd> 填入 · <kbd>Enter</kbd> 搜索';
  head.appendChild(title);
  head.appendChild(hints);
  container.appendChild(head);

  currentSuggestions.forEach((sug, i) => {
    const item = document.createElement('div');
    item.className = 'gs-sug-item' + (i === selectedSuggestionIndex ? ' selected' : '');

    const text = document.createElement('span');
    text.className = 'gs-sug-text';
    if (currentSearchQuery) {
      const rx = new RegExp(`(${escapeRegex(currentSearchQuery)})`, 'gi');
      text.innerHTML = sug.replace(rx, '<span class="gs-sug-hl">$1</span>');
    } else {
      text.textContent = sug;
    }
    item.appendChild(text);

    if (i === selectedSuggestionIndex) {
      const hint = document.createElement('span');
      hint.className = 'gs-sug-enter';
      hint.textContent = '↵';
      item.appendChild(hint);
    }

    item.addEventListener('mouseenter', () => {
      selectedSuggestionIndex = i;
      gs$$('.gs-sug-item').forEach((el, idx) => {
        el.classList.toggle('selected', idx === i);
        const exist = el.querySelector('.gs-sug-enter');
        if (idx === i && !exist) {
          const enter = document.createElement('span');
          enter.className = 'gs-sug-enter';
          enter.textContent = '↵';
          el.appendChild(enter);
        } else if (idx !== i) {
          exist?.remove();
        }
      });
    });

    item.addEventListener('click', () => {
      jumpTo(suggestionEngineKey || defaultKey, sug);
      const input = gs$('#gs-input');
      if (input) input.value = '';
      hideDropdown();
      selectedSuggestionIndex = -1;
      if (animateHide) animateHide();
    });

    container.appendChild(item);
  });
}

const scrollToSelectedSuggestion = () => {
  const dropdown = gs$('#gs-dropdown');
  const sel = dropdown?.querySelector('.gs-sug-item.selected');
  if (!dropdown || !sel) return;
  const dr = dropdown.getBoundingClientRect(), sr = sel.getBoundingClientRect();
  if (sr.top < dr.top) dropdown.scrollTop -= dr.top - sr.top;
  else if (sr.bottom > dr.bottom) dropdown.scrollTop += sr.bottom - dr.bottom;
};

// ─── 下拉显示/隐藏 ───────────────────────────────────────
function fitDropdownToViewport(dropdown) {
  const inputRow = gs$('#gs-input-row');
  if (!dropdown || !inputRow) return;

  // 按「输入框底边 → 视口底边」算可用高度。
  // 不要用 #gs-box 当前 bottom：展开前盒子还很矮，会把列表压成一条缝。
  const rowBottom = inputRow.getBoundingClientRect().bottom;
  const bottomSafe = 20;
  const available = Math.floor(window.innerHeight - rowBottom - bottomSafe);
  dropdown.style.maxHeight = Math.max(96, available) + 'px';
}

function showDropdown(mode, results, selectedIndex) {
  dropdownMode = mode;
  const divider  = gs$('#gs-divider');
  const dropdown = gs$('#gs-dropdown');
  if (!divider || !dropdown) return;

  hideQuickLinksPanel();

  divider.style.display  = 'block';
  dropdown.style.display = 'block';
  dropdown.innerHTML     = '';

  if (mode === 'engines') {
    const input = gs$('#gs-input');
    const raw = (input?.value || '').trim();
    const filter = (raw === 'cd' || raw.startsWith('cd '))
      ? (raw.split(/\s+/)[1] || '')
      : '';
    renderEngines(dropdown, filter);
  }
  if (mode === 'bookmarks')   renderBookmarks(dropdown, results ?? currentBookmarkResults, selectedIndex ?? selectedBookmarkIndex);
  if (mode === 'tabs')        renderTabs(dropdown, results ?? currentTabResults, selectedIndex ?? selectedTabIndex);
  if (mode === 'slash-hint')  renderSlashHint(dropdown, results);
  if (mode === 'suggestions') renderSuggestions(dropdown);

  // 渲染内容后再量高度，保证标题/条目都算进去
  fitDropdownToViewport(dropdown);
  requestAnimationFrame(() => fitDropdownToViewport(dropdown));
}

function hideDropdown() {
  dropdownMode = null;
  const divider  = gs$('#gs-divider');
  const dropdown = gs$('#gs-dropdown');
  if (divider)  divider.style.display  = 'none';
  if (dropdown) dropdown.style.display = 'none';
  const input = gs$('#gs-input');
  if (input && !input.value.trim() && isSearchVisible()) showQuickLinksPanel();
}

function findEngineByToken(token) {
  if (!token) return null;
  const lower = String(token).toLowerCase();
  if (jumpToData.has(token)) return jumpToData.get(token);
  if (jumpToData.has(lower)) return jumpToData.get(lower);
  for (const eng of jumpData) {
    if ((eng.key || []).some((k) => k && String(k).toLowerCase() === lower)) return eng;
  }
  return null;
}

function resolveActiveEngineKey(raw) {
  const value = (raw || '').trim();
  if (!value || value.startsWith('*') || value === 'cd' || value.startsWith('cd ') || hasDefaultEngineFilterPrefix(value) || isSlashCommand(value)) {
    return defaultKey;
  }
  const token = value.split(/\s+/)[0];
  const eng = findEngineByToken(token);
  return eng?.key?.[0] || defaultKey;
}

let engineBtnKey = '';

function updateEngineBtn(activeKey) {
  const btn = gs$('#gs-engine-btn');
  if (!btn) return;

  const eng =
    findEngineByToken(activeKey) ||
    jumpToData.get(defaultKey) ||
    jumpData[0];
  if (!eng) return;

  const primary = eng.key?.[0] || defaultKey;
  const pageUrl = eng.iconUrl || eng.jumpUrl || '';

  // 同一引擎且已有有效图标则跳过
  if (primary === engineBtnKey) {
    const existing = btn.querySelector('img');
    if (existing && existing.getAttribute('src')) {
      btn.title = eng.label || '选择搜索引擎';
      return;
    }
  }

  engineBtnKey = primary;
  btn.title = eng.label || '选择搜索引擎';
  btn.innerHTML = '';

  const img = document.createElement('img');
  img.alt = eng.label || '';
  btn.appendChild(img);

  // 先同步展示：内存缓存 → 站点 /favicon.ico，避免异步空窗
  const domain = getDomain(pageUrl);
  const mem = domain ? faviconMemCache.get(domain)?.dataUrl : '';
  if (mem) {
    img.src = mem;
  } else if (pageUrl) {
    img.src = getFavicon(pageUrl);
  }

  const expectedKey = primary;
  resolveFavicon(pageUrl).then((dataUrl) => {
    if (gs$('#gs-engine-btn') !== btn) return;
    if (engineBtnKey !== expectedKey) return;
    if (dataUrl) {
      img.src = dataUrl;
      return;
    }
    if (!img.getAttribute('src')) {
      img.remove();
      const fb = document.createElement('div');
      fb.className = 'gs-fallback';
      fb.textContent = primary.toUpperCase();
      btn.appendChild(fb);
    }
  });
}

function syncEngineBtnFromInput() {
  const input = gs$('#gs-input');
  updateEngineBtn(resolveActiveEngineKey(input?.value || ''));
}

async function searchBookmarks(query) {
  try {
    if (isExtensionEnvironment && chrome.runtime?.sendMessage) {
      const resp = await chrome.runtime.sendMessage({
        action: 'SEARCH_BOOKMARKS',
        query,
      });
      if (resp?.success && Array.isArray(resp.results)) return resp.results;
    }

    const cached = await storage.get('cachedBookmarks');
    if (!cached) return [];
    const bookmarks  = JSON.parse(cached);
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(b =>
      b.title?.toLowerCase().includes(lowerQuery) ||
      b.url?.toLowerCase().includes(lowerQuery)
    );
  } catch (e) {
    console.error('搜索失败:', e);
    return [];
  }
}

async function searchTabs(query) {
  try {
    if (isExtensionEnvironment && chrome.runtime?.sendMessage) {
      const resp = await chrome.runtime.sendMessage({
        action: 'QUERY_TABS',
        query,
      });
      if (resp?.success && Array.isArray(resp.results)) return resp.results;
    }
  } catch (e) {
    console.error('标签页搜索失败:', e);
  }
  return [];
}

async function activateTab(tabId) {
  if (!tabId || !isExtensionEnvironment || !chrome.runtime?.sendMessage) return false;
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'ACTIVATE_TAB', tabId });
    return !!resp?.success;
  } catch (e) {
    console.error('切换标签页失败:', e);
    return false;
  }
}

async function activateTabByIndex(index) {
  if (!index || !isExtensionEnvironment || !chrome.runtime?.sendMessage) return false;
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'ACTIVATE_TAB', index });
    return !!resp?.success;
  } catch (e) {
    console.error('切换标签页失败:', e);
    return false;
  }
}

async function createNewTab() {
  if (!isExtensionEnvironment || !chrome.runtime?.sendMessage) return false;
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'CREATE_TAB' });
    return !!resp?.success;
  } catch (e) {
    console.error('新建标签页失败:', e);
    return false;
  }
}

async function executeSlashCommand(cmd) {
  if (!cmd) return false;
  if (cmd.type === 'new') return createNewTab();
  if (cmd.type === 'tab-index') return activateTabByIndex(cmd.index);
  if (cmd.type === 'tab-search') {
    if (!currentTabResults.length) {
      currentTabResults = await searchTabs(cmd.query);
    }
    const tab =
      selectedTabIndex >= 0
        ? currentTabResults[selectedTabIndex]
        : currentTabResults[0];
    if (tab?.id) return activateTab(tab.id);
  }
  return false;
}

const handleKeyNavigation = (e) => {
  if (dropdownMode === 'engines') {
    const input = gs$('#gs-input');
    const raw = (input?.value || '').trim();
    const filter = (raw === 'cd' || raw.startsWith('cd '))
      ? (raw.split(/\s+/)[1] || '')
      : '';
    const list = getFilteredEngines(filter);
    const max = list.length - 1;
    if (max < 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedEngineIndex = selectedEngineIndex <= 0 ? max : selectedEngineIndex - 1;
      showDropdown('engines');
      scrollToSelectedEngine();
      const eng = list[selectedEngineIndex];
      if (eng?.key?.[0]) updateEngineBtn(eng.key[0]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedEngineIndex = selectedEngineIndex >= max ? 0 : selectedEngineIndex + 1;
      showDropdown('engines');
      scrollToSelectedEngine();
      const eng = list[selectedEngineIndex];
      if (eng?.key?.[0]) updateEngineBtn(eng.key[0]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const eng = list[selectedEngineIndex];
      if (eng) applyEngineSelection(eng);
    }
    return;
  }

  if (dropdownMode !== 'bookmarks' && dropdownMode !== 'tabs') return;
  const isTabs = dropdownMode === 'tabs';
  const results = isTabs ? currentTabResults : currentBookmarkResults;
  if (!results.length && e.key !== 'Enter') return;
  const max = Math.min(results.length - 1, isTabs ? 7 : 4);
  const getSelected = () => (isTabs ? selectedTabIndex : selectedBookmarkIndex);
  const setSelected = (v) => {
    if (isTabs) selectedTabIndex = v;
    else selectedBookmarkIndex = v;
  };

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    setSelected(getSelected() <= 0 ? max : getSelected() - 1);
    showDropdown(isTabs ? 'tabs' : 'bookmarks');
    scrollToSelected(isTabs ? '.gs-tab-item' : '.gs-bm-item');
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    setSelected(getSelected() >= max ? 0 : getSelected() + 1);
    showDropdown(isTabs ? 'tabs' : 'bookmarks');
    scrollToSelected(isTabs ? '.gs-tab-item' : '.gs-bm-item');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (isTabs) {
      const idx = selectedTabIndex >= 0 ? selectedTabIndex : 0;
      const tab = currentTabResults[idx];
      if (tab?.id) {
        activateTab(tab.id).then((ok) => {
          if (ok) {
            hideDropdown();
            if (animateHide) animateHide();
          }
        });
      }
    } else if (selectedBookmarkIndex >= 0 && currentBookmarkResults[selectedBookmarkIndex]?.url) {
      window.open(currentBookmarkResults[selectedBookmarkIndex].url, '_blank', 'noopener,noreferrer');
      hideDropdown();
      if (animateHide) animateHide();
    }
  }
};

const scrollToSelected = (selector = '.gs-bm-item') => {
  const dropdown = gs$('#gs-dropdown');
  const selected = dropdown?.querySelector(`${selector}.selected`);
  if (!dropdown || !selected) return;
  const dr = dropdown.getBoundingClientRect();
  const sr = selected.getBoundingClientRect();
  if (sr.top < dr.top)       dropdown.scrollTop -= dr.top - sr.top;
  else if (sr.bottom > dr.bottom) dropdown.scrollTop += sr.bottom - dr.bottom;
};

const scrollToSelectedEngine = () => {
  const dropdown = gs$('#gs-dropdown');
  const selected = dropdown?.querySelector('.gs-engine-item.selected');
  if (!dropdown || !selected) return;
  const dr = dropdown.getBoundingClientRect();
  const sr = selected.getBoundingClientRect();
  if (sr.top < dr.top)       dropdown.scrollTop -= dr.top - sr.top;
  else if (sr.bottom > dr.bottom) dropdown.scrollTop += sr.bottom - dr.bottom;
};

// ─── 创建搜索容器（Shadow DOM 隔离）─────────────────────────
let animateHide;

const createSearchContainer = () => {
  if (document.getElementById('init-gs-host')) return null;

  // Host：阻断页面样式继承；Shadow 内自包含全部 UI
  const host = document.createElement('div');
  host.id = 'init-gs-host';
  host.setAttribute('data-init-gs', '1');
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'inset: 0',
    'z-index: 2147483647',
    'pointer-events: none',
    'display: block',
  ].join(';');

  const shadow = host.attachShadow({ mode: 'closed' });
  gsHost = host;
  gsShadow = shadow;

  const style = document.createElement('style');
  style.textContent = GS_STYLES;
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'gs-overlay';

  const box = document.createElement('div');
  box.id = 'gs-box';

  const inputRow = document.createElement('div');
  inputRow.id = 'gs-input-row';

  const engineBtn = document.createElement('button');
  engineBtn.id = 'gs-engine-btn';
  engineBtn.type = 'button';
  engineBtn.title = '选择搜索引擎';
  engineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdownMode === 'engines') hideDropdown();
    else {
      initEngineSelection(jumpData);
      showDropdown('engines');
    }
  });

  const input = document.createElement('input');
  input.id = 'gs-input';
  input.type = 'text';
  input.placeholder = '搜索，或输入 bd / gg / cd / * / ! / /new / /t …';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');

  const escHint = document.createElement('span');
  escHint.id = 'gs-esc-hint';
  escHint.textContent = 'Esc';

  inputRow.appendChild(engineBtn);
  inputRow.appendChild(input);
  inputRow.appendChild(escHint);

  const divider = document.createElement('div');
  divider.id = 'gs-divider';
  divider.className = 'gs-divider';
  divider.style.display = 'none';

  const dropdown = document.createElement('div');
  dropdown.id = 'gs-dropdown';
  dropdown.style.display = 'none';

  const quickLinksPanel = document.createElement('div');
  quickLinksPanel.id = 'gs-quick-links';
  quickLinksPanel.style.display = 'none';

  box.appendChild(inputRow);
  box.appendChild(divider);
  box.appendChild(dropdown);
  overlay.appendChild(box);
  overlay.appendChild(quickLinksPanel);
  shadow.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _hide();
  });

  input.addEventListener('input', async (e) => {
    const value = e.target.value.trim();

    selectedBookmarkIndex   = -1;
    currentBookmarkResults  = [];
    selectedTabIndex        = -1;
    currentTabResults       = [];
    selectedSuggestionIndex = -1;
    syncEngineBtnFromInput();

    if (!value) {
      hideDropdown();
      showQuickLinksPanel();
      return;
    }

    hideQuickLinksPanel();

    if (value.startsWith('*')) {
      if (suggestTimer) clearTimeout(suggestTimer);
      const q = value.slice(1).trim();
      if (q) { currentBookmarkResults = await searchBookmarks(q); showDropdown('bookmarks'); }
      else hideDropdown();
      return;
    }

    const slashCmd = parseSlashCommand(value);
    if (slashCmd) {
      if (suggestTimer) clearTimeout(suggestTimer);
      if (slashCmd.type === 'tab-search') {
        currentTabResults = await searchTabs(slashCmd.query);
        selectedTabIndex = -1;
        showDropdown('tabs');
      } else {
        showDropdown('slash-hint', slashCmd);
      }
      return;
    }

    if (value === 'cd' || value.startsWith('cd ')) {
      if (suggestTimer) clearTimeout(suggestTimer);
      const filter = value.split(/\s+/)[1] || '';
      if (dropdownMode !== 'engines') initEngineSelection(getFilteredEngines(filter));
      else {
        const list = getFilteredEngines(filter);
        if (selectedEngineIndex >= list.length) selectedEngineIndex = Math.max(0, list.length - 1);
      }
      showDropdown('engines');
      return;
    }

    const { engineKey, query } = parseInputQuery(value);
    currentSearchQuery = query;
    if (suggestTimer) clearTimeout(suggestTimer);
    if (query.length >= 1) {
      suggestTimer = setTimeout(() => fetchSuggestions(query, engineKey), 220);
    } else {
      hideDropdown();
    }
  });

  // 部分环境下 input 事件不稳定，keyup 再同步一次图标
  input.addEventListener('keyup', () => {
    syncEngineBtnFromInput();
  });
  input.addEventListener('compositionend', () => {
    syncEngineBtnFromInput();
  });

  input.addEventListener('keydown', (e) => {
    if (dropdownMode === 'engines') {
      handleKeyNavigation(e);
      return;
    }

    if (input.value.trim().startsWith('*') || dropdownMode === 'tabs') {
      handleKeyNavigation(e);
      if (e.key === 'Enter' && !currentBookmarkResults.length && dropdownMode !== 'tabs') e.preventDefault();
      return;
    }

    if (dropdownMode === 'suggestions' && currentSuggestions.length > 0) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const len = currentSuggestions.length;
        if (e.key === 'ArrowUp') {
          selectedSuggestionIndex = selectedSuggestionIndex <= 0 ? len - 1 : selectedSuggestionIndex - 1;
        } else {
          selectedSuggestionIndex = selectedSuggestionIndex >= len - 1 ? 0 : selectedSuggestionIndex + 1;
        }
        fillSuggestionValue(currentSuggestions[selectedSuggestionIndex]);
        gs$$('.gs-sug-item').forEach((el, i) => {
          el.classList.toggle('selected', i === selectedSuggestionIndex);
          if (i === selectedSuggestionIndex) {
            let hint = el.querySelector('.gs-sug-enter');
            if (!hint) {
              hint = document.createElement('span');
              hint.className = 'gs-sug-enter';
              hint.textContent = '↵';
              el.appendChild(hint);
            }
          } else {
            el.querySelector('.gs-sug-enter')?.remove();
          }
        });
        scrollToSelectedSuggestion();
        return;
      }

      if (e.key === 'ArrowRight' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        fillSuggestionValue(currentSuggestions[selectedSuggestionIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      const content = input.value.trim();
      const parts = content.split(' ');
      const isCd  = parts[0] === 'cd' && parts.length <= 2;
      const slashCmd = parseSlashCommand(content);

      if (slashCmd) {
        executeSlashCommand(slashCmd).then((ok) => {
          if (ok) {
            input.value = '';
            hideDropdown();
            selectedTabIndex = -1;
            _hide();
          }
        });
        return;
      }

      if (dropdownMode === 'suggestions' && selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
        jumpTo(suggestionEngineKey || defaultKey, currentSuggestions[selectedSuggestionIndex]);
      } else {
        if (hasDefaultEngineFilterPrefix(content)) jumpTo(defaultKey, stripDefaultEngineFilterPrefix(content));
        else if (content.includes(' ')) { const [a, b] = segmentationContent(' ', content); jumpTo(a, b); }
        else jumpTo(defaultKey, content);
      }
      input.value = '';
      hideDropdown();
      selectedSuggestionIndex = -1;
      if (!isCd) _hide();
    }
  });

  box.addEventListener('click', (e) => e.stopPropagation());

  const _show = () => {
    host.style.pointerEvents = 'auto';
    overlay.style.display = 'flex';
    overlay.offsetHeight;
    overlay.classList.add('show');
    box.classList.add('show');
    updateEngineBtn();
    showQuickLinksPanel();
    setTimeout(() => { input.focus(); input.select(); }, 40);
  };

  animateHide = _hide;
  function _hide() {
    overlay.classList.remove('show');
    box.classList.remove('show');
    setTimeout(() => {
      overlay.style.display = 'none';
      host.style.pointerEvents = 'none';
      input.value = '';
      hideQuickLinksPanel();
      hideDropdown();
    }, 280);
  }

  return { host, show: _show, hide: _hide };
};

// ─── 显示搜索框 ──────────────────────────────────────────
let searchElements = null;

const isSearchVisible = () => {
  const overlay = gs$('#gs-overlay');
  return !!(overlay && overlay.style.display === 'flex');
};

const showSearchBox = () => {
  if (!searchElements) {
    searchElements = createSearchContainer();
    if (searchElements) {
      (document.documentElement || document.body).appendChild(searchElements.host);
    }
  }
  if (searchElements) searchElements.show();
};

// ─── 全局 Escape 和 Alt+S ───────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isSearchVisible()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (dropdownMode) hideDropdown();
      else if (animateHide) animateHide();
    }
  } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (isSearchVisible()) {
      if (animateHide) animateHide();
    } else {
      showSearchBox();
    }
  }
}, true);

// ─── jumpData 迁移（与 src/utils/jumpDataMigration.ts 保持同步）────────
const INJECT_PROMPT_QUERY_KEY = '_lp_q';

function migrateInjectJumpUrl(jumpUrl, injectPrompt) {
  if (!jumpUrl || injectPrompt !== true) return jumpUrl;
  if (!/[?&](q|p)=&<query>/i.test(jumpUrl)) return jumpUrl;
  if (jumpUrl.includes(`${INJECT_PROMPT_QUERY_KEY}=&<query>`)) return jumpUrl;
  return jumpUrl.replace(/([?&])(q|p)=&<query>/gi, `$1${INJECT_PROMPT_QUERY_KEY}=&<query>`);
}

function migrateJumpDataEngines(engines) {
  let changed = false;
  const migrated = engines.map((engine) => {
    const jumpUrl = migrateInjectJumpUrl(engine.jumpUrl, engine.injectPrompt === true);
    if (jumpUrl !== engine.jumpUrl) {
      changed = true;
      return { ...engine, jumpUrl };
    }
    return engine;
  });
  return { engines: migrated, changed };
}

// ─── jumpData 同步 ───────────────────────────────────────
function applyJumpData(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!Array.isArray(data) || data.length === 0) {
    data = defaultJumpData;
  }
  const { engines, changed } = migrateJumpDataEngines(data);
  jumpData = engines;
  jumpToData = new Map();
  jumpData.forEach((d) => (d.key || []).forEach((k) => { if (k) jumpToData.set(k, d); }));
  if (!jumpToData.has(defaultKey) && jumpData[0]?.key?.[0]) {
    defaultKey = jumpData[0].key[0];
  }
  engineBtnKey = '';
  updateEngineBtn();
  preloadEngineFavicons();
  if (dropdownMode === 'engines') {
    const dd = gs$('#gs-dropdown');
    if (dd) showDropdown('engines');
  }
  if (changed) {
    storage.set('jumpData', JSON.stringify(jumpData)).catch(() => {});
  }
}

// ─── 消息监听 ────────────────────────────────────────────
if (isExtensionEnvironment) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'SHOW_SEARCH') {
      showSearchBox();
    } else if (request.action === 'UPDATE_JUMP_DATA') {
      applyJumpData(request.data);
    }
  });

  // 设置页写入 storage 后即时同步（无需刷新）
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.jumpData) {
      applyJumpData(changes.jumpData.newValue);
    }
    if (changes.defaultKey && typeof changes.defaultKey.newValue === 'string') {
      defaultKey = changes.defaultKey.newValue;
      if (!jumpToData.has(defaultKey) && jumpData[0]?.key?.[0]) {
        defaultKey = jumpData[0].key[0];
      }
      updateEngineBtn();
    }
    if (changes.quickLinks || changes.quickLinkGroups || changes.showQuickLinks) {
      applyQuickLinks(
        changes.quickLinks ? changes.quickLinks.newValue : quickLinks,
        changes.quickLinkGroups ? changes.quickLinkGroups.newValue : quickLinkGroups,
        changes.showQuickLinks ? changes.showQuickLinks.newValue : showQuickLinks
      );
    }
  });
}

// ─── 跳转 ────────────────────────────────────────────────
let lastOpenUrl = '';
let lastOpenAt = 0;

function openOnce(url) {
  const now = Date.now();
  if (url === lastOpenUrl && now - lastOpenAt < 600) return false;
  lastOpenUrl = url;
  lastOpenAt = now;
  return true;
}

async function jumpTo(jumpType, toData) {
  if (!jumpType) jumpType = defaultKey;
  if (jumpType === 'cd') {
    if (jumpToData.has(toData)) {
      defaultKey = toData;
      await storage.set('defaultKey', toData);
      updateEngineBtn();
    }
    return;
  }
  const engine = jumpToData.get(jumpType);
  let url = '';
  if (engine) {
    url = buildSearchUrl(engine.jumpUrl, toData);
  } else {
    const def = jumpToData.get(defaultKey);
    if (def) {
      url = buildSearchUrl(def.jumpUrl, jumpType + (toData ? ' ' + toData : ''));
    }
  }
  if (!url || !openOnce(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── 初始化 ──────────────────────────────────────────────
async function init() {
  try {
    const [savedKey, savedData, savedQuickLinks, savedQuickLinkGroups, savedQuickLinksVisibility] = await Promise.all([
      storage.get('defaultKey'),
      storage.get('jumpData'),
      storage.get('quickLinks'),
      storage.get('quickLinkGroups'),
      storage.get('showQuickLinks'),
    ]);

    defaultKey = savedKey || 'bd';
    applyJumpData(savedData);
    applyQuickLinks(savedQuickLinks, savedQuickLinkGroups, savedQuickLinksVisibility);

    if (!savedKey)  await storage.set('defaultKey', 'bd');
    if (!savedData) await storage.set('jumpData', defaultJumpData);
  } catch (e) {
    applyJumpData(null);
    console.error('Content script init error:', e);
  }
}

init();

} // end of window.__gsExtInit guard
