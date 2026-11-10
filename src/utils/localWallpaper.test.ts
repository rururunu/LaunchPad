import { describe, expect, it } from 'vitest'
import { fitWithin, isLocalImageUrl } from './localWallpaper'

describe('localWallpaper', () => {
  it('等比缩小且不放大', () => {
    expect(fitWithin(5120, 2880)).toMatchObject({ width: 2560, height: 1440 })
    expect(fitWithin(1000, 500)).toMatchObject({ width: 1000, height: 500, scale: 1 })
    expect(fitWithin(1440, 5120)).toMatchObject({ width: 405, height: 1440 })
  })

  it('识别本地图片地址', () => {
    expect(isLocalImageUrl('data:image/png;base64,AAA')).toBe(true)
    expect(isLocalImageUrl('https://a.com/b.png')).toBe(false)
    expect(isLocalImageUrl('')).toBe(false)
  })
})
