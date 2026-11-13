<template>
  <form class="apple-search-input" :class="{ 'apple-search-input--glass': searchGlass }" role="search" @submit.prevent="submit">
    <div v-if="$slots['left-icon']" class="leading"><slot name="left-icon" /></div>
    <svg v-else class="search-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
    <input ref="input" v-model="value" type="text" :aria-label="t('search.command')" :placeholder="placeholder"
      autocomplete="off" autocapitalize="off" :spellcheck="false" enterkeyhint="search"
      @compositionstart="composing = true" @compositionend="composing = false"
      @keydown="keydown" @focus="emit('focus')" @blur="emit('blur')" />
    <button v-if="value" type="button" class="clear" :aria-label="t('search.clearInput')" :title="t('search.clear')" @click="clear">
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="currentColor" /><path d="m7 7 6 6m0-6-6 6" stroke="var(--input-surface)" stroke-width="1.5" /></svg>
    </button>
    <button class="submit" type="submit" :disabled="!value.trim() || composing" :aria-label="t('search.submit')" :title="t('search.submit')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper';
const { searchGlass } = useWallpaper();
import { useI18n } from '@/i18n';
const props = withDefaults(defineProps<{ placeholders?: string[] }>(), { placeholders: () => [] });
const value = defineModel<string>({ default: '' });
const emit = defineEmits<{ submit: [value: string]; escape: []; focus: []; blur: [] }>();
const input = ref<HTMLInputElement>();
const composing = ref(false);
// Keep the hint still while typing; commands remain available through SearchBar.
const { t } = useI18n();
const placeholder = computed(() => props.placeholders.find(text => text.trim()) ?? t('search.command'));
function focus() { input.value?.focus(); }
function clear() { value.value = ''; emit('escape'); focus(); }
function submit() { if (!composing.value && value.value.trim()) emit('submit', value.value); }
function keydown(event: KeyboardEvent) {
  if (event.isComposing || composing.value || event.keyCode === 229) return;
  if (event.key === 'Escape') { event.preventDefault(); emit('escape'); }
}
defineExpose({ focus });
</script>

<style scoped>
.apple-search-input {
  --input-surface: #fff; --input-text: #1d1d1f; --input-muted: #6e6e73;
  display: flex; align-items: center; gap: 10px; width: 100%; min-height: 56px;
  margin: 0; padding: 7px 8px 7px 14px; box-sizing: border-box;
  border: 1px solid #00000014; border-radius: 18px;
  background: var(--input-surface); color: var(--input-text);
  box-shadow: 2px 4px 12px #00000014;
  transition: box-shadow .2s ease, border-color .2s ease;
  font-family: inherit;
}
.apple-search-input:hover { box-shadow: 2px 4px 16px #00000029; }
.apple-search-input:focus-within { border-color: #0071e3; box-shadow: 0 0 0 4px #0071e326, 2px 4px 16px #00000014; }
input { flex: 1; width: 0; min-width: 0; height: 40px; padding: 0; border: none; outline: none; background: transparent; color: inherit; font: inherit; font-size: 18px; line-height: 1.5; caret-color: #0071e3; }
input::placeholder { color: var(--input-muted); opacity: 1; text-overflow: ellipsis; }
.leading { display: flex; align-items: center; flex: 0 0 auto; }
.search-symbol { width: 22px; height: 22px; flex-shrink: 0; color: var(--input-muted); }
button { display: grid; place-items: center; flex-shrink: 0; border: 0; cursor: pointer; transition: background .15s ease, box-shadow .15s ease; }
button:focus-visible { outline: 2px solid #0071e3; outline-offset: 3px; }
.clear { width: 28px; height: 32px; padding: 4px; background: transparent; color: #86868b; border-radius: 8px; }
.clear:hover { color: var(--input-text); }
.clear svg { width: 18px; height: 18px; }
.submit { width: 40px; height: 40px; padding: 9px; border-radius: 12px; color: #fff; background: #0071e3; }
.submit svg { width: 22px; height: 22px; }
.submit:hover:not(:disabled) { background: #0077ed; box-shadow: 0 2px 6px #0071e333; }
.submit:active:not(:disabled) { background: #0064c8; box-shadow: inset 0 1px 3px #0003; }
.submit:disabled { background: #f5f5f7; color: #a1a1a6; cursor: default; }
@media(prefers-color-scheme: dark) {
  .apple-search-input { --input-surface: #1c1c1e; --input-text: #f5f5f7; --input-muted: #a1a1a6; border-color: #ffffff26; box-shadow: 2px 4px 12px #0003; }
  .apple-search-input:hover { box-shadow: 2px 4px 16px #0005; }
  .apple-search-input:focus-within { border-color: #0a84ff; box-shadow: 0 0 0 4px #0a84ff40, 2px 4px 16px #0003; }
  .submit:disabled { background: #2c2c2e; color: #86868b; }
}
@media(max-width: 480px) { .apple-search-input { min-height: 52px; gap: 8px; padding-left: 10px; } input { font-size: 16px; } }
@media(prefers-reduced-motion: reduce) { .apple-search-input, button { transition: none; } }
.apple-search-input--glass {
  --input-surface: rgba(255,255,255,.55);
  background: linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.08)), var(--input-surface);
  border-color: rgba(255,255,255,.65);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: inset 0 1px 0 #ffffffb3, inset 0 -1px 0 #ffffff33, 0 8px 28px #00000024;
}
.apple-search-input--glass .submit:disabled { background: #ffffff30; color: var(--input-muted); }
.apple-search-input--glass:focus-within { border-color: #78b7ff; box-shadow: inset 0 1px 0 #ffffff80, 0 0 0 3px #007aff30, 0 8px 28px #00000024; }
@media(prefers-color-scheme: dark) {
  .apple-search-input--glass { --input-surface: rgba(28,28,30,.58); background: linear-gradient(135deg,#ffffff16,#ffffff04),var(--input-surface); border-color: #ffffff40; box-shadow: inset 0 1px 0 #ffffff40, 0 8px 28px #00000040; }
}
@supports not (backdrop-filter: blur(1px)) {
  .apple-search-input--glass { background: var(--input-surface); --input-surface: #f5f5f7; }
}
</style>
