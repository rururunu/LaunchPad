<template>
  <Teleport to="body">
    <dialog ref="dialog" class="icon-editor" aria-labelledby="icon-editor-title" @cancel.prevent="close" @click="backdrop">
      <header><div><h2 id="icon-editor-title">编辑图标</h2><p>{{ link.label }}</p></div><button class="icon-close" type="button" aria-label="关闭" :disabled="saving" @click="close">×</button></header>
      <main tabindex="0" aria-label="图标选择与设置">
        <p class="hint">选择网站图标，或上传自己的图片。下方显示图片的实际分辨率。</p>
        <div class="icon-candidates" role="group" aria-label="候选图标">
          <button v-for="candidate in candidates" :key="candidate.url" type="button" :disabled="candidate.failed" :aria-pressed="selected === candidate.url" @click="selected = candidate.url">
            <img v-if="!candidate.failed" :src="candidate.url" alt="" referrerpolicy="no-referrer" @load="loaded(candidate, $event)" @error="candidate.failed = true" />
            <span v-else class="unavailable">不可用</span>
            <span>{{ candidate.label }}</span><small>{{ candidate.failed ? '未找到图片' : candidate.resolution || '加载中…' }}</small>
          </button>
        </div>
        <p v-if="discovering" class="hint" role="status">正在查找网站声明的图标…</p>
        <p v-else class="hint">{{ discoveryNote }}</p>
        <label class="icon-background">卡片背景色 <input v-model="background" type="color" @input="backgroundEdited = true" aria-label="卡片背景色" /><span>{{ background }}</span></label>
        <div class="icon-upload"><label for="icon-upload-file">上传图片</label><input id="icon-upload-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" :disabled="uploading || saving" @change="upload" /><small>PNG、JPG、WebP、GIF、SVG，最大 2 MB</small></div>
        <form class="icon-url" @submit.prevent="addUrl"><label for="icon-url-input">图片链接</label><div><input id="icon-url-input" v-model="urlInput" type="url" placeholder="https://example.com/logo.svg" /><button type="submit">获取</button></div></form>
        <p v-if="message" class="error" role="alert">{{ message }}</p>
      </main>
      <footer><button type="button" :disabled="saving" @click="save(undefined)">恢复自动图标</button><div><button type="button" :disabled="saving" @click="close">取消</button><button type="button" class="primary" :disabled="!canSave || saving || uploading" @click="save(selected)">{{ saving ? '保存中…' : '使用此图标' }}</button></div></footer>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { defaultIconCandidates, parsePageIcons, type IconCandidate } from '@/utils/iconCandidates';
