<template>
  <span class="favicon-img-root" :style="{ width: size + 'px', height: size + 'px', '--icon-native-width': nativeWidth + 'px', '--icon-native-height': nativeHeight + 'px' }">
    <!-- 加载态：轻微闪烁占位 -->
    <span
      v-if="loading"
      class="favicon-placeholder"
      :class="placeholderClass"
      :style="{ width: size + 'px', height: size + 'px', borderRadius: rounded ? '4px' : '0' }"
    />
    <!-- 成功：显示 favicon -->
    <img
      v-else-if="dataUrl"
      :src="dataUrl"
      :width="size"
      :height="size"
      :class="imgClass"
      :style="{ borderRadius: rounded ? '4px' : '0' }"
      @error="onImgError"
      @load="onImageLoaded"
    />
    <!-- 失败：显示域名首字母 -->
    <span
      v-else
      class="favicon-fallback"
      :style="{
        width: size + 'px',
        height: size + 'px',
        borderRadius: rounded ? '4px' : '0',
        fontSize: Math.max(size * 0.5, 10) + 'px'
      }"
    >
      {{ fallbackLetter }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { getCachedFavicon, loadFavicon, loadCustomIcon, getDomain } from '@/utils/iconCache'

const props = withDefaults(defineProps<{
  /** 完整页面 URL（从中提取域名加载 favicon） */
  url: string
  customSrc?: string
  /** 图标尺寸 */
  size?: number
  /** 是否圆角 */
  rounded?: boolean
}>(), {
  size: 16,
  rounded: true,
})

const nativeWidth = ref(props.size)
const nativeHeight = ref(props.size)
const emit = defineEmits<{ surface: [color: string] }>()
function onImageLoaded(event: Event) {
  const image = event.target as HTMLImageElement
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const vector = /(?:^data:image\/svg\+xml|\.svg(?:[?#]|$))/i.test(dataUrl.value)
  nativeWidth.value = vector ? 160 : Math.min(160, image.naturalWidth / dpr)
  nativeHeight.value = vector ? 160 : Math.min(160, image.naturalHeight / dpr)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 24
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(event.target as HTMLImageElement, 0, 0, 24, 24)
    const { data } = ctx.getImageData(0, 0, 24, 24)
    const colors = new Map<string, number>()
    // Extend the logo tile's edge color without recoloring the logo itself.
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (x > 3 && x < 20 && y > 3 && y < 20) continue
      const i = (y * 24 + x) * 4
      if (data[i + 3] < 230) continue
      const key = [data[i], data[i + 1], data[i + 2]].map(v => Math.round(v / 16) * 16).join(',')
      colors.set(key, (colors.get(key) ?? 0) + 1)
    }
    const dominant = [...colors].sort((a, b) => b[1] - a[1])[0]
    emit('surface', dominant && dominant[1] > 40 ? `rgb(${dominant[0]})` : '#ffffff')
  } catch { emit('surface', '#ffffff') }
}
const dataUrl = ref<string>(props.customSrc?.startsWith('data:') ? props.customSrc : !props.customSrc ? getCachedFavicon(props.url) || '' : '')
const loading = ref(false)
let loadId = 0

const fallbackLetter = computed(() => {
  const domain = getDomain(props.url).replace(/^www\./i, '')
  return domain ? domain.charAt(0).toUpperCase() : '?'
})

const imgClass = computed(() =>
  `favicon-img object-contain flex-shrink-0 ${props.rounded ? 'rounded-sm' : ''}`
)
const placeholderClass = computed(() =>
  `bg-gray-200 dark:bg-zinc-700 animate-pulse flex-shrink-0 ${props.rounded ? 'rounded-sm' : ''}`
)

async function doLoad() {
  const currentLoadId = ++loadId
  dataUrl.value = ''
  nativeWidth.value = props.size
  nativeHeight.value = props.size
  if (props.customSrc && /^(https?:\/\/|data:image\/(png|jpeg|webp|gif|svg\+xml)[;,])/i.test(props.customSrc)) {
    loading.value = true
    const result = await loadCustomIcon(props.customSrc)
    if (currentLoadId !== loadId) return
    dataUrl.value = result
    loading.value = false
    return
  }
  if (!props.url) {
    loading.value = false
    return
  }

  // 1. 同步检查内存缓存（瞬间命中）
  const cached = getCachedFavicon(props.url)
  if (cached) {
    dataUrl.value = cached
    loading.value = false
    return
  }

  // 2. 异步加载
  loading.value = true
  try {
    const result = await loadFavicon(props.url, Math.max(props.size * 2, 256))
    if (currentLoadId !== loadId) return
    if (result) {
      dataUrl.value = result
    }
  } catch {
    // Keep dataUrl empty so the default website icon is rendered.
  } finally {
    if (currentLoadId === loadId) loading.value = false
  }
}

function onImgError() {
  dataUrl.value = ''
}

watch(() => [props.url, props.size, props.customSrc], () => {
  doLoad()
})

onMounted(() => {
  doLoad()
})
</script>

<style scoped>
.favicon-img-root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.favicon-img {
  display: block;
}

.favicon-placeholder {
  display: block;
}

.favicon-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #6b7280;
  background: rgba(0, 0, 0, 0.06);
  user-select: none;
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .favicon-fallback {
    color: #a1a1aa;
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
