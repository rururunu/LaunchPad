// 图标缓存工具 — Favicon 按域名缓存（带时间戳 / TTL）
// 内存 Map + chrome.storage.local / localStorage
import { isChromeStorageAvailable, storage } from './storage';

const FAVICON_CACHE_PREFIX = 'favicon_quality_v2_';
const MAX_MEMORY_ENTRIES = 300;
/** 缓存有效期：7 天，过期后进入标签页会后台重新拉取 */
export const FAVICON_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type FaviconCacheEntry = {
  dataUrl: string;
  fetchedAt: number;
};

// 内存缓存：domain → entry
const memoryCache = new Map<string, FaviconCacheEntry>();

// 正在加载中的请求去重：domain → Promise<dataUrl>
const pendingLoads = new Map<string, Promise<string>>();

export const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const getCacheKey = (domain: string): string => FAVICON_CACHE_PREFIX + domain;

const isStale = (fetchedAt: number, ttlMs: number = FAVICON_TTL_MS): boolean => {
  return !fetchedAt || Date.now() - fetchedAt > ttlMs;
};

/**
 * 兼容旧版纯 dataURL 字符串，以及新版 { dataUrl, fetchedAt }
 */
export const parseEntry = (stored: unknown): FaviconCacheEntry | null => {
  if (typeof stored === 'string' && !stored.startsWith('data:')) {
    try { return parseEntry(JSON.parse(stored)); } catch { return null; }
  }
  if (typeof stored === 'string' && stored.startsWith('data:')) {
    // 旧格式：视为已过期，可先展示再刷新
    return { dataUrl: stored, fetchedAt: 0 };
  }
  if (
    stored &&
    typeof stored === 'object' &&
    typeof (stored as FaviconCacheEntry).dataUrl === 'string' &&
    (stored as FaviconCacheEntry).dataUrl.startsWith('data:')
  ) {
    const e = stored as FaviconCacheEntry;
    return {
      dataUrl: e.dataUrl,
      fetchedAt: typeof e.fetchedAt === 'number' ? e.fetchedAt : 0,
    };
  }
  return null;
};

const getGoogleFaviconUrl = (domain: string, size: number = 256): string => {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
};

const getDefaultFaviconUrl = (url: string): string => {
  try {
    return new URL(url).origin + '/favicon.ico';
  } catch {
    return '';
  }
};

const fetchViaBackground = async (
  pageUrl: string,
  size: number,
  force = false
): Promise<string> => {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('No extension runtime');
  }
  const resp = await chrome.runtime.sendMessage({
    action: 'FETCH_FAVICON',
    url: pageUrl,
    size,
    force,
  });
  if (!resp?.success || !resp.dataUrl) {
    throw new Error(resp?.error || 'favicon fetch failed');
  }
  return resp.dataUrl as string;
};

const fetchAndEncode = async (faviconUrl: string): Promise<string> => {
  const response = await fetch(faviconUrl, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/') || blob.size < 16) throw new Error('Invalid favicon response');
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const tryLoadFavicon = async (
  url: string,
  size: number = 256,
  force = false
): Promise<string> => {
  const domain = getDomain(url);
  if (!domain) throw new Error('Invalid URL');

  try {
    return await fetchViaBackground(url, size, force);
  } catch {
    // continue
  }

  for (const path of ['/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/icon.svg']) {
    try {
      const result = await fetchAndEncode(new URL(path, url).href);
      if (result.startsWith('data:image/svg+xml')) return result;
      const bitmap = await createImageBitmap(await (await fetch(result)).blob());
      const pixels = Math.min(bitmap.width, bitmap.height);
      bitmap.close();
      if (pixels >= 180) return result;
    } catch { /* Origin may not allow cross-origin reads. */ }
  }
  try { return await fetchAndEncode(getGoogleFaviconUrl(domain, 256)); } catch { /* Try origin below. */ }
  const domainSkipOrigin = /(^|\.)github\.com$/i.test(domain);
  if (!domainSkipOrigin) {
    try {
      const direct = getDefaultFaviconUrl(url);
      if (direct) return await fetchAndEncode(direct);
    } catch {
      // continue
    }
  }

  return await fetchAndEncode(getGoogleFaviconUrl(domain, size));
};

const addToMemoryCache = (domain: string, entry: FaviconCacheEntry): void => {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES && !memoryCache.has(domain)) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey !== undefined) memoryCache.delete(firstKey);
  }
  memoryCache.set(domain, entry);
};

