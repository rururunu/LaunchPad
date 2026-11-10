<template>
  <div class="widget-frame">
    <iframe ref="frame" :src="source" sandbox="allow-scripts" :title="title" @load="render" />
    <p v-if="blocked" class="blocked" role="alert">组件脚本被浏览器拦截。请在扩展管理页重新加载 LaunchPad，再刷新此页。</p>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getWidgetData, setWidgetData, subscribeWidgetData } from '@/utils/widgetData';

const props = defineProps<{ code: string; title: string; widgetId?: string }>();
const frame = ref<HTMLIFrameElement>();
const source = '/widget-sandbox.html';
const instance = Symbol('widget-frame');
const blocked = ref(false);
let unsubscribe: (() => void) | undefined;
let readyTimer: ReturnType<typeof setTimeout> | undefined;
let ready = false;

function render() {
  ready = false;
  clearTimeout(readyTimer);
  frame.value?.contentWindow?.postMessage({ type: 'widget-render', code: props.code }, '*');
  // 沙箱页注入的脚本会回报 ready；迟迟不来，说明内联脚本被拦截（通常是扩展清单还是旧的）
  readyTimer = setTimeout(() => { if (!ready) blocked.value = true; }, 2500);
}
watch(() => props.code, render);

const send = (message: Record<string, unknown>) => frame.value?.contentWindow?.postMessage({ lp: 1, ...message }, '*');

// 沙箱里的 lp.get / lp.set 请求只认自己的 iframe，并且只能读写本组件的命名空间
async function onMessage(event: MessageEvent) {
  if (!frame.value || event.source !== frame.value.contentWindow) return;
  const data = event.data;
  if (!data || data.lp !== 1) return;
  if (data.type === 'ready') { ready = true; blocked.value = false; clearTimeout(readyTimer); return; }
  if (typeof data.id !== 'number') return;
  try {
    if (!props.widgetId) { send({ id: data.id, value: null }); return; }
    if (data.op === 'get') send({ id: data.id, value: await getWidgetData(props.widgetId, data.key) });
    else if (data.op === 'set') { await setWidgetData(props.widgetId, data.key, data.value, instance); send({ id: data.id, value: true }); }
  } catch (e) {
    send({ id: data.id, error: e instanceof Error ? e.message : String(e) });
  }
}

function subscribe() {
  unsubscribe?.();
  unsubscribe = props.widgetId
    ? subscribeWidgetData(props.widgetId, (key, value, origin) => { if (origin !== instance) send({ type: 'change', key, value }); })
    : undefined;
}

onMounted(() => { window.addEventListener('message', onMessage); subscribe(); });
watch(() => props.widgetId, subscribe);
onBeforeUnmount(() => { window.removeEventListener('message', onMessage); unsubscribe?.(); clearTimeout(readyTimer); });
</script>
<style scoped>
.widget-frame { position: relative; width: 100%; height: 100%; }
iframe { display: block; width: 100%; height: 100%; border: 0; background: transparent; }
.blocked { position: absolute; inset: auto 8px 8px; margin: 0; padding: 6px 10px; border-radius: 10px; font-size: 11px; line-height: 1.4; color: #fff; background: rgba(255, 59, 48, 0.92); }
</style>
