/**
 * 多壁纸源解析
 * 支持直接图片链接与 API 源（Wallhaven / Bing 等）
 * 按当前屏幕分辨率限制最小尺寸，避免拿到过小/比例不合的壁纸
 * @see https://wallhaven.cc/help/api
 */
import { buildExcludeKeySet, pickRandomExcluding } from '@/utils/wallpaperPick';

export type WallpaperSourceId =
  | 'picsum'
  | 'bing'
  | 'wallhaven-random'
  | 'wallhaven-toplist'
  | 'custom';

export type WallpaperSourceKind = 'direct' | 'api';

export interface WallpaperSourceMeta {
  id: WallpaperSourceId;
  name: string;
  description: string;
  kind: WallpaperSourceKind;
  /** 官网 / 说明链接 */
  homepage?: string;
  /** direct 源的基础 URL（解析时会附加随机参数） */
  baseUrl?: string;
}

export interface ResolveWallpaperOptions {
  /** 自定义图片 URL（仅 custom） */
  customUrl?: string;
  /** Wallhaven 搜索关键词 */
  wallhavenQuery?: string;
  /** Wallhaven API Key（可选，提高额度；SFW 可不填） */
  wallhavenApiKey?: string;
  /** 是否允许 Wallhaven 返回 NSFW 内容（需要 API Key） */
  wallhavenNsfw?: boolean;
  /** 最近已展示过的壁纸 URL，随机时尽量避开 */
  excludeUrls?: string[];
}

export interface ScreenResolution {
  width: number;
  height: number;
  /** Wallhaven atleast 参数，如 1920x1080 */
  atleast: string;
  /** 接近的宽高比，如 16x9 */
  ratio: string;
}

export const WALLPAPER_SOURCES: WallpaperSourceMeta[] = [
  {
    id: 'picsum',
    name: 'Picsum',
    description: '随机高质量照片',
    kind: 'direct',
    homepage: 'https://picsum.photos',
    baseUrl: 'https://picsum.photos/1920/1080',
  },
  {
    id: 'bing',
    name: '必应每日',
    description: '每日精选壁纸',
    kind: 'api',
    homepage: 'https://www.bing.com',
  },
  {
    id: 'wallhaven-random',
    name: 'Wallhaven',
    description: '随机 SFW 壁纸',
    kind: 'api',
    homepage: 'https://wallhaven.cc',
  },
  {
    id: 'wallhaven-toplist',
    name: 'Wallhaven 热门',
    description: '本月热门精选',
    kind: 'api',
    homepage: 'https://wallhaven.cc/toplist',
  },
  {
    id: 'custom',
    name: '自定义链接',
    description: '使用图片 URL',
    kind: 'direct',
  },
];

export const DEFAULT_WALLPAPER_SOURCE_ID: WallpaperSourceId = 'picsum';

/** 常用桌面分辨率档位（向上取最接近且不小于屏幕的档） */
const RESOLUTION_STEPS = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
] as const;

const RATIO_PRESETS = [
  { id: '16x9', value: 16 / 9 },
  { id: '16x10', value: 16 / 10 },
  { id: '21x9', value: 21 / 9 },
  { id: '32x9', value: 32 / 9 },
  { id: '4x3', value: 4 / 3 },
] as const;
type RatioPreset = (typeof RATIO_PRESETS)[number];

/**
 * 根据当前屏幕（含 DPR，上限 2）计算目标分辨率
 */
export function getTargetResolution(): ScreenResolution {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080, atleast: '1920x1080', ratio: '16x9' };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const screenW = Math.round((window.screen?.width || 1920) * dpr);
  const screenH = Math.round((window.screen?.height || 1080) * dpr);

  // 取不小于屏幕的最近档位；超大屏封顶 4K
  let step = RESOLUTION_STEPS[RESOLUTION_STEPS.length - 1];
  for (const s of RESOLUTION_STEPS) {
    if (s.width >= screenW && s.height >= screenH) {
      step = s;
      break;
    }
  }

  const width = Math.min(Math.max(screenW, 1280), step.width);
  const height = Math.min(Math.max(screenH, 720), step.height);

  // atleast 用档位，保证 Wallhaven 有足够结果
  const atleast = `${step.width}x${step.height}`;
  const ratio = pickClosestRatio(screenW, screenH);

  return { width, height, atleast, ratio };
}

