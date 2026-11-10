<template>
  <div v-show="visible" class="overlay-search" @click.self="hide">
    <div class="overlay-search-field"><SearchBar ref="search" appearance="apple" @navigate="hide" /></div>
    <div v-if="visible && showLinks" class="overlay-search-links" @click="onLinkClick">
      <QuickLinks read-only />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import SearchBar from '@/components/ui/search-bar/SearchBar.vue';
import QuickLinks from '@/components/ui/QuickLinks.vue';
import { useQuickLinks } from '@/composables/useQuickLinks';
import { storage } from '@/utils/storage';
const visible = ref(false);
const showLinks = ref(true);
const search = ref<InstanceType<typeof SearchBar>>();
const state = useQuickLinks();
let hostOrigin = '';
let strayUntil = 0;
let unsubscribe: (() => void) | undefined;
function notify(type: string) {
  window.parent.postMessage({ source: 'lp-overlay', type }, hostOrigin || '*');
}
function hide() { visible.value = false; search.value?.reset(); notify('hide'); }
async function show() {
  const [mode, shown] = await Promise.all([storage.get('quickLinkDisplayStyle'), storage.get('showQuickLinks')]);
  state.quickLinkDisplayStyle.value = mode === 'card' ? 'card' : 'pill';
  showLinks.value = shown !== false && shown !== 'false';
  visible.value = true;
  await nextTick();
  search.value?.focus();
}
function onMessage(event: MessageEvent) {
  if (event.source !== window.parent || event.data?.source !== 'lp-host') return;
  hostOrigin = event.origin;
  if (event.data.type === 'show') { if (event.data.armStray) strayUntil = Date.now() + 200; void show(); }
  if (event.data.type === 'hide') hide();
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229 || !visible.value) return;
  if (event.key === 'Escape' || (event.altKey && event.code === 'KeyS')) {
    event.preventDefault(); event.stopImmediatePropagation(); hide();
  } else if (Date.now() < strayUntil && event.code === 'KeyS') {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}
function onLinkClick(event: MouseEvent) { if ((event.target as HTMLElement).closest('a[href]')) hide(); }
onMounted(async () => {
  window.addEventListener('message', onMessage);
  window.addEventListener('keydown', keydown, true);
  await Promise.all([state.loadQuickLinks(), state.loadQuickLinkDisplayStyle(), state.loadShowCardLabels()]);
  unsubscribe = storage.onChange('showQuickLinks', changes => { const value = changes.showQuickLinks?.newValue; showLinks.value = value !== false && value !== 'false'; });
  notify('ready');
});
onBeforeUnmount(() => { window.removeEventListener('message', onMessage); window.removeEventListener('keydown', keydown, true); unsubscribe?.(); });
</script>

<style scoped>
.overlay-search { position: fixed; inset: 0; overflow-y: auto; padding: 18vh 0 32px; box-sizing: border-box; scrollbar-width: thin; overscroll-behavior: contain; background: transparent; }
.overlay-search-field { position: relative; z-index: 10; width: 100%; }
.overlay-search-links { margin-top: 40px; }
.overlay-search-links :deep(.quick-links) { margin-top: 0; }
@media(max-height: 650px) { .overlay-search { padding-top: 40px; } .overlay-search-links { margin-top: 24px; } }
</style>
