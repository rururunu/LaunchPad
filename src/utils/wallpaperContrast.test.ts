import { describe, expect, it } from 'vitest'
import { wallpaperIconColor } from './wallpaperContrast'

describe('wallpaper icon contrast', () => {
  it('uses black on light backgrounds and white on dark backgrounds', () => {
    expect(wallpaperIconColor(new Uint8ClampedArray([255, 255, 255, 255]))).toBe('#000000')
    expect(wallpaperIconColor(new Uint8ClampedArray([20, 20, 20, 255]))).toBe('#ffffff')
  })
  it('accounts for the wallpaper dimming layer', () => {
    const gray = new Uint8ClampedArray([125, 125, 125, 255])
    expect(wallpaperIconColor(gray)).toBe('#000000')
    expect(wallpaperIconColor(gray, true)).toBe('#ffffff')
  })
  it('uses perceived brightness for saturated wallpaper colors', () => {
    expect(wallpaperIconColor(new Uint8ClampedArray([255, 255, 0, 255]))).toBe('#000000')
    expect(wallpaperIconColor(new Uint8ClampedArray([0, 0, 255, 255]))).toBe('#ffffff')
  })
})