function pickClosestRatio(w: number, h: number): string {
  if (!w || !h) return '16x9';
  const r = w / h;
  let best: RatioPreset = RATIO_PRESETS[0];
  let bestDiff = Math.abs(r - best.value);
  for (const preset of RATIO_PRESETS) {
    const diff = Math.abs(r - preset.value);
    if (diff < bestDiff) {
      best = preset;
      bestDiff = diff;
    }
  }
  return best.id;
}

export function getWallpaperSourceMeta(id: string): WallpaperSourceMeta {
  return (
    WALLPAPER_SOURCES.find((s) => s.id === id) ??
    WALLPAPER_SOURCES.find((s) => s.id === DEFAULT_WALLPAPER_SOURCE_ID)!
  );
}

function isWallhavenSource(id: string): boolean {
  return id === 'wallhaven-random' || id === 'wallhaven-toplist';
}

/**
 * 解析 Picsum：按屏幕分辨率请求
 */
async function resolvePicsum(target: ScreenResolution, excludeUrls?: string[]): Promise<string> {
  const exclude = buildExcludeKeySet(excludeUrls);
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = `${Date.now()}-${attempt}-${Math.random().toString(36).slice(2, 10)}`;
    const url = `https://picsum.photos/${target.width}/${target.height}?random=${seed}`;
    const res = await fetch(url, {
      redirect: 'follow',
      credentials: 'omit',
    });
    if (!res.ok) throw new Error(`Picsum HTTP ${res.status}`);

    const resolved = res.url && !res.url.includes(`picsum.photos/${target.width}`)
      ? res.url
      : url;

    if (!exclude.has(resolved)) {
      return resolved;
    }
  }

  const fallbackSeed = `${Date.now()}-fallback-${crypto.randomUUID?.() ?? Math.random()}`;
  return `https://picsum.photos/${target.width}/${target.height}?random=${fallbackSeed}`;
}

/**
 * 将 Bing 图片 URL 提升到更合适的分辨率
 */
function preferBingResolution(path: string, target: ScreenResolution): string {
  let url = path.startsWith('http') ? path : `https://www.bing.com${path}`;

  if (target.width >= 2560) {
    // 高分辨率屏优先 UHD
    url = url
      .replace(/_\d+x\d+\./g, '_UHD.')
      .replace(/rf=LaDigue_\d+x\d+/gi, 'rf=LaDigue_UHD');
  } else {
    // 至少 1920x1080
    url = url
      .replace(/_\d+x\d+\./g, '_1920x1080.')
      .replace(/rf=LaDigue_\d+x\d+/gi, 'rf=LaDigue_1920x1080');
  }

  return url;
}

/**
 * 解析 Bing 每日壁纸
 */
async function resolveBing(target: ScreenResolution, excludeUrls?: string[]): Promise<string> {
  const res = await fetch(
    'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN&uhd=1&uhdwidth=3840&uhdheight=2160',
    { credentials: 'omit' }
  );
  if (!res.ok) throw new Error(`Bing HTTP ${res.status}`);
  const data = await res.json();
  const images = data?.images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Bing 未返回壁纸');
  }

  const exclude = buildExcludeKeySet(excludeUrls);
  const toUrl = (pick: { urlbase?: string; url?: string }) => {
    if (pick?.urlbase) {
      const base = pick.urlbase.startsWith('http')
        ? pick.urlbase
        : `https://www.bing.com${pick.urlbase}`;
      if (target.width >= 2560) {
        return `${base}_UHD.jpg&rf=LaDigue_UHD.jpg&pid=hp`;
      }
      return `${base}_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp`;
    }

    const path = pick?.url as string | undefined;
    if (!path) throw new Error('Bing 壁纸地址无效');
    return preferBingResolution(path, target);
  };

  const candidates = images.map((image) => ({
    image,
    url: toUrl(image),
  }));
  const filtered = exclude.size
    ? candidates.filter((item) => !exclude.has(item.url))
    : candidates;
  const pool = filtered.length > 0 ? filtered : candidates;
  return pool[Math.floor(Math.random() * pool.length)].url;
}

type WallhavenItem = {
  path?: string;
  dimension_x?: number;
  dimension_y?: number;
  ratio?: string;
};

