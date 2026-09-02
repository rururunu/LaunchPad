/**
 * LaunchPad 命令解析（供 omnibox / background 使用，与 src/utils/searchCommands.ts 保持同步）
 */
(function (global) {
  const DEFAULT_ENGINE_FILTER_PREFIX = '!';

  function buildSearchUrl(template, query) {
    const encoded = encodeURIComponent(query ?? '');
    if (template.includes('&<query>')) return template.replace('&<query>', encoded);
    return template.replace('<query>', encoded);
  }

  function hasDefaultEngineFilterPrefix(value) {
    return String(value || '').trim().startsWith(DEFAULT_ENGINE_FILTER_PREFIX);
  }

  function stripDefaultEngineFilterPrefix(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed.startsWith(DEFAULT_ENGINE_FILTER_PREFIX)) return trimmed;
    return trimmed.slice(DEFAULT_ENGINE_FILTER_PREFIX.length).trimStart();
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

  function parseInputQuery(value, jumpToData, defaultKey) {
    if (hasDefaultEngineFilterPrefix(value)) {
      return { engineKey: defaultKey, query: stripDefaultEngineFilterPrefix(value) };
    }
    const keys = [...jumpToData.keys()].sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (value === key || value === key + ' ') return { engineKey: key, query: '' };
      if (value.startsWith(key + ' ')) {
        return { engineKey: key, query: value.slice(key.length + 1).trim() };
      }
    }
    return { engineKey: defaultKey, query: value };
  }

  function segmentationContent(medium, content) {
    const [first, ...rest] = content.split(medium);
    return [first, rest.join(' ')];
  }

  function buildJumpToData(jumpData) {
    const map = new Map();
    (jumpData || []).forEach((engine) => {
      (engine.key || []).forEach((k) => {
        if (k) map.set(k, engine);
      });
    });
    return map;
  }

  function resolveSearchUrl(jumpType, query, jumpToData, defaultKey) {
    if (!jumpType) jumpType = defaultKey;
    const engine = jumpToData.get(jumpType);
    if (engine) return buildSearchUrl(engine.jumpUrl, query);
    const def = jumpToData.get(defaultKey);
    if (def) return buildSearchUrl(def.jumpUrl, jumpType + (query ? ' ' + query : ''));
    return '';
  }

  global.LPCommands = {
    DEFAULT_ENGINE_FILTER_PREFIX,
    buildSearchUrl,
    hasDefaultEngineFilterPrefix,
    stripDefaultEngineFilterPrefix,
    parseSlashCommand,
    parseInputQuery,
    segmentationContent,
    buildJumpToData,
    resolveSearchUrl,
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
