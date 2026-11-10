<template>
  <component
    :is="interactive ? 'a' : 'div'"
    class="quick-link-chip"
    :href="interactive ? link.url : undefined"
    :target="interactive ? '_blank' : undefined"
    :rel="interactive ? 'noopener noreferrer' : undefined"
    :title="link.label + ' · ' + link.url"
    :style="{ '--logo-surface': cardSurface, '--logo-text': logoText }"
  >
    <FaviconImg :url="link.url" :custom-src="link.iconUrl" :size="iconSize" @surface="logoSurface = $event" />
    <span v-if="showLabel" class="quick-link-label" :title="link.label">{{ link.label }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FaviconImg from '@/components/ui/FaviconImg.vue';
import type { QuickLink } from '@/composables/useQuickLinks';

const props = withDefaults(defineProps<{ link: QuickLink; interactive?: boolean; iconSize?: number; showLabel?: boolean }>(), {
  interactive: true,
  iconSize: 16,
  showLabel: true,
});
const logoSurface = ref('#ffffff');
const cardSurface = computed(() => /^#[0-9a-f]{6}$/i.test(props.link.iconBackground ?? '') ? props.link.iconBackground! : logoSurface.value);
const logoText = computed(() => {
  const color = cardSurface.value;
  const values = /^#[0-9a-f]{6}$/i.test(color) ? [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16)) : color.match(/\d+/g)?.map(Number);
  return values && values.length === 3 && values[0] * .299 + values[1] * .587 + values[2] * .114 < 150 ? '#ffffff' : '#1d1d1f';
});
watch(() => [props.link.url, props.link.iconUrl], () => { logoSurface.value = '#ffffff'; });
</script>

<style scoped>
.quick-link-chip {
  height: 38px;
  max-width: 180px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-radius: 999px;
  color: #374151;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 13px;
  font-weight: 550;
  text-decoration: none;
  transition: transform 0.15s, background 0.15s, border-color 0.15s;
}

.quick-link-label {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-link-chip--card .quick-link-label {
  display: block;
  width: 100%;
  flex-shrink: 0;
  line-height: 1.4;
}

a.quick-link-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.34);
  background: rgba(255, 255, 255, 0.94);
}

@media (prefers-color-scheme: dark) {
  .quick-link-chip {
    color: #e5e7eb;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(24, 24, 27, 0.68);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  }

  a.quick-link-chip:hover {
    border-color: rgba(255, 255, 255, 0.38);
    background: rgba(39, 39, 42, 0.86);
  }
}
</style>