import { useQuickLinks, type QuickLink } from '@/composables/useQuickLinks';
const props = defineProps<{ link: QuickLink }>();
const emit = defineEmits<{ close: [] }>();
type Candidate = IconCandidate & { failed?: boolean; resolution?: string };
const dialog = ref<HTMLDialogElement>();
const candidates = ref<Candidate[]>([]);
const selected = ref(props.link.iconUrl ?? '');
const background = ref(/^#[0-9a-f]{6}$/i.test(props.link.iconBackground ?? '') ? props.link.iconBackground! : '#ffffff');
const backgroundEdited = ref(false);
const urlInput = ref('');
const message = ref('');
const saving = ref(false);
const uploading = ref(false);
const discovering = ref(true);
const discoveryNote = ref('');
const { quickLinks, saveQuickLinks } = useQuickLinks();
const canSave = computed(() => candidates.value.some(c => c.url === selected.value && !c.failed && c.resolution));
const controller = new AbortController();
let mounted = true;
const previousFocus = document.activeElement as HTMLElement | null;
function append(items: IconCandidate[]) {
  for (const item of items) if (!candidates.value.some(c => c.url === item.url)) candidates.value.push(item);
}
function loaded(candidate: Candidate, event: Event) {
  const img = event.target as HTMLImageElement;
  candidate.resolution = /(?:\.svg(?:[?#]|$)|^data:image\/svg\+xml)/i.test(candidate.url) ? 'SVG · 矢量' : `${img.naturalWidth} × ${img.naturalHeight}`;
}
function close() { if (!saving.value) emit('close'); }
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return;
  const rect = dialog.value!.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
}
function addUrl() {
  try {
    const url = new URL(urlInput.value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    append([{ url: url.href, label: '自定义链接' }]); selected.value = url.href; message.value = '';
  } catch { message.value = '请输入有效的 HTTP 或 HTTPS 图片地址。'; }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading.value = true; message.value = '';
  try {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'].includes(file.type)) throw new Error('不支持这种图片格式。');
    if (file.size > 2 * 1024 * 1024) throw new Error('图片不能超过 2 MB。');
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    const img = new Image(); img.src = data; await img.decode();
    if (!mounted) return;
    append([{ url: data, label: file.name }]); selected.value = data;
  } catch (e) { message.value = e instanceof Error ? e.message : '图片无法读取，请换一张图片。'; }
  finally { uploading.value = false; input.value = ''; }
}
async function save(iconUrl: string | undefined) {
  if (saving.value) return;
  if (!quickLinks.value.some(item => item.id === props.link.id)) { message.value = '这个网站已被删除。'; return; }
  saving.value = true; message.value = '';
  const previous = quickLinks.value;
  try {
    await saveQuickLinks(previous.map(item => {
      if (item.id !== props.link.id) return item;
      const next = { ...item }; if (iconUrl) { next.iconUrl = iconUrl; if (backgroundEdited.value || props.link.iconBackground) next.iconBackground = background.value; else delete next.iconBackground; } else { delete next.iconUrl; delete next.iconBackground; }
      return next;
    }));
    emit('close');
  } catch { quickLinks.value = previous; message.value = '图标保存失败，请重试或选择较小的图片。'; }
  finally { saving.value = false; }
}
onMounted(async () => {
  dialog.value?.showModal();
  if (props.link.iconUrl) append([{ url: props.link.iconUrl, label: '当前图标' }]);
  try { append(defaultIconCandidates(props.link.url)); } catch { /* Upload still works for invalid URLs. */ }
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(props.link.url, { credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error();
    const discovered = parsePageIcons(await response.text(), response.url || props.link.url);
    if (mounted) { append(discovered); discoveryNote.value = discovered.length ? '已找到网站声明的图标，可比较后选择。' : '未发现更多图标，可以选择上方候选或上传图片。'; }
  } catch { if (mounted) discoveryNote.value = '网站限制了自动读取；仍可选择可用候选、粘贴图片链接或上传图片。'; }
  finally { clearTimeout(timeout); discovering.value = false; }
});
onBeforeUnmount(() => { mounted = false; controller.abort(); dialog.value?.close(); previousFocus?.focus(); });
</script>

<style scoped>
.icon-editor {
  --panel: #fff; --subtle: #f5f5f7; --ink: #1d1d1f; --secondary: #6e6e73; --line: #d2d2d7; --accent: #0071e3;
  position: fixed; inset: 0; margin: auto;
  width: min(640px, calc(100vw - 32px)); max-height: min(820px, calc(100dvh - 48px));
  padding: 0; overflow: hidden; box-sizing: border-box;
  border: 1px solid #00000014; border-radius: 28px;
  color: var(--ink); background: var(--panel);
  box-shadow: 0 24px 80px #00000029, 0 4px 16px #00000014;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px; line-height: 1.45; color-scheme: light;
}
.icon-editor[open] { display: flex; flex-direction: column; animation: dialog-appear .18s ease-out; }
.icon-editor::backdrop { background: #00000040; backdrop-filter: blur(8px); }
header, footer { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; }
header { border-bottom: 1px solid var(--line); } h2 { margin: 0; font-size: 22px; letter-spacing: -.4px; font-weight: 600; }
header p { margin: 4px 0 0; color: var(--secondary); font-size: 13px; }
main { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 24px; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: #b5b5ba transparent; }
main::-webkit-scrollbar { width: 8px; } main::-webkit-scrollbar-thumb { background: #b5b5ba; border: 2px solid var(--panel); border-radius: 8px; }
.hint, small { color: var(--secondary); font-size: 12px; } .hint { margin: 0 0 18px; line-height: 1.6; }
button { border: 1px solid transparent; border-radius: 10px; min-height: 36px; padding: 8px 14px; background: var(--subtle); color: var(--ink); cursor: pointer; font: inherit; font-size: 13px; transition: background .15s, box-shadow .15s; }
button:hover:not(:disabled) { box-shadow: 0 2px 8px #00000014; background: #e8e8ed; }
button:active:not(:disabled) { box-shadow: inset 0 1px 3px #00000014; }
button:disabled { color: var(--secondary); cursor: default; }
button:focus-visible, input:focus-visible, main:focus-visible { outline: 3px solid #0071e366; outline-offset: 3px; }
.icon-close { border-radius: 50%; padding: 0; width: 32px; min-height: 32px; font-size: 20px; color: var(--secondary); }
.icon-candidates { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.icon-candidates button { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 0; padding: 18px 10px; border: 2px solid transparent; border-radius: 18px; }
.icon-candidates button[aria-pressed=true] { border-color: var(--accent); background: #0071e30a; }
.icon-candidates button[aria-pressed=true]::after { content: '✓'; position: absolute; top: 7px; right: 8px; width: 20px; height: 20px; border-radius: 50%; color: white; background: var(--accent); font-size: 12px; line-height: 20px; }
.icon-candidates img, .unavailable { width: 64px; height: 64px; object-fit: contain; }
.unavailable { display: grid; place-items: center; color: var(--secondary); font-size: 12px; }
.icon-candidates button > span:not(.unavailable) { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon-upload, .icon-url { display: flex; flex-direction: column; gap: 10px; margin-top: 24px; font-size: 13px; }
.icon-upload input { max-width: 100%; font: inherit; color: var(--secondary); }
.icon-upload input::file-selector-button { margin-right: 12px; padding: 9px 14px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); background: var(--subtle); cursor: pointer; font: inherit; }
.icon-url > div { display: flex; gap: 8px; }
.icon-url input { flex: 1; min-width: 0; border: 1px solid var(--line); padding: 10px 12px; border-radius: 10px; background: var(--panel); color: var(--ink); font: inherit; }
.error { color: #d70015; font-size: 13px; }
footer { border-top: 1px solid var(--line); flex-wrap: wrap; background: var(--panel); }
footer > div { display: flex; gap: 8px; } footer > button { background: transparent; color: var(--accent); }
.primary { background: var(--accent); color: white; } .primary:hover:not(:disabled) { background: #0077ed; } .primary:disabled { background: var(--subtle); color: var(--secondary); }
.icon-background { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--subtle); border-radius: 14px; font-size: 13px; margin-top: 20px; }
.icon-background input { width: 34px; height: 28px; border: 0; padding: 0; cursor: pointer; background: transparent; }
.icon-background span { color: var(--secondary); font-variant-numeric: tabular-nums; }
@keyframes dialog-appear { from { opacity: 0; } to { opacity: 1; } }
@media(prefers-reduced-motion: reduce) { .icon-editor[open] { animation: none; } button { transition: none; } }
@media(prefers-color-scheme: dark) {
  .icon-editor { --panel: #1c1c1e; --subtle: #2c2c2e; --ink: #f5f5f7; --secondary: #a1a1a6; --line: #38383a; --accent: #0a84ff; color-scheme: dark; border-color: #ffffff1f; }
  button:hover:not(:disabled) { background: #3a3a3c; }
  main { scrollbar-color: #636366 transparent; }
  main::-webkit-scrollbar-thumb { background: #636366; }
}
@media(max-width: 480px) { .icon-candidates { grid-template-columns: repeat(2, minmax(0, 1fr)); } header, footer, main { padding: 16px; } footer { gap: 8px; } .icon-editor { max-height: calc(100dvh - 24px); border-radius: 22px; } }
</style>
