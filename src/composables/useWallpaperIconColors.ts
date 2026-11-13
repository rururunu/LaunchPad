import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { wallpaperIconColor } from '@/utils/wallpaperContrast'

/** Sample each control's actual region, matching the centered cover wallpaper. */
export function useWallpaperIconColors(
  type: Ref<string>, url: Ref<string>, background: Ref<string>, dimmed: Ref<boolean>,
  dark: Ref<boolean>, top: Ref<HTMLElement | null>, bottom: Ref<HTMLElement | null>,
) {
  const topColor = ref('#ffffff')
  const bottomColor = ref('#ffffff')
  let image: HTMLImageElement | null = null
  let frame = 0

  function sample() {
    const fallback = type.value === 'none' && !dark.value ? '#000000' : '#ffffff'
    topColor.value = bottomColor.value = fallback
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 16
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const base = dark.value ? '#18181b' : '#f4f4f5'
    for (const [element, color] of [[top.value, topColor], [bottom.value, bottomColor]] as const) {
      if (!element) continue
      try {
        context.fillStyle = base
        context.fillRect(0, 0, 32, 16)
        if (type.value === 'color') {
          context.fillStyle = background.value
          context.fillRect(0, 0, 32, 16)
        } else if (type.value !== 'none') {
          if (!image?.complete || !image.naturalWidth) continue
          const rect = element.getBoundingClientRect()
          const scale = Math.max(window.innerWidth / image.naturalWidth, window.innerHeight / image.naturalHeight)
          const offsetX = (window.innerWidth - image.naturalWidth * scale) / 2
          const offsetY = (window.innerHeight - image.naturalHeight * scale) / 2
          context.drawImage(image, (rect.left - offsetX) / scale, (rect.top - offsetY) / scale,
            rect.width / scale, rect.height / scale, 0, 0, 32, 16)
        }
        color.value = wallpaperIconColor(context.getImageData(0, 0, 32, 16).data, type.value !== 'none' && dimmed.value)
      } catch {
        // Remote images without CORS permission retain a readable white fallback.
        color.value = fallback
      }
    }
  }

  function scheduleSample() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(sample)
  }

  const stopImageWatch = watch([type, url], () => {
    if (image) { image.onload = image.onerror = null; image.src = '' }
    image = null
    if (['source', 'custom'].includes(type.value) && url.value) {
      image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = scheduleSample
      image.onerror = scheduleSample
      image.src = url.value
    }
    scheduleSample()
  }, { immediate: true, flush: 'post' })
  watch([background, dimmed, dark, top, bottom], scheduleSample, { flush: 'post' })
  onMounted(() => window.addEventListener('resize', scheduleSample))
  onBeforeUnmount(() => {
    stopImageWatch()
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', scheduleSample)
    if (image) { image.onload = image.onerror = null; image.src = '' }
  })
  return { topColor, bottomColor }
}
