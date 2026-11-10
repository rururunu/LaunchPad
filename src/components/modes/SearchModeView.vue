<template>
  <div class="search-mode-view w-full h-full flex flex-col items-center justify-center relative pb-[25vh]" :class="{ 'search-mode-view--cards': quickLinkDisplayStyle === 'card' }">

    <BlurReveal
      v-if="showTime || showDate"
      :delay="0.2"
      :duration="0.75"
      class="clock-section p-4 sm:p-8"
    >
      <template v-if="showTime">
        <h2
          class="clock-time mb-3 text-center tracking-widest select-none cursor-none"
          :class="clockTextClass"
          :style="clockTimeStyle"
        >
          {{ time }}
        </h2>
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
    </BlurReveal>

    <div
      class="w-full relative z-2 flex flex-col items-center justify-center"
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
import BlurReveal from '@/components/ui/blur-reveal/BlurReveal.vue'
import SearchBar from '@/components/ui/search-bar/SearchBar.vue'
import QuickLinks from '@/components/ui/QuickLinks.vue'
import { useWallpaper } from '@/composables/useWallpaper'
import { useQuickLinks } from '@/composables/useQuickLinks'
import { useI18n } from '@/i18n'
withDefaults(defineProps<{ showQuickLinks?: boolean }>(), {
  showQuickLinks: true,
})

const { locale } = useI18n()

const {
  wallpaperType,
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
const { quickLinkDisplayStyle, loadQuickLinkDisplayStyle } = useQuickLinks()

const clockTextClass = computed(() => {
  if (useCustomColor.value) return ''
  if (wallpaperType.value !== 'none') return 'text-white/90'
  return 'text-slate-700 dark:text-zinc-100'
})

const clockTimeStyle = computed(() => {
  const base = {
    fontFamily: `'${clockFont.value}', sans-serif`,
    fontSize: `${clockFontSize.value}px`,
    fontWeight: clockFontWeight.value,
  }
  if (useCustomColor.value) {
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
    fontFamily: `'${clockFont.value}', sans-serif`,
    fontWeight: 400,
  }
  if (useCustomColor.value) {
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
