/**
 * 搜索引擎预设与默认列表
 * jumpUrl 中用 &<query> 作为查询词占位符（会被 encodeURIComponent 替换）
 *
 * 收录原则：优先有稳定 OpenSearch / 公开搜索页的站点；
 * 聊天页无可靠 query 参数、强依赖登录或极易 429 的不作为默认项。
 */

export interface SearchEngine {
  key: string[];
  label: string;
  jumpUrl: string;
  /** 仅用于图标（jumpUrl 域名与图标站点不一致时，如 Google site:github.com） */
  iconUrl?: string;
  /**
   * 对话页填词：打开带 ?_lp_q= 的链接后，由扩展把关键词写入页面输入框。
   * 适用于官网不支持搜索深链的 AI / 自定义站点。
   */
  injectPrompt?: boolean;
  /** 分组：便于设置页展示 */
  group?: 'general' | 'cn' | 'dev' | 'ai' | 'media';
}

/** 将模板中的 &<query> 替换为编码后的查询词 */
/** 扩展专用 URL 参数，避免与各站点自身的 q= 冲突导致页面卡死 */
export const INJECT_PROMPT_QUERY_KEY = '_lp_q';

export function buildSearchUrl(template: string, query: string): string {
  const encoded = encodeURIComponent(query ?? '');
  if (template.includes('&<query>')) {
    return template.replace('&<query>', encoded);
  }
  return template.replace('<query>', encoded);
}

