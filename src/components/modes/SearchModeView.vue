<template>
  <div class="search-mode-view w-full h-full flex flex-col items-center justify-center relative pb-[25vh]">

    <BlurReveal
      v-if="showTime || showDate"
      :delay="0.2"
      :duration="0.75"
      class="p-4 sm:p-8"
    >
      <template v-if="showTime">
        <h2
          class="mb-3 text-center tracking-widest select-none cursor-none"
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
        class="mb-6 text-center text-sm tracking-[0.2em] sm:mb-12 select-none cursor-none"
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
        class="w-full transition-all duration-500 ease-in-out transform scale-100 translate-y-0"
      >
        <SearchBar />
        <Transition name="quick-visibility">
          <QuickLinks v-if="showQuickLinks" />
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import BlurReveal from '@/components/ui/blur-reveal/BlurReveal.vue'
import SearchBar from '@/components/ui/search-bar/SearchBar.vue'
import QuickLinks from '@/components/ui/QuickLinks.vue'
import { useWallpaper } from '@/composables/useWallpaper'
withDefaults(defineProps<{ showQuickLinks?: boolean }>(), {
  showQuickLinks: true,
})

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

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

  date.value = `${WEEKDAYS[now.getDay()]}  ·  ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
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

onMounted(() => {
  updateDateTime()
  timer = setInterval(updateDateTime, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>

<style scoped>
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
