/// <reference types="chrome" />
<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Dialog from './components/ui/dialog/Dialog.vue'
import NotificationContainer from './components/ui/notification/NotificationContainer.vue'
import SearchModeView from '@/components/modes/SearchModeView.vue'
import { useWallpaper } from './composables/useWallpaper'
import { storage } from '@/utils/storage'
import { hydrateFaviconCache, refreshStaleFavicons } from '@/utils/iconCache'
import { useNotification } from '@/composables/useNotification'
import { usePreferredColorScheme } from '@/composables/usePreferredColorScheme'
import { getWallpaperSourceMeta, type WallpaperSourceId } from '@/utils/wallpaperSources'

const {
  wallpaperType,
  wallpaperUrl,
  originalWallpaperUrl,
  sourceUrl,
  wallpaperSourceId,
  backgroundColor,
  loadState,
  showMask,
  getWallpaperStyle,
  refreshSourceWallpaper,
  restorePreviousWallpaper,
  canRestorePreviousWallpaper,
  isRestoringWallpaper,
} = useWallpaper()
const { success, error } = useNotification()

const isLoading = ref(false)
const isRefreshingWallpaper = ref(false)
const wallpaperControlsExpanded = ref(false)
const wallpaperControlsRef = ref<HTMLElement | null>(null)
const showQuickLinks = ref(true)
const QUICK_LINKS_VISIBILITY_KEY = 'showQuickLinks'
const FAVORITE_WALLPAPERS_KEY = 'favoriteWallpapers'

interface FavoriteWallpaper {
  url: string
  sourceId: WallpaperSourceId
  sourceName: string
  savedAt: number
}

const favoriteWallpapers = ref<FavoriteWallpaper[]>([])
let unsubFavoriteWallpapers: (() => void) | undefined
let unsubAppConfig: (() => void) | undefined

const parseFavoriteWallpapers = (value: unknown): FavoriteWallpaper[] => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.url === 'string')
      : []
  } catch {
    return []
  }
}

const currentWallpaperUrl = computed(() => {
  if (!['source', 'custom'].includes(wallpaperType.value)) return ''
  const value = originalWallpaperUrl.value || (wallpaperType.value === 'source' ? sourceUrl.value : '')
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
})

const isCurrentWallpaperFavorite = computed(() =>
  favoriteWallpapers.value.some((favorite) => favorite.url === currentWallpaperUrl.value)
)

const { isDark } = usePreferredColorScheme()
const topIconColor = computed(() => {
  if (wallpaperType.value !== 'none' || isDark.value) return '#f5f5facc'
  return '#374151cc'
})

const setup = ref({ show: false })
const BasicSettings = defineAsyncComponent(() => import('@/components/settings/BasicSettings.vue'))
const BackgroundSettings = defineAsyncComponent(() => import('@/components/settings/BackgroundSettings.vue'))
const SearchEngineSettings = defineAsyncComponent(() => import('@/components/settings/SearchEngineSettings.vue'))
const QuickLinkSettings = defineAsyncComponent(() => import('@/components/settings/QuickLinkSettings.vue'))
const DataTransferSettings = defineAsyncComponent(() => import('@/components/settings/DataTransferSettings.vue'))
const TutorialSettings = defineAsyncComponent(() => import('@/components/settings/TutorialSettings.vue'))

const setUpSelect = shallowRef([
  { key: 'basic',    icon: 'fluent-color:settings-48',        label: '基础设置', in: BasicSettings },
  { key: 'img',      icon: 'fluent-color:image-48',           label: '背景设置', in: BackgroundSettings },
  { key: 'jump',     icon: 'fluent-color:link-multiple-24',   label: '搜索引擎', in: SearchEngineSettings },
  { key: 'quick',    icon: 'fluent:flash-24-filled',           label: '快捷访问', in: QuickLinkSettings },
  { key: 'transfer', icon: 'fluent:arrow-sync-24-regular',     label: '导入导出', in: DataTransferSettings },
  { key: 'tutorial', icon: 'fluent-color:book-open-48',       label: '使用教程', in: TutorialSettings },
])

function onSetup() {
  setup.value.show = true
}

async function toggleQuickLinks() {
  showQuickLinks.value = !showQuickLinks.value
  await storage.set(QUICK_LINKS_VISIBILITY_KEY, String(showQuickLinks.value))
}

async function favoriteCurrentWallpaper() {
  const url = currentWallpaperUrl.value
  if (!url || isCurrentWallpaperFavorite.value) return
  const sourceId: WallpaperSourceId = wallpaperType.value === 'custom' ? 'custom' : wallpaperSourceId.value
  const favorite: FavoriteWallpaper = {
    url,
    sourceId,
    sourceName: wallpaperType.value === 'custom' ? '自定义图片' : getWallpaperSourceMeta(sourceId).name,
    savedAt: Date.now(),
  }
  const previous = favoriteWallpapers.value
  favoriteWallpapers.value = [favorite, ...previous]
  try {
    await storage.set(FAVORITE_WALLPAPERS_KEY, JSON.stringify(favoriteWallpapers.value))
    success('收藏成功', '当前壁纸已保存到插件')
  } catch (e) {
    favoriteWallpapers.value = previous
    error('收藏失败', e instanceof Error ? e.message : String(e))
  }
}

async function onRefreshWallpaper(event?: MouseEvent) {
  if (isRefreshingWallpaper.value || isRestoringWallpaper.value || wallpaperType.value !== 'source') return

  const pointerType = (event as PointerEvent | undefined)?.pointerType
  const isTouchLike = pointerType === 'touch' || pointerType === 'pen'
  if (isTouchLike && !wallpaperControlsExpanded.value) {
    wallpaperControlsExpanded.value = true
    return
  }

  isRefreshingWallpaper.value = true
  try {
    await refreshSourceWallpaper()
  } catch (e) {
    console.error('刷新壁纸失败:', e)
  } finally {
    isRefreshingWallpaper.value = false
  }
}

async function onRestoreWallpaper() {
  if (!canRestorePreviousWallpaper.value || isRefreshingWallpaper.value) return
  try {
    await restorePreviousWallpaper()
  } catch (e) {
    console.error('恢复上一张壁纸失败:', e)
  }
}

function onWallpaperControlsOutside(event: PointerEvent) {
  if (!wallpaperControlsExpanded.value) return
  const root = wallpaperControlsRef.value
  if (root && !root.contains(event.target as Node)) {
    wallpaperControlsExpanded.value = false
  }
}

watch(wallpaperType, (type) => {
  if (type !== 'source') wallpaperControlsExpanded.value = false
})

onMounted(async () => {
  try {
    isLoading.value = false

    const [
      savedQuickLinksVisibility,
      storedFavoriteWallpapers,
    ] = await Promise.all([
      storage.get<string | boolean>(QUICK_LINKS_VISIBILITY_KEY),
      storage.get<string | FavoriteWallpaper[]>(FAVORITE_WALLPAPERS_KEY),
      hydrateFaviconCache(),
      loadState(),
    ])

    showQuickLinks.value = savedQuickLinksVisibility !== false && savedQuickLinksVisibility !== 'false'
    favoriteWallpapers.value = parseFavoriteWallpapers(storedFavoriteWallpapers)
    unsubFavoriteWallpapers = storage.onChange(FAVORITE_WALLPAPERS_KEY, (changes) => {
      favoriteWallpapers.value = parseFavoriteWallpapers(changes[FAVORITE_WALLPAPERS_KEY]?.newValue)
    })

    let bookmarkUrls: string[] = []
    if ((window as any).chrome?.bookmarks) {
      const all = await (window as any).chrome.bookmarks.search({})
      const valid = all.filter((b: any) => b.url)
      bookmarkUrls = valid.map((b: any) => b.url as string)
      await storage.set('cachedBookmarks', JSON.stringify(valid))
    }

    if (bookmarkUrls.length) {
      refreshStaleFavicons(bookmarkUrls).catch(() => {})
    }

    const [savedType, savedUrl] = await Promise.all([
      storage.get('wallpaperType'),
      storage.get('wallpaperUrl'),
    ])
    if (savedType && savedUrl) {
      wallpaperType.value = savedType as 'none' | 'source' | 'custom'
      if (wallpaperType.value !== 'none') {
        wallpaperUrl.value = savedUrl as string
      }
    }

    if (!unsubAppConfig) {
      unsubAppConfig = storage.onChange('appConfig', () => {
        void loadState(true)
      })
    }

    document.addEventListener('pointerdown', onWallpaperControlsOutside, true)
  } catch (e) {
    console.error('App init error:', e)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onWallpaperControlsOutside, true)
  unsubFavoriteWallpapers?.()
  unsubAppConfig?.()
})
</script>

<template>
  <div class="relative min-h-screen w-full transition-all duration-300">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isLoading"
        class="fixed inset-0 z-50 flex items-center justify-center"
        :style="wallpaperType === 'color' ? { backgroundColor } : {}"
        :class="{ 'bg-slate-100 dark:bg-zinc-900': wallpaperType === 'none' }"
      >
        <div
          v-if="wallpaperType === 'custom' || wallpaperType === 'source'"
          class="absolute inset-0 bg-cover bg-center"
          :style="{ backgroundImage: `url('${wallpaperUrl}')` }"
        >
          <div class="absolute inset-0 bg-black bg-opacity-30" />
        </div>
        <div class="text-center relative z-10">
          <div class="inline-block w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <p class="mt-2 text-white text-shadow-sm">加载中...</p>
        </div>
      </div>
    </Transition>

    <div class="relative z-10">
      <div
        id="base"
        class="text-slate-700 dark:text-zinc-400 transition-all duration-500 ease-in-out"
        :class="{ 'has-background': wallpaperType !== 'none' }"
        :style="getWallpaperStyle()"
      >
        <Transition
          enter-active-class="transition-opacity duration-500 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-300 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="wallpaperType !== 'none' && showMask" id="mask" class="z-0" />
        </Transition>

        <div id="setup" class="z-[200]">
          <button
            v-if="currentWallpaperUrl"
            type="button"
            class="setup-btn setup-btn--small"
            :style="{ color: topIconColor }"
            :title="isCurrentWallpaperFavorite ? '当前壁纸已收藏' : '收藏当前壁纸'"
            :aria-label="isCurrentWallpaperFavorite ? '当前壁纸已收藏' : '收藏当前壁纸'"
            :disabled="isCurrentWallpaperFavorite"
            @click="favoriteCurrentWallpaper"
          >
            <Icon
              :icon="isCurrentWallpaperFavorite ? 'fluent:star-24-filled' : 'fluent:star-add-24-regular'"
              class="text-[20px]"
            />
          </button>
          <button
            type="button"
            class="setup-btn"
            :style="{ color: topIconColor }"
            :title="showQuickLinks ? '隐藏快捷访问' : '显示快捷访问'"
            :aria-label="showQuickLinks ? '隐藏快捷访问' : '显示快捷访问'"
            :aria-pressed="showQuickLinks"
            @click="toggleQuickLinks"
          >
            <Icon
              :icon="showQuickLinks ? 'fluent:eye-24-filled' : 'fluent:eye-off-24-filled'"
              class="text-[22px]"
            />
          </button>
          <button
            type="button"
            class="setup-btn"
            :style="{ color: topIconColor }"
            title="设置"
            @click="onSetup"
          >
            <Icon icon="fluent:settings-24-filled" class="text-[22px]" />
          </button>
        </div>

        <div
          v-if="wallpaperType === 'source'"
          id="wallpaper-controls"
          ref="wallpaperControlsRef"
          class="z-[200]"
        >
          <div
            class="wallpaper-controls-inner"
            :class="{ 'is-expanded': wallpaperControlsExpanded }"
          >
            <button
              type="button"
              class="setup-btn wallpaper-nav-btn wallpaper-prev-btn"
              :class="{ 'wallpaper-nav-btn--inactive': !canRestorePreviousWallpaper }"
              :style="{ color: topIconColor }"
              :disabled="!canRestorePreviousWallpaper || isRefreshingWallpaper || isRestoringWallpaper"
              :title="canRestorePreviousWallpaper ? '上一张壁纸' : '换一张后可回到上一张'"
              aria-label="上一张壁纸"
              @click="onRestoreWallpaper"
            >
              <Icon
                icon="fluent:arrow-left-24-filled"
                class="text-[22px]"
                :class="{ 'is-spinning': isRestoringWallpaper }"
              />
            </button>
            <button
              type="button"
              id="wallpaper-refresh"
              class="setup-btn wallpaper-nav-btn wallpaper-refresh-btn"
              :style="{ color: topIconColor }"
              :disabled="isRefreshingWallpaper || isRestoringWallpaper"
              title="换一张壁纸"
              aria-label="换一张壁纸"
              :aria-expanded="wallpaperControlsExpanded"
              @click="onRefreshWallpaper($event)"
            >
              <Icon
                icon="fluent:arrow-sync-24-filled"
                class="text-[22px]"
                :class="{ 'is-spinning': isRefreshingWallpaper }"
              />
            </button>
          </div>
        </div>

        <SearchModeView :show-quick-links="showQuickLinks" />

        <Dialog
          :show="setup.show"
          :select="setUpSelect"
          title="设置"
          @close="setup.show = false"
        />
      </div>
      <NotificationContainer />
    </div>
  </div>
