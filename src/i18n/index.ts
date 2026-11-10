import { computed, ref } from 'vue'
import { storage } from '@/utils/storage'
import { catalogs, type Messages } from './messages'

export const LOCALE_STORAGE_KEY = 'locale'

export const localeOptions = [
  { id: 'system', native: '跟随系统' },
  { id: 'zh-CN', native: '简体中文' },
  { id: 'en', native: 'English' },
] as const

export type LocalePreference = (typeof localeOptions)[number]['id']
export type LocaleId = keyof typeof catalogs

const preference = ref<LocalePreference>('system')

export function resolveLocale(value: LocalePreference, navigatorLanguage = ''): LocaleId {
  if (value === 'zh-CN' || value === 'en') return value
  return navigatorLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || value === 'zh-CN' || value === 'en'
}

export const locale = computed<LocaleId>(() =>
  resolveLocale(preference.value, typeof navigator === 'undefined' ? '' : navigator.language)
)

function lookup(tree: Messages, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in node) return (node as Record<string, unknown>)[key]
    return undefined
  }, tree)
  return typeof value === 'string' ? value : undefined
}

export function translate(active: LocaleId, path: string, params?: Record<string, string | number>): string {
  const template = lookup(catalogs[active], path) ?? lookup(catalogs['zh-CN'], path) ?? path
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params?.[key] ?? `{${key}}`))
}

function applyDocumentLanguage() {
  if (typeof document !== 'undefined') document.documentElement.lang = locale.value
}

let ready: Promise<void> | undefined

export function initI18n(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const stored = await storage.get<string>(LOCALE_STORAGE_KEY)
      if (isLocalePreference(stored)) preference.value = stored
      applyDocumentLanguage()
      storage.onChange(LOCALE_STORAGE_KEY, (changes) => {
        const next = changes[LOCALE_STORAGE_KEY]?.newValue
        if (isLocalePreference(next)) preference.value = next
        applyDocumentLanguage()
      })
    })()
  }
  return ready
}

export async function setLocalePreference(next: LocalePreference) {
  preference.value = next
  applyDocumentLanguage()
  await storage.set(LOCALE_STORAGE_KEY, next)
}

export function useI18n() {
  const t = (path: string, params?: Record<string, string | number>) => translate(locale.value, path, params)
  return { preference, locale, localeOptions, t, setLocalePreference }
}
