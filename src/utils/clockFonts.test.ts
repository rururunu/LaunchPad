import { describe, expect, it } from 'vitest'
import { CLOCK_FONTS, clockFontFamily } from './clockFonts'

describe('clock fonts', () => {
  it('keeps generic families unquoted and quotes downloadable faces', () => {
    expect(clockFontFamily('system-ui')).toBe('system-ui')
    expect(clockFontFamily('ui-serif')).toBe('ui-serif')
    expect(clockFontFamily('Inter')).toBe("'Inter', sans-serif")
    expect(clockFontFamily('Bodoni Moda')).toBe("'Bodoni Moda', ui-serif")
    expect(clockFontFamily('Space Mono')).toBe("'Space Mono', ui-monospace")
    expect(clockFontFamily('Pacifico')).toBe("'Pacifico', cursive")
    expect(clockFontFamily('Unknown Face')).toBe("'Unknown Face', sans-serif")
  })

  it('uses a unique id for every face', () => {
    expect(new Set(CLOCK_FONTS.map((font) => font.id)).size).toBe(CLOCK_FONTS.length)
    expect(CLOCK_FONTS.filter((font) => font.group === 'system').every((font) => !font.google)).toBe(true)
    expect(CLOCK_FONTS.filter((font) => font.group !== 'system').every((font) => font.google)).toBe(true)
  })
})