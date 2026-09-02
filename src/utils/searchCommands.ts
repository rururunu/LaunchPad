/** 强制使用默认引擎搜索，避免首词被识别为引擎前缀 */
export const DEFAULT_ENGINE_FILTER_PREFIX = '!';

export function hasDefaultEngineFilterPrefix(value: string): boolean {
  return value.trim().startsWith(DEFAULT_ENGINE_FILTER_PREFIX);
}

export function stripDefaultEngineFilterPrefix(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith(DEFAULT_ENGINE_FILTER_PREFIX)) return value;
  return trimmed.slice(DEFAULT_ENGINE_FILTER_PREFIX.length).trimStart();
}

export type SlashCommand =
  | { type: 'new' }
  | { type: 'tab-index'; index: number }
  | { type: 'tab-search'; query: string };

/** 解析 / 开头的标签页命令；无法识别时返回 null */
export function parseSlashCommand(value: string): SlashCommand | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;

  if (trimmed === '/new') return { type: 'new' };

  const tabIndexMatch = trimmed.match(/^\/t(\d+)$/i);
  if (tabIndexMatch) {
    const index = parseInt(tabIndexMatch[1], 10);
    if (index >= 1) return { type: 'tab-index', index };
  }

  const tabSearchMatch = trimmed.match(/^\/t(?:\s+(.+))?$/i);
  if (tabSearchMatch) {
    return { type: 'tab-search', query: (tabSearchMatch[1] || '').trim() };
  }

  return null;
}

export function isSlashCommand(value: string): boolean {
  return parseSlashCommand(value) !== null;
}