/** 完整预设目录（设置页可一键添加） */
export const PRESET_SEARCH_ENGINES: SearchEngine[] = [
  // ── 通用 ──
  {
    key: ['gg', 'google'],
    label: 'Google',
    jumpUrl: 'https://www.google.com/search?q=&<query>',
    group: 'general',
  },
  {
    key: ['bi', 'bing'],
    label: 'Bing 必应',
    jumpUrl: 'https://www.bing.com/search?q=&<query>&mkt=zh-CN',
    group: 'general',
  },
  {
    key: ['ddg', 'duck'],
    label: 'DuckDuckGo',
    jumpUrl: 'https://duckduckgo.com/?q=&<query>',
    group: 'general',
  },
  {
    key: ['br', 'brave'],
    label: 'Brave Search',
    jumpUrl: 'https://search.brave.com/search?q=&<query>',
    group: 'general',
  },
  {
    key: ['eco', 'ecosia'],
    label: 'Ecosia',
    jumpUrl: 'https://www.ecosia.org/search?q=&<query>',
    group: 'general',
  },
  {
    key: ['yh', 'yahoo'],
    label: 'Yahoo',
    jumpUrl: 'https://search.yahoo.com/search?p=&<query>',
    group: 'general',
  },
  {
    key: ['sp', 'startpage'],
    label: 'Startpage',
    jumpUrl: 'https://www.startpage.com/sp/search?query=&<query>',
    group: 'general',
  },
  {
    key: ['qw', 'qwant'],
    label: 'Qwant',
    jumpUrl: 'https://www.qwant.com/?q=&<query>',
    group: 'general',
  },
  {
    key: ['ya', 'yandex'],
    label: 'Yandex',
    jumpUrl: 'https://yandex.com/search/?text=&<query>',
    group: 'general',
  },
  {
    key: ['img', 'gimg'],
    label: 'Google 图片',
    jumpUrl: 'https://www.google.com/search?tbm=isch&q=&<query>',
    group: 'general',
  },
  {
    key: ['map', 'gmap'],
    label: 'Google 地图',
    jumpUrl: 'https://www.google.com/maps/search/&<query>',
    group: 'general',
  },

  // ── 国内 ──
  {
    key: ['bd', 'baidu'],
    label: '百度',
    jumpUrl: 'https://www.baidu.com/s?ie=utf-8&wd=&<query>',
    group: 'cn',
  },
  {
    key: ['sg', 'sogou'],
    label: '搜狗',
    jumpUrl: 'https://www.sogou.com/web?query=&<query>',
    group: 'cn',
  },
  {
    key: ['so', '360'],
    label: '360 搜索',
    jumpUrl: 'https://www.so.com/s?q=&<query>',
    group: 'cn',
  },
  {
    key: ['tt', 'toutiao'],
    label: '头条搜索',
    jumpUrl: 'https://so.toutiao.com/search?keyword=&<query>',
    group: 'cn',
  },
  {
    key: ['sm', 'shenma'],
    label: '神马搜索',
    jumpUrl: 'https://m.sm.cn/s?q=&<query>',
    group: 'cn',
  },
  {
    key: ['csdn'],
    label: 'CSDN',
    jumpUrl: 'https://so.csdn.net/so/search?q=&<query>',
    group: 'cn',
  },
  {
    key: ['jj', 'juejin'],
    label: '掘金',
    jumpUrl: 'https://juejin.cn/search?query=&<query>',
    group: 'cn',
  },
  {
    key: ['sf', 'segmentfault'],
    label: 'SegmentFault',
    jumpUrl: 'https://segmentfault.com/search?q=&<query>',
    group: 'cn',
  },

  // ── AI（需支持 URL 带查询词） ──
  {
    key: ['pp', 'perplexity'],
    label: 'Perplexity',
    jumpUrl: 'https://www.perplexity.ai/search?q=&<query>',
    group: 'ai',
  },
  {
    key: ['ph', 'phind'],
    label: 'Phind',
    jumpUrl: 'https://www.phind.com/search?q=&<query>',
    group: 'ai',
  },
  {
    key: ['yt', 'you'],
    label: 'You.com',
    jumpUrl: 'https://you.com/search?q=&<query>',
    group: 'ai',
  },
  {
    key: ['gpt', 'chatgpt'],
    label: 'ChatGPT',
    jumpUrl: `https://chatgpt.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },
  {
    key: ['gm', 'gemini'],
    label: 'Gemini',
    jumpUrl: `https://gemini.google.com/app?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },
  {
    key: ['cl', 'claude'],
    label: 'Claude',
    jumpUrl: `https://claude.ai/new?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },
  {
    key: ['kf', 'kimi'],
    label: 'Kimi',
    // Kimi 不识别搜索参数；使用扩展专用 _lp_q，由页面内填词发送
    jumpUrl: `https://www.kimi.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },
  {
    key: ['ds', 'deepseek'],
    label: 'DeepSeek',
    jumpUrl: `https://chat.deepseek.com/?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },
  {
    key: ['dbb', 'doubao'],
    label: '豆包',
    jumpUrl: `https://www.doubao.com/chat/?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },
  {
    key: ['ty', 'tongyi'],
    label: '通义千问',
    jumpUrl: `https://www.tongyi.com/qianwen/?${INJECT_PROMPT_QUERY_KEY}=&<query>`,
    injectPrompt: true,
    group: 'ai',
  },

  // ── 开发 ──
  // GitHub 网页搜索对未登录 / 共享出口 IP 极易 secondary rate limit（429）
  // 使用官方 OpenSearch 参数；仍可能限流，故不放入默认列表
  {
    key: ['gh', 'github'],
    label: 'GitHub',
    jumpUrl: 'https://github.com/search?q=&<query>&ref=opensearch',
    group: 'dev',
  },
  // 通过 Google 搜 GitHub，避开 GitHub 搜索限流
  {
    key: ['ghg', 'githubg'],
    label: 'GitHub (Google)',
    jumpUrl: 'https://www.google.com/search?q=site%3Agithub.com+&<query>',
    iconUrl: 'https://github.com/',
    group: 'dev',
  },
  {
    key: ['sover', 'stackoverflow'],
    label: 'Stack Overflow',
    jumpUrl: 'https://stackoverflow.com/search?q=&<query>',
    group: 'dev',
  },
  {
    key: ['mdn'],
    label: 'MDN',
    jumpUrl: 'https://developer.mozilla.org/zh-CN/search?q=&<query>',
    group: 'dev',
  },
  {
    key: ['npm'],
    label: 'npm',
    jumpUrl: 'https://www.npmjs.com/search?q=&<query>',
    group: 'dev',
  },
  {
    key: ['cs', 'caniuse'],
    label: 'Can I Use',
    jumpUrl: 'https://caniuse.com/?search=&<query>',
    group: 'dev',
  },
  {
    key: ['gsc', 'scholar'],
    label: 'Google Scholar',
    jumpUrl: 'https://scholar.google.com/scholar?q=&<query>',
    group: 'dev',
  },
  {
    key: ['crate', 'crates'],
    label: 'crates.io',
    jumpUrl: 'https://crates.io/search?q=&<query>',
    group: 'dev',
  },
  {
    key: ['py', 'pypi'],
    label: 'PyPI',
    jumpUrl: 'https://pypi.org/search/?q=&<query>',
    group: 'dev',
  },
  {
    key: ['dk', 'docker'],
    label: 'Docker Hub',
    jumpUrl: 'https://hub.docker.com/search?q=&<query>',
    group: 'dev',
  },
  {
    key: ['go', 'godoc'],
    label: 'pkg.go.dev',
    jumpUrl: 'https://pkg.go.dev/search?q=&<query>',
    group: 'dev',
  },
  {
    key: ['hf', 'huggingface'],
    label: 'Hugging Face',
    jumpUrl: 'https://huggingface.co/search/full-text?q=&<query>',
    group: 'dev',
  },
  {
    key: ['ico', 'iconify'],
    label: 'Iconify',
    jumpUrl: 'https://icon-sets.iconify.design/?query=&<query>',
    group: 'dev',
  },

  // ── 内容 / 媒体 ──
  {
    key: ['wk', 'wiki'],
    label: '维基百科',
    jumpUrl: 'https://zh.wikipedia.org/w/index.php?search=&<query>',
    group: 'media',
  },
  {
    key: ['wke', 'wikipedia'],
    label: 'Wikipedia',
    jumpUrl: 'https://en.wikipedia.org/w/index.php?search=&<query>',
    group: 'media',
  },
  {
    key: ['bl', 'bilibili'],
    label: '哔哩哔哩',
    jumpUrl: 'https://search.bilibili.com/all?keyword=&<query>',
    group: 'media',
  },
  {
    key: ['zh', 'zhihu'],
    label: '知乎',
    jumpUrl: 'https://www.zhihu.com/search?type=content&q=&<query>',
    group: 'media',
  },
  {
    key: ['db', 'douban'],
    label: '豆瓣',
    jumpUrl: 'https://www.douban.com/search?q=&<query>',
    group: 'media',
  },
  {
    key: ['ytb', 'youtube'],
    label: 'YouTube',
    jumpUrl: 'https://www.youtube.com/results?search_query=&<query>',
    group: 'media',
  },
  {
    key: ['rd', 'reddit'],
    label: 'Reddit',
    jumpUrl: 'https://www.reddit.com/search/?q=&<query>',
    group: 'media',
  },
  {
    key: ['x', 'twitter'],
    label: 'X (Twitter)',
    jumpUrl: 'https://x.com/search?q=&<query>',
    group: 'media',
  },
  {
    key: ['qr', 'quora'],
    label: 'Quora',
    jumpUrl: 'https://www.quora.com/search?q=&<query>',
    group: 'media',
  },
  {
    key: ['st', 'steam'],
    label: 'Steam',
    jumpUrl: 'https://store.steampowered.com/search/?term=&<query>',
    group: 'media',
  },
  {
    key: ['wa', 'wolfram'],
    label: 'Wolfram Alpha',
    jumpUrl: 'https://www.wolframalpha.com/input?i=&<query>',
    group: 'media',
  },
  {
    key: ['arc', 'archive'],
    label: 'Internet Archive',
    jumpUrl: 'https://web.archive.org/web/*/&<query>',
    group: 'media',
  },
  {
    key: ['v2', 'v2ex'],
    label: 'V2EX',
    jumpUrl: 'https://www.google.com/search?q=site%3Av2ex.com+&<query>',
    iconUrl: 'https://www.v2ex.com/',
    group: 'media',
  },
];

export const ENGINE_GROUP_LABELS: Record<NonNullable<SearchEngine['group']>, string> = {
  general: '通用搜索',
  cn: '国内搜索',
  ai: 'AI 搜索',
  dev: '开发者',
  media: '内容社区',
};

/** 首次安装 / 恢复默认：仅四大通用引擎，其余从预设手动添加 */
export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  PRESET_SEARCH_ENGINES.find((e) => e.key[0] === 'bd')!,
  PRESET_SEARCH_ENGINES.find((e) => e.key[0] === 'gg')!,
  PRESET_SEARCH_ENGINES.find((e) => e.key[0] === 'ddg')!,
  PRESET_SEARCH_ENGINES.find((e) => e.key[0] === 'bi')!,
];

export function cloneEngine(engine: SearchEngine): SearchEngine {
  return {
    key: [...engine.key],
    label: engine.label,
    jumpUrl: engine.jumpUrl,
    iconUrl: engine.iconUrl,
    injectPrompt: engine.injectPrompt,
    group: engine.group,
  };
}

/** 从 jumpUrl 提取用于填词匹配的主机名（去掉 www.） */
export function getEngineHost(jumpUrl: string): string {
  try {
    return new URL(jumpUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