</template>

<style scoped>
#base {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f4f4f5;
  transition: all 0.5s ease-in-out;
}

@media (prefers-color-scheme: dark) {
  #base {
    background-color: #18181b;
  }
}

#base.has-background {
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  transition: background-image 0.5s ease-in-out;
}

#mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  background-color: rgba(0, 0, 0, 0.15);
  transition: background-color 0.3s ease-in-out;
}

#setup {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 4px;
}

#wallpaper-controls {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 200;
  touch-action: manipulation;
}

.wallpaper-controls-inner {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
  border-radius: 14px;
  background: transparent;
  border: 1px solid transparent;
  backdrop-filter: blur(0);
  -webkit-backdrop-filter: blur(0);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    padding 0.2s ease,
    gap 0.2s ease,
    backdrop-filter 0.2s ease;
}

.wallpaper-controls-inner:hover,
.wallpaper-controls-inner:focus-within,
.wallpaper-controls-inner.is-expanded {
  gap: 6px;
  padding: 4px;
  background: rgba(15, 15, 18, 0.28);
  border-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

#wallpaper-controls .wallpaper-nav-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  background: transparent;
  flex-shrink: 0;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    width 0.2s ease,
    min-width 0.2s ease,
    max-width 0.2s ease,
    margin 0.2s ease,
    background 0.2s ease;
}

.wallpaper-controls-inner:hover .wallpaper-nav-btn,
.wallpaper-controls-inner:focus-within .wallpaper-nav-btn,
.wallpaper-controls-inner.is-expanded .wallpaper-nav-btn {
  background: rgba(255, 255, 255, 0.06);
}

#wallpaper-controls .setup-btn.wallpaper-prev-btn {
  width: 0;
  min-width: 0;
  max-width: 0;
  margin: 0;
  padding: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  border: none;
}

#wallpaper-controls .wallpaper-controls-inner:hover .setup-btn.wallpaper-prev-btn,
#wallpaper-controls .wallpaper-controls-inner:focus-within .setup-btn.wallpaper-prev-btn,
#wallpaper-controls .wallpaper-controls-inner.is-expanded .setup-btn.wallpaper-prev-btn {
  width: 36px;
  min-width: 36px;
  max-width: 36px;
  opacity: 1;
  pointer-events: auto;
}

#wallpaper-controls .wallpaper-controls-inner:hover .setup-btn.wallpaper-prev-btn.wallpaper-nav-btn--inactive,
#wallpaper-controls .wallpaper-controls-inner:focus-within .setup-btn.wallpaper-prev-btn.wallpaper-nav-btn--inactive,
#wallpaper-controls .wallpaper-controls-inner.is-expanded .setup-btn.wallpaper-prev-btn.wallpaper-nav-btn--inactive,
#wallpaper-controls .wallpaper-controls-inner:hover .setup-btn.wallpaper-prev-btn:disabled,
#wallpaper-controls .wallpaper-controls-inner:focus-within .setup-btn.wallpaper-prev-btn:disabled,
#wallpaper-controls .wallpaper-controls-inner.is-expanded .setup-btn.wallpaper-prev-btn:disabled {
  opacity: 0.72;
}

#wallpaper-refresh {
  position: static;
}

.setup-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

#wallpaper-controls .setup-btn.wallpaper-nav-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
}

#wallpaper-controls .setup-btn.wallpaper-prev-btn:disabled {
  cursor: not-allowed;
}

.setup-btn--small {
  width: 34px;
  height: 34px;
}

.setup-btn:hover:not(:disabled) {
  opacity: 0.7;
  transform: scale(1.08);
}

.setup-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.setup-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.setup-btn:disabled.is-spinning {
  cursor: wait;
  opacity: 0.85;
}

.is-spinning {
  animation: wallpaper-spin 0.8s linear infinite;
}

@keyframes wallpaper-spin {
  to { transform: rotate(360deg); }
}
</style>
