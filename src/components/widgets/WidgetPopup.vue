<template><Teleport to="body"><dialog ref="dialog" @close="$emit('close')" aria-label="小组件"><header>{{ title }}<button @click="dialog?.close()" aria-label="关闭">×</button></header><CustomWidgetFrame :code="code" :title="title" :widget-id="widgetId" /></dialog></Teleport></template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import CustomWidgetFrame from './CustomWidgetFrame.vue';
defineProps<{ title: string; code: string; widgetId?: string }>();
defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
onMounted(() => dialog.value?.showModal());
</script>
<style scoped>
dialog { position: fixed; inset: 0; margin: auto; width: min(800px, 94vw); height: min(640px, 85dvh); padding: 0; border: 1px solid #8883; border-radius: 24px; background: var(--ui-surface, white); color: var(--ui-text); box-shadow: 0 24px 80px #0004; overflow: hidden; }
dialog[open] { display: flex; flex-direction: column; } header { padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; } button { border: 0; background: transparent; color: inherit; font-size: 24px; cursor: pointer; } .widget-frame { flex: 1; min-height: 0; height: auto; } dialog::backdrop { background: #0006; backdrop-filter: blur(8px); }
</style>