const persistEntry = async (domain: string, entry: FaviconCacheEntry): Promise<void> => {
  try {
    await storage.set(getCacheKey(domain), isChromeStorageAvailable() ? entry : JSON.stringify(entry));
  } catch {
    // 配额不足时忽略
  }
};

const readStoredFaviconEntries = async (
  domains: string[]
): Promise<Map<string, FaviconCacheEntry | null>> => {
  const entries = new Map<string, FaviconCacheEntry | null>();
  if (domains.length === 0) return entries;

  if (isChromeStorageAvailable()) {
    const keys = domains.map(getCacheKey);
    const items = await chrome.storage.local.get(keys);
    for (const domain of domains) {
      entries.set(domain, parseEntry(items[getCacheKey(domain)]));
    }
    return entries;
  }

  for (const domain of domains) {
    const raw = localStorage.getItem(getCacheKey(domain));
    if (!raw) {
      entries.set(domain, null);
      continue;
    }

    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
    }
    entries.set(domain, parseEntry(parsed) || parseEntry(raw));
  }

  return entries;
};

/**
 * 获取缓存的 favicon（仅内存，同步）
 */
export const getCachedFavicon = (url: string): string | undefined => {
  const domain = getDomain(url) || url;
  return domain ? memoryCache.get(domain)?.dataUrl : undefined;
};

/**
 * 网络拉取并写入缓存（带时间戳）
 */
const fetchAndStore = async (
  url: string,
  domain: string,
  size: number,
  force: boolean
): Promise<string> => {
  const dataUrl = await tryLoadFavicon(url, size, force);
  if (!dataUrl || !dataUrl.startsWith('data:')) return '';

  const entry: FaviconCacheEntry = { dataUrl, fetchedAt: Date.now() };
  addToMemoryCache(domain, entry);
  await persistEntry(domain, entry);
  return dataUrl;
};

/**
 * 后台静默强制刷新（不阻塞当前展示）
 */
const refreshInBackground = (url: string, size: number): void => {
  const domain = getDomain(url);
  if (!domain || pendingLoads.has(domain)) return;

  const task = (async () => {
    try {
      return await fetchAndStore(url, domain, size, true);
    } catch {
      return memoryCache.get(domain)?.dataUrl || '';
    } finally {
      pendingLoads.delete(domain);
    }
  })();

  pendingLoads.set(domain, task);
};

/**
 * 加载 favicon：优先返回缓存；过期则先返回旧图，再后台刷新
 */
export const loadFavicon = async (
  url: string,
  size: number = 256,
  options?: { force?: boolean }
): Promise<string> => {
  if (!url) return '';

  const domain = getDomain(url);
  if (!domain) return '';

  size = Math.max(256, size);
  const force = options?.force === true;

  // 强制刷新：跳过新鲜缓存
  if (!force) {
    const mem = memoryCache.get(domain);
    if (mem?.dataUrl) {
      if (isStale(mem.fetchedAt)) refreshInBackground(url, size);
      return mem.dataUrl;
    }
  }

  const pending = pendingLoads.get(domain);
  if (pending && !force) return pending;

  const loadPromise = (async (): Promise<string> => {
    try {
      if (!force) {
        const stored = await storage.get<unknown>(getCacheKey(domain));
        const entry = parseEntry(stored);
        if (entry) {
          addToMemoryCache(domain, entry);
          if (isStale(entry.fetchedAt)) {
            refreshInBackground(url, size);
          }
          return entry.dataUrl;
        }
      }

      return await fetchAndStore(url, domain, size, force);
    } catch {
      return memoryCache.get(domain)?.dataUrl || '';
    } finally {
      pendingLoads.delete(domain);
    }
  })();

  pendingLoads.set(domain, loadPromise);
  return loadPromise;
};

/**
 * 批量预加载（不强制刷新，过期会后台更新）
 */
export const preloadFavicons = (urls: string[]): void => {
  for (const url of urls) {
    if (url) loadFavicon(url).catch(() => {});
  }
};

/**
 * 并发池
 */
const runPool = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> => {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      try {
        await worker(current);
      } catch {
        // 单个失败不影响其余
      }
    }
  });
  await Promise.all(runners);
};

