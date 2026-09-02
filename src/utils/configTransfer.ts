import { isChromeStorageAvailable, storage } from '@/utils/storage'
import { migrateJumpDataEngines } from '@/utils/jumpDataMigration'

const FORMAT = 'launchpad-config'
const VERSION = 1

const BASIC_KEYS = [
  'themeColor',
  'showTime',
  'showSeconds',
  'showDate',
  'use24Hour',
  'clockFont',
  'clockFontSize',
  'clockFontWeight',
  'useCustomColor',
] as const

const BACKGROUND_KEYS = [
  'wallpaperType',
  'wallpaperUrl',
  'originalWallpaperUrl',
  'sourceUrl',
  'wallpaperSourceId',
  'wallhavenQuery',
  'wallhavenApiKey',
  'wallhavenNsfw',
  'backgroundColor',
  'showMask',
] as const

type JsonObject = Record<string, unknown>

export interface ConfigFile {
  format: typeof FORMAT
  version: typeof VERSION
  exportedAt: string
  settings: {
    basic: JsonObject
    background: JsonObject & { favoriteWallpapers: unknown[] }
    searchEngines: { defaultKey: string; items: unknown[] }
    quickAccess: { visible: boolean; links: unknown[]; groups: unknown[] }
  }
}

export interface ConfigSummary {
  searchEngines: number
  quickLinks: number
  quickLinkGroups: number
  favoriteWallpapers: number
}

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const parseStored = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const parseArray = (value: unknown): unknown[] => {
  const parsed = parseStored(value)
  return Array.isArray(parsed) ? parsed : []
}

const parseObject = (value: unknown): JsonObject => {
  const parsed = parseStored(value)
  return isObject(parsed) ? parsed : {}
}

const pick = (source: JsonObject, keys: readonly string[]): JsonObject => {
  const result: JsonObject = {}
  for (const key of keys) {
    if (key in source) result[key] = source[key]
  }
  return result
}

const isValidSearchEngine = (value: unknown) => {
  if (!isObject(value) || !Array.isArray(value.key) || !value.key.some((key) => typeof key === 'string' && key)) {
    return false
  }
  return typeof value.label === 'string' && typeof value.jumpUrl === 'string'
}

const isValidQuickLink = (value: unknown) =>
  isObject(value) && typeof value.id === 'string' && typeof value.label === 'string' && typeof value.url === 'string'

const isValidQuickGroup = (value: unknown) =>
  isObject(value) && typeof value.id === 'string' && typeof value.label === 'string'

const isValidFavorite = (value: unknown) => isObject(value) && typeof value.url === 'string'

export async function createConfigExport(): Promise<ConfigFile> {
  const [rawAppConfig, rawFavorites, rawEngines, rawDefaultKey, rawLinks, rawGroups, rawVisible] = await Promise.all([
    storage.get('appConfig'),
    storage.get('favoriteWallpapers'),
    storage.get('jumpData'),
    storage.get('defaultKey'),
    storage.get('quickLinks'),
    storage.get('quickLinkGroups'),
    storage.get('showQuickLinks'),
  ])

  const appConfig = parseObject(rawAppConfig)
  const engines = parseArray(rawEngines).filter(isValidSearchEngine)
  const firstEngineKey = isObject(engines[0]) && Array.isArray(engines[0].key) ? engines[0].key[0] : ''

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      basic: pick(appConfig, BASIC_KEYS),
      background: {
        ...pick(appConfig, BACKGROUND_KEYS),
        favoriteWallpapers: parseArray(rawFavorites).filter(isValidFavorite),
      },
      searchEngines: {
        defaultKey: typeof rawDefaultKey === 'string' ? rawDefaultKey : String(firstEngineKey || 'bd'),
        items: engines,
      },
      quickAccess: {
        visible: rawVisible !== false && rawVisible !== 'false',
        links: parseArray(rawLinks).filter(isValidQuickLink),
        groups: parseArray(rawGroups).filter(isValidQuickGroup),
      },
    },
  }
}

export function parseConfigFile(text: string): ConfigFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }

  if (!isObject(parsed) || parsed.format !== FORMAT) {
    throw new Error('这不是 LaunchPad 配置文件')
  }
  if (parsed.version !== VERSION) {
    throw new Error(`不支持的配置版本：${String(parsed.version)}`)
  }
  if (!isObject(parsed.settings)) throw new Error('配置文件缺少 settings')

  const { basic, background, searchEngines, quickAccess } = parsed.settings
  if (!isObject(basic) || !isObject(background) || !isObject(searchEngines) || !isObject(quickAccess)) {
    throw new Error('配置分类不完整')
  }
  if (!Array.isArray(background.favoriteWallpapers) || !background.favoriteWallpapers.every(isValidFavorite)) {
    throw new Error('收藏壁纸数据格式错误')
  }
  if (!Array.isArray(searchEngines.items) || !searchEngines.items.length || !searchEngines.items.every(isValidSearchEngine)) {
    throw new Error('搜索引擎数据格式错误')
  }
  if (typeof searchEngines.defaultKey !== 'string') throw new Error('默认搜索引擎格式错误')
  if (!Array.isArray(quickAccess.links) || !quickAccess.links.every(isValidQuickLink)) {
    throw new Error('快捷访问数据格式错误')
  }
  if (!Array.isArray(quickAccess.groups) || !quickAccess.groups.every(isValidQuickGroup)) {
    throw new Error('快捷访问分组格式错误')
  }
  if (typeof quickAccess.visible !== 'boolean') throw new Error('快捷访问显示状态格式错误')

  return { ...parsed, format: FORMAT } as unknown as ConfigFile
}

export function getConfigSummary(config: ConfigFile): ConfigSummary {
  return {
    searchEngines: config.settings.searchEngines.items.length,
    quickLinks: config.settings.quickAccess.links.length,
    quickLinkGroups: config.settings.quickAccess.groups.length,
    favoriteWallpapers: config.settings.background.favoriteWallpapers.length,
  }
}

export async function importConfig(config: ConfigFile): Promise<void> {
  const currentAppConfig = parseObject(await storage.get('appConfig'))
  const appConfig = {
    ...currentAppConfig,
    ...pick(config.settings.basic, BASIC_KEYS),
    ...pick(config.settings.background, BACKGROUND_KEYS),
  }
  const engines = migrateJumpDataEngines(
    config.settings.searchEngines.items as { jumpUrl: string; injectPrompt?: boolean }[],
  ).engines
  const availableKeys = new Set(
    engines.flatMap((engine) => isObject(engine) && Array.isArray(engine.key) ? engine.key.filter((key): key is string => typeof key === 'string') : [])
  )
  const firstEngine = engines[0] as JsonObject
  const firstKey = Array.isArray(firstEngine.key) && typeof firstEngine.key[0] === 'string' ? firstEngine.key[0] : 'bd'
  const defaultKey = availableKeys.has(config.settings.searchEngines.defaultKey)
    ? config.settings.searchEngines.defaultKey
    : firstKey

  await Promise.all([
    storage.set('appConfig', isChromeStorageAvailable() ? appConfig : JSON.stringify(appConfig)),
    storage.set('favoriteWallpapers', JSON.stringify(config.settings.background.favoriteWallpapers)),
    storage.set('jumpData', JSON.stringify(engines)),
    storage.set('defaultKey', defaultKey),
    storage.set('quickLinks', JSON.stringify(config.settings.quickAccess.links)),
    storage.set('quickLinkGroups', JSON.stringify(config.settings.quickAccess.groups)),
    storage.set('showQuickLinks', String(config.settings.quickAccess.visible)),
  ])
}