/**
 * 过滤掉明显小于目标分辨率的结果
 */
function filterByResolution(
  list: WallhavenItem[],
  target: ScreenResolution
): WallhavenItem[] {
  // 允许略小一点（约 90%），避免结果过少
  const minW = Math.floor(target.width * 0.9);
  const minH = Math.floor(target.height * 0.9);

  const matched = list.filter((item) => {
    const w = Number(item.dimension_x) || 0;
    const h = Number(item.dimension_y) || 0;
    return w >= minW && h >= minH;
  });

  return matched.length > 0 ? matched : list;
}

/**
 * 解析 Wallhaven API → 随机一张 path
 * @see https://wallhaven.cc/api/v1/search
 */
async function resolveWallhaven(
  mode: 'random' | 'toplist',
  options: ResolveWallpaperOptions = {},
  target: ScreenResolution
): Promise<string> {
  const key = options.wallhavenApiKey?.trim();
  const allowNsfw = Boolean(options.wallhavenNsfw && key);
  const params = new URLSearchParams({
    purity: allowNsfw ? '111' : '100',
    categories: '111',
    atleast: target.atleast,
    ratios: target.ratio,
    sorting: mode === 'toplist' ? 'toplist' : 'random',
  });

  if (mode === 'toplist') {
    params.set('topRange', '1M');
  } else {
    params.set(
      'seed',
      Math.random().toString(36).slice(2, 8).replace(/[^a-zA-Z0-9]/g, 'a')
    );
  }

  const q = options.wallhavenQuery?.trim();
  if (q) params.set('q', q);

  if (key) params.set('apikey', key);

  const fetchPage = async (searchParams: URLSearchParams) => {
    const res = await fetch(`https://wallhaven.cc/api/v1/search?${searchParams.toString()}`, {
      credentials: 'omit',
      headers: key ? { 'X-API-Key': key } : undefined,
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('Wallhaven 请求过于频繁，请稍后再试');
      if (res.status === 401) throw new Error('Wallhaven API Key 无效');
      throw new Error(`Wallhaven HTTP ${res.status}`);
    }
    const json = await res.json();
    return (Array.isArray(json?.data) ? json.data : []) as WallhavenItem[];
  };

  let list = await fetchPage(params);

  // 带比例无结果时，放宽 ratios 再试一次（仍保留 atleast）
  if (list.length === 0) {
    const fallback = new URLSearchParams(params);
    fallback.delete('ratios');
    list = await fetchPage(fallback);
  }

  if (list.length === 0) {
    throw new Error(q ? '未找到匹配分辨率的 Wallhaven 壁纸' : 'Wallhaven 未返回合适分辨率的壁纸');
  }

  const suitable = filterByResolution(list, target);
  const exclude = buildExcludeKeySet(options.excludeUrls);
  const item = pickRandomExcluding(suitable, exclude, (entry) => entry.path || '');
  const path = item?.path;
  if (!path) throw new Error('Wallhaven 壁纸地址无效');
  return path;
}

/**
 * 根据源 ID 解析出可直接加载的图片 URL（自动按屏幕限制分辨率）
 */
export async function resolveWallpaperUrl(
  sourceId: string,
  options: ResolveWallpaperOptions = {}
): Promise<string> {
  const id = (sourceId || DEFAULT_WALLPAPER_SOURCE_ID) as WallpaperSourceId;
  const target = getTargetResolution();

  switch (id) {
    case 'picsum':
      return resolvePicsum(target, options.excludeUrls);
    case 'bing':
      return resolveBing(target, options.excludeUrls);
    case 'wallhaven-random':
      return resolveWallhaven('random', options, target);
    case 'wallhaven-toplist':
      return resolveWallhaven('toplist', options, target);
    case 'custom': {
      const url = options.customUrl?.trim();
      if (!url) throw new Error('请填写自定义图片链接');
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('自定义链接需以 http(s):// 开头');
      }
      return url;
    }
    default:
      return resolvePicsum(target);
  }
}

export function isApiWallpaperSource(id: string): boolean {
  return isWallhavenSource(id) || id === 'bing';
}

export function supportsWallhavenQuery(id: string): boolean {
  return isWallhavenSource(id);
}
