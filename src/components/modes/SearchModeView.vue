<template>
  <div class="search-mode-view w-full h-full flex flex-col items-center justify-center relative pb-[25vh]" :class="{ 'search-mode-view--search-centered': !showQuickLinks, 'search-mode-view--cards': quickLinkDisplayStyle === 'card', 'search-mode-view--centered': !showQuickLinks || (quickLinkDisplayStyle === 'card' && cardAlignment === 'center') }">

    <div
      v-if="showTime || showDate"
      class="clock-section p-4 sm:p-8"
    >
      <template v-if="showTime">
        <h2
          class="clock-time mb-3 text-center tracking-widest select-none cursor-none"
          :class="clockTextClass"
          :style="clockTimeStyle"
        >{{ time }}</h2>
      </template>
      <template v-else>
        <div class="mb-3" />
      </template>
      <div
        class="clock-date mb-6 text-center text-sm tracking-[0.2em] sm:mb-12 select-none cursor-none"
        :class="clockTextClass"
        :style="clockDateStyle"
      >
        <span v-if="showDate">{{ date }}</span>
        <span v-else class="invisible">&nbsp;</span>
      </div>
    </div>

    <div
      class="search-content w-full relative z-2 flex flex-col items-center justify-center"
    >
      <div
        class="search-and-cards w-full"
      >
        <SearchBar appearance="apple" />
        <Transition name="quick-visibility">
          <QuickLinks v-if="showQuickLinks" />
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { usePreferredColorScheme } from '@/composables/usePreferredColorScheme'
import SearchBar from '@/components/ui/search-bar/SearchBar.vue'
import QuickLinks from '@/components/ui/QuickLinks.vue'
import { useWallpaper } from '@/composables/useWallpaper'
import { useQuickLinks } from '@/composables/useQuickLinks'
import { useI18n } from '@/i18n'
import { clockFontFamily } from '@/utils/clockFonts'
withDefaults(defineProps<{ showQuickLinks?: boolean }>(), {
  showQuickLinks: true,
})

const { locale } = useI18n()
const { isDark } = usePreferredColorScheme()

const {
  wallpaperType,
  dateFontSize,
  themeColor,
  showTime,
  showSeconds,
  showDate,
  use24Hour,
  clockFont,
  clockFontSize,
  clockFontWeight,
  useCustomColor,
} = useWallpaper()
const { quickLinkDisplayStyle, cardAlignment, loadQuickLinkDisplayStyle } = useQuickLinks()

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 1
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255
}

// A dark custom color on the plain dark background would be unreadable.
const customColorActive = computed(() =>
  useCustomColor.value && !(isDark.value && wallpaperType.value === 'none' && luminance(themeColor.value) < 0.45)
)

const clockTextClass = computed(() => {
  if (customColorActive.value) return ''
  if (wallpaperType.value !== 'none') return 'text-white/90'
  return 'text-slate-700 dark:text-zinc-100'
})

const clockTimeStyle = computed(() => {
  const base = {
    fontFamily: clockFontFamily(clockFont.value),
    fontSize: `${clockFontSize.value}px`,
    fontWeight: clockFontWeight.value,
  }
  if (customColorActive.value) {
    return {
      ...base,
      color: themeColor.value,
      textShadow: '0 2px 32px rgba(245,245,250,0.22)',
    }
  }
  if (wallpaperType.value !== 'none') {
    return {
      ...base,
      textShadow: '0 2px 32px rgba(245,245,250,0.22)',
    }
  }
  return base
})

const clockDateStyle = computed(() => {
  const base = {
    fontFamily: clockFontFamily(clockFont.value),
    fontWeight: 400,
    fontSize: `${dateFontSize.value}px`,
  }
  if (customColorActive.value) {
    return { ...base, color: themeColor.value }
  }
  return base
})

const date = ref('')
const time = ref('')

let timer: ReturnType<typeof setInterval>

const padTimeUnit = (value: number) => String(value).padStart(2, '0')

const updateDateTime = () => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = padTimeUnit(now.getMinutes())
  const seconds = padTimeUnit(now.getSeconds())

  const weekday = new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(now)
  const day = new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'long', day: 'numeric' }).format(now)
  date.value = `${weekday}  ·  ${day}`
  if (use24Hour.value) {
    const value = `${padTimeUnit(hours)}:${minutes}`
    time.value = showSeconds.value ? `${value}:${seconds}` : value
  } else {
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const value = `${displayHours}:${minutes}`
    time.value = showSeconds.value ? `${value}:${seconds} ${period}` : `${value} ${period}`
  }
}

watch(locale, updateDateTime)

onMounted(() => {
  loadQuickLinkDisplayStyle()
  updateDateTime()
  timer = setInterval(updateDateTime, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>

<style scoped>
/* Shared spacing rhythm: 12px within clock, 32px / 40px between sections. */
.search-mode-view--cards {
  height: auto; min-height: 100%; justify-content: flex-start;
  padding-top: clamp(32px, 7vh, 80px); padding-bottom: 40px;
  gap: 32px;
}
.search-mode-view--cards .clock-section { padding: 0; }
.search-mode-view--cards .clock-time { margin: 0 0 12px; line-height: 1.1; }
.search-mode-view--cards .clock-date { margin: 0; line-height: 1.5; }
.search-mode-view--cards :deep(.quick-links) {
  width: min(1080px, calc(100vw - 72px)); margin: 40px auto 0;
}
@media (max-width: 600px), (max-height: 700px) {
  .search-mode-view--cards { padding-top: 32px; padding-bottom: 24px; gap: 24px; }
  .search-mode-view--cards :deep(.quick-links) { width: calc(100vw - 32px); margin-top: 24px; }
}
/* Symmetric padding centers the complete visible group; safe alignment keeps tall layouts reachable. */
.search-mode-view.search-mode-view--centered {
  height: auto;
  min-height: 100%;
  box-sizing: border-box;
  justify-content: safe center;
  padding-block: 32px;
}
.search-mode-view--centered .clock-section { padding: 0; }
.search-mode-view--centered .clock-time { margin: 0 0 12px; line-height: 1.1; }
.search-mode-view--centered .clock-date { margin: 0; line-height: 1.5; }
.search-mode-view--centered { gap: 32px; }
/* Equal space above and below the search row keeps its own center at 50vh.
   The clock occupies the upper row without contributing to the centering math. */
.search-mode-view.search-mode-view--search-centered {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto minmax(0, 1fr);
  justify-items: center;
  align-items: stretch;
  height: 100vh;
  min-height: 100vh;
  padding-block: 0;
  row-gap: 32px;
}
.search-mode-view--search-centered .clock-section {
  grid-row: 1;
  align-self: end;
}
.search-mode-view--search-centered .search-content {
  grid-row: 2;
}
/* Leaving cards must not temporarily change the search row's height. */
.search-mode-view--search-centered :deep(.quick-links),
.search-mode-view--search-centered :deep(.card-pagination) {
  display: none;
}
.clock-section {
  animation: clock-fade-in 0.4s ease-out both;
}
@keyframes clock-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .clock-section { animation: none; }
}
.quick-visibility-enter-active,
.quick-visibility-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.quick-visibility-enter-from,
.quick-visibility-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
