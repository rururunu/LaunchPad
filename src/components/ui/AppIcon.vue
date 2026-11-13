<template>
  <Icon v-bind="$attrs" :icon="icon" />
</template>

<script setup lang="ts">
import { Icon, loadIcons } from '@iconify/vue'
import { onMounted } from 'vue'

/**
 * AppIcon — 统一 Iconify 图标封装组件
 *
 * 与 @iconify/vue 的 Icon 完全兼容，额外提供：
 * 1. 应用内所有图标集中注册，方便维护
 * 2. 首次挂载时预加载所有已知图标到 Iconify 缓存
 */

defineProps<{
  icon: string
}>()

// ── 应用内所有使用的图标（集中注册，方便维护 + 预加载）──
const ALL_APP_ICONS = [
  // 设置导航（单色线性，随文字着色）
  'ph:gear',
  'ph:image',
  'ph:magnifying-glass',
  'ph:lightning',
  'ph:arrows-clockwise',
  'ph:book-open',
  'ph:dots-three',
  'fluent-color:dismiss-circle-48',
  'fluent:settings-24-filled',

  // 通知
  'ph:info-fill',
  'ph:check-circle-fill',
  'ph:x-circle-fill',
  'ph:x-bold',
  'sf-symbols:exclamationmark-circle-fill',
  'sf-symbols:info-circle-fill',

  // 搜索
  'material-symbols:check-rounded',

  // 教程页
  'fluent-color:rocket-24',
  'fluent-color:keyboard-24',
  'fluent-color:search-24',
  'fluent-color:bookmark-24',
  'fluent-color:lightbulb-24',
  'fluent-color:paint-brush-24',
  'fluent:info-12-filled',
  'fluent:image-24-filled',
  'fluent:paint-bucket-24-filled',
  'fluent:clock-24-filled',
]

// 预加载状态（只执行一次）
let preloaded = false

onMounted(() => {
  if (preloaded) return
  preloaded = true

  // 批量预加载所有图标到 Iconify 内置缓存（sessionStorage + 内存）
  loadIcons(ALL_APP_ICONS, (loaded, missing) => {
    if (missing.length > 0) {
      console.warn('[AppIcon] 部分图标加载失败:', missing)
    }
  })
})
</script>
