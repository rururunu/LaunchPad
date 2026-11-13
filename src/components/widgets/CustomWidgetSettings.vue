<template>
  <section class="apple-section">
    <h3 class="apple-header">{{ t('widgets.title') }}</h3>
    <div class="apple-group">
    <div class="apple-pad">
    <h4 class="gallery-title">{{ t('widgets.builtIn') }}</h4>
    <div class="gallery">
      <div v-for="tpl in WIDGET_TEMPLATES" :key="tpl.id" class="gallery-item">
        <div class="gallery-text"><strong>{{ t(`widgets.templates.${tpl.id}.title`) }}</strong><small>{{ t(`widgets.templates.${tpl.id}.description`) }}</small></div>
        <button type="button" class="gallery-add" :disabled="saving" @click="addTemplate(tpl)">{{ t('widgets.add') }}</button>
      </div>
    </div>
    <h4 v-if="custom.length" class="gallery-title">{{ t('widgets.added') }}</h4>
    <div v-for="item in custom" :key="item.id" class="widget-row"><span>{{ item.title }}</span><button class="settings-btn" @click="edit(item)">{{ t('widgets.edit') }}</button><button class="settings-btn" @click="remove(item.id)">{{ t('widgets.delete') }}</button></div>
    <button class="settings-btn settings-btn--primary" @click="create">{{ t('widgets.create') }}</button>
    <form v-if="draft" class="widget-editor" @submit.prevent="save">
      <label class="settings-field">{{ t('widgets.name') }}<input v-model="draft.title" required maxlength="60" class="settings-input" /></label>
      <div class="bounds"><label v-for="field in fields" :key="field.key">{{ field.label }}<input v-model.number="draft[field.key]" type="number" min="1" :max="field.key.includes('Cols') ? 12 : 6" required class="settings-input" /></label></div>
      <label class="settings-field">{{ t('widgets.cardCode') }}<textarea v-model="draft.code" required spellcheck="false" /></label>
      <label class="settings-field">{{ t('widgets.popupCode') }}<textarea v-model="draft.popupCode" spellcheck="false" /></label>
      <div class="widget-row"><button type="button" class="settings-btn" @click="preview = draft.code || ''">{{ t('widgets.previewCard') }}</button><button type="button" class="settings-btn" :disabled="!draft.popupCode" @click="popup = draft.popupCode || ''">{{ t('widgets.previewPopup') }}</button><button type="button" class="settings-btn" :title="t('widgets.copyPromptTitle')" @click="copyPrompt">{{ copied ? t('widgets.copied') : copyFailed ? t('widgets.copyFailed') : t('widgets.copyPrompt') }}</button></div>
      <div v-if="preview" class="preview"><CustomWidgetFrame :code="preview" :title="draft.title || t('widgets.preview')" /></div>
      <p v-if="error" role="alert">{{ error }}</p>
      <div class="widget-row"><button class="settings-btn settings-btn--primary" :disabled="saving">{{ t('widgets.save') }}</button><button type="button" class="settings-btn" @click="draft = null">{{ t('widgets.cancel') }}</button></div>
    </form>
    <WidgetPopup v-if="popup" :title="t('widgets.popupPreview')" :code="popup" @close="popup = ''" />
    </div>
    </div>
    <p class="apple-footnote">{{ t('widgets.hint') }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import { useQuickLinks, type QuickAccessWidgetInstance } from '@/composables/useQuickLinks';
import CustomWidgetFrame from './CustomWidgetFrame.vue';
import WidgetPopup from './WidgetPopup.vue';
import { buildWidgetPrompt } from '@/utils/widgetPrompt';
import { createWidgetFromTemplate, WIDGET_TEMPLATES, type WidgetTemplate } from '@/utils/widgetTemplates';
import { removeWidgetData } from '@/utils/widgetData';
import { useNotification } from '@/composables/useNotification';
const { t } = useI18n();
const { quickAccessWidgets, loadQuickAccessWidgets, saveQuickAccessWidgets } = useQuickLinks();
const custom = computed(() => quickAccessWidgets.value.filter(w => w.type === 'custom'));
const draft = ref<QuickAccessWidgetInstance | null>(null);
const error = ref(''), preview = ref(''), popup = ref('');
const saving = ref(false);
const copied = ref(false), copyFailed = ref(false);
let copyTimer = 0;
async function writeClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const area = document.createElement('textarea');
    area.value = text; area.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  }
}
async function copyPrompt() {
  if (!draft.value) return;
  const ok = await writeClipboard(buildWidgetPrompt(draft.value));
  copied.value = ok; copyFailed.value = !ok;
  clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => { copied.value = false; copyFailed.value = false; }, 2000);
}
const fields = computed(() => [
  { key: 'minCols' as const, label: t('widgets.minCols') },
  { key: 'minRows' as const, label: t('widgets.minRows') },
  { key: 'maxCols' as const, label: t('widgets.maxCols') },
  { key: 'maxRows' as const, label: t('widgets.maxRows') },
]);
function create() { edit({ id: crypto.randomUUID(), type: 'custom', size: 'medium', title: t('widgets.defaultTitle'), minCols: 1, minRows: 1, maxCols: 4, maxRows: 3, gridSize: { cols: 2, rows: 2 }, code: `<div style="padding:24px;background:#f5f5f7;height:100vh"><h2>${t('widgets.hello')}</h2><button onclick="this.textContent=Number(this.textContent)+1">0</button></div>`, popupCode: '' }); }
function edit(item: QuickAccessWidgetInstance) { draft.value = { ...item }; error.value = ''; preview.value = ''; }
async function remove(id: string) { await saveQuickAccessWidgets(quickAccessWidgets.value.filter(w => w.id !== id)); await removeWidgetData(id); if (draft.value?.id === id) draft.value = null; }
const notify = useNotification();
async function addTemplate(tpl: WidgetTemplate) {
  saving.value = true;
  try {
    const title = t(`widgets.templates.${tpl.id}.title`);
    await saveQuickAccessWidgets([...quickAccessWidgets.value, createWidgetFromTemplate({ ...tpl, title })]);
    notify.success(t('widgets.addedToast'), t('widgets.addedDetail', { name: title }));
  } catch { notify.error(t('widgets.addFailed'), t('widgets.retry')); } finally { saving.value = false; }
}
async function save() {
  if (!draft.value) return;
  const item = { ...draft.value }; error.value = '';
  if (fields.value.some(f => !Number.isInteger(item[f.key]) || item[f.key]! < 1 || item[f.key]! > (f.key.includes('Cols') ? 12 : 6)) || item.minCols! > item.maxCols! || item.minRows! > item.maxRows!) { error.value = t('widgets.invalidRange'); return; }
  if ((item.code?.length ?? 0) + (item.popupCode?.length ?? 0) > 200000) { error.value = t('widgets.tooLong'); return; }
  item.gridSize = { cols: Math.max(item.minCols!, Math.min(item.maxCols!, item.gridSize?.cols ?? 2)), rows: Math.max(item.minRows!, Math.min(item.maxRows!, item.gridSize?.rows ?? 2)) };
  saving.value = true;
  try { await saveQuickAccessWidgets([...quickAccessWidgets.value.filter(w => w.id !== item.id), item]); draft.value = null; }
  catch { error.value = t('widgets.saveFailed'); } finally { saving.value = false; }
}
onMounted(loadQuickAccessWidgets);
</script>
<style scoped>
.widget-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }.widget-row span { flex: 1; }.widget-editor { display: flex; flex-direction: column; gap: 16px; padding: 16px; background: var(--ui-surface-soft); border-radius: 16px; }.bounds { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }textarea { min-height: 150px; resize: vertical; padding: 12px; border: 1px solid var(--ui-border); border-radius: 10px; font: 13px ui-monospace, monospace; background: var(--ui-surface); color: var(--ui-text); }.preview { height: 200px; overflow: hidden; border-radius: 18px; }
.gallery-title { margin: 4px 0 0; font-size: 13px; font-weight: 400; color: #6e6e73; }
.gallery { display: flex; flex-direction: column; margin: 0 -16px; }
.gallery-item { position: relative; display: flex; align-items: center; gap: 16px; min-height: 60px; padding: 10px 16px; }
.gallery-item + .gallery-item::before { content: ""; position: absolute; top: 0; left: 16px; right: 0; height: 1px; background: rgba(60, 60, 67, 0.12); }
.gallery-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.gallery-text strong { font-size: 15px; font-weight: 400; color: var(--ui-text); }
.gallery-text small { font-size: 12px; line-height: 1.45; color: #6e6e73; }
.gallery-add { flex: none; white-space: nowrap; height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: #007aff; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
.gallery-add:hover:not(:disabled) { background: #0071eb; }
.gallery-add:disabled { opacity: 0.45; cursor: default; }
.gallery-add:focus-visible { outline: 2px solid #007aff; outline-offset: 2px; }
@media (prefers-color-scheme: dark) {
  .gallery-title, .gallery-text small { color: #98989d; }
  .gallery-item + .gallery-item::before { background: rgba(84, 84, 88, 0.65); }
  .gallery-add { background: #0a84ff; }
  .gallery-add:hover:not(:disabled) { background: #0077ed; }
}
</style>
