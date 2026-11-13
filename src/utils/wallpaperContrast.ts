/** Choose the monochrome foreground with the higher contrast after compositing. */
export function wallpaperIconColor(pixels: Uint8ClampedArray, dimmed = false): '#000000' | '#ffffff' {
  let luminance = 0
  const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  for (let i = 0; i < pixels.length; i += 4) {
    const shade = dimmed ? 0.85 : 1
    luminance += 0.2126 * linear(pixels[i] / 255 * shade)
      + 0.7152 * linear(pixels[i + 1] / 255 * shade)
      + 0.0722 * linear(pixels[i + 2] / 255 * shade)
  }
  luminance /= Math.max(1, pixels.length / 4)
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
}
