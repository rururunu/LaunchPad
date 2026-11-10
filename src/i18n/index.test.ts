import { describe, expect, it } from 'vitest'
import { catalogs } from './messages'
import { resolveLocale, translate } from './index'

function leaves(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key))
}

describe('i18n catalogs', () => {
  it('keeps English and Chinese message keys aligned', () => {
    expect(leaves(catalogs.en).sort()).toEqual(leaves(catalogs['zh-CN']).sort())
  })

  it('resolves the system language and interpolates values', () => {
    expect(resolveLocale('system', 'zh-TW')).toBe('zh-CN')
    expect(resolveLocale('system', 'en-US')).toBe('en')
    expect(resolveLocale('en', 'zh-CN')).toBe('en')
    expect(translate('en', 'quick.openWidget', { title: 'Clock' })).toBe('Open Clock')
    expect(translate('en', 'missing.key')).toBe('missing.key')
  })
})
