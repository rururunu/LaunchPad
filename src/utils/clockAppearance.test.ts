import { expect, it } from 'vitest'
import { normalizeDateFontSize } from './clockAppearance'

it('keeps existing date size for old or invalid configurations', () => {
  for (const value of [undefined, null, NaN, Infinity, '24']) {
    expect(normalizeDateFontSize(value)).toBe(14)
  }
})
it('limits imported date sizes while allowing independent sizing', () => {
  expect(normalizeDateFontSize(24)).toBe(24)
  expect(normalizeDateFontSize(0)).toBe(10)
  expect(normalizeDateFontSize(100)).toBe(40)
  expect(normalizeDateFontSize(18.6)).toBe(19)
})