/**
 * 进入标签页时：检查收藏夹等 URL 的图标是否缺失/过期，过期则重新获取
 * 不阻塞 UI，可 fire-and-forget
 */
export const refreshStaleFavicons = async (
  urls: string[],
  options?: { ttlMs?: number; concurrency?: number; size?: number }
): Promise<void> => {
  const ttlMs = options?.ttlMs ?? FAVICON_TTL_MS;
  const concurrency = options?.concurrency ?? 4;
  const size = options?.size ?? 256;

  const domainToUrl = new Map<string, string>();
  for (const url of urls) {
    if (!url) continue;
    const domain = getDomain(url);
    if (domain && !domainToUrl.has(domain)) domainToUrl.set(domain, url);
  }
  if (domainToUrl.size === 0) return;

  const staleUrls: string[] = [];
  const storageMisses: Array<[string, string]> = [];

  for (const [domain, url] of domainToUrl) {
    const mem = memoryCache.get(domain);
    if (mem) {
      if (isStale(mem.fetchedAt, ttlMs)) staleUrls.push(url);
      continue;
    }
    storageMisses.push([domain, url]);
  }

  try {
    const storedEntries = await readStoredFaviconEntries(storageMisses.map(([domain]) => domain));
    for (const [domain, url] of storageMisses) {
      const entry = storedEntries.get(domain) ?? null;
      if (!entry) {
        staleUrls.push(url);
        continue;
      }
      addToMemoryCache(domain, entry);
      if (isStale(entry.fetchedAt, ttlMs)) staleUrls.push(url);
    }
  } catch {
    for (const [, url] of storageMisses) {
      staleUrls.push(url);
    }
  }

  if (staleUrls.length === 0) return;

  await runPool(staleUrls, concurrency, async (url) => {
    await loadFavicon(url, size, { force: true });
  });
};

/**
 * 从存储恢复 favicon 到内存（含过期项，便于瞬间展示）
 */
export const hydrateFaviconCache = async (): Promise<void> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const items = await chrome.storage.local.get(null);
      for (const [key, value] of Object.entries(items)) {
        if (!key.startsWith(FAVICON_CACHE_PREFIX)) continue;
        const domain = key.slice(FAVICON_CACHE_PREFIX.length);
        if (!domain || memoryCache.size >= MAX_MEMORY_ENTRIES) continue;
        const entry = parseEntry(value);
        if (entry) memoryCache.set(domain, entry);
      }
    } else {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(FAVICON_CACHE_PREFIX));
      for (const key of keys) {
        if (memoryCache.size >= MAX_MEMORY_ENTRIES) break;
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          let parsed: unknown = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // 可能是旧版纯 dataURL
          }
          const entry = parseEntry(parsed) || parseEntry(raw);
          const domain = key.slice(FAVICON_CACHE_PREFIX.length);
          if (entry && domain) memoryCache.set(domain, entry);
        } catch {}
      }
    }
  } catch {
    // 静默失败
  }
};

/**
 * 清除所有 favicon 缓存
 */
export const clearFaviconCache = async (): Promise<void> => {
  memoryCache.clear();
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const items = await chrome.storage.local.get(null);
      const keys = Object.keys(items).filter((k) => k.startsWith(FAVICON_CACHE_PREFIX));
      if (keys.length) await chrome.storage.local.remove(keys);
    } else {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(FAVICON_CACHE_PREFIX));
      for (const key of keys) localStorage.removeItem(key);
    }
  } catch {}
};

// Cache user-selected remote images by exact source URL, separately from site favicons.
const remoteLoads = new Map<string, Promise<string>>();
export const loadCustomIcon = (url: string): Promise<string> => {
  if (url.startsWith('data:')) return Promise.resolve(url);
  const existing = remoteLoads.get(url);
  if (existing) return existing;
  const task = (async () => {
    const key = 'custom_icon_v1:' + url;
    const entry = parseEntry(await storage.get(key));
    if (entry) return entry.dataUrl;
    try {
      const dataUrl = await fetchAndEncode(url);
      const next = { dataUrl, fetchedAt: Date.now() };
      await storage.set(key, isChromeStorageAvailable() ? next : JSON.stringify(next));
      return dataUrl;
    } catch { return url; } // Remote sites without CORS still render through img.
  })();
  remoteLoads.set(url, task);
  return task;
};
