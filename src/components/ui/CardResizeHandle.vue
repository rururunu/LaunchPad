<template>
  <button class="card-resize-handle" aria-label="拖动调整占用网格；方向键调整尺寸" :title="`${size.cols} 列 × ${size.rows} 行`" draggable="false"
    @pointerdown.stop.prevent="start" @pointermove.stop="move" @pointerup.stop="finish" @pointercancel.stop="cancel" @lostpointercapture="cancel"
    @click.stop.prevent @dragstart.stop.prevent @keydown.stop="keyboard">⌟</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{ size: { cols: number; rows: number } }>();
const emit = defineEmits<{ preview: [size: { cols: number; rows: number }]; save: [size: { cols: number; rows: number }] }>();
const active = ref(false);
let origin = { x: 0, y: 0, cols: 1, rows: 1 };
let latest = { cols: 1, rows: 1 };
let stepX = 1, stepY = 1, columns = 12;
function measure(target: HTMLElement) {
  const grid = target.parentElement!.parentElement!;
  const css = getComputedStyle(grid);
  const tracks = css.gridTemplateColumns.split(' ');
  columns = tracks.length;
  stepX = parseFloat(tracks[0]) + parseFloat(css.columnGap);
  stepY = parseFloat(css.gridAutoRows) + parseFloat(css.rowGap);
}
function start(event: PointerEvent) {
  if (event.button !== 0) return;
  const target = event.currentTarget as HTMLElement;
  measure(target);
  origin = { x: event.clientX, y: event.clientY, cols: Math.min(columns, props.size.cols), rows: props.size.rows };
  latest = { cols: origin.cols, rows: origin.rows };
  active.value = true;
  target.setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!active.value) return;
  latest = { cols: Math.max(1, Math.min(columns, origin.cols + Math.round((event.clientX - origin.x) / stepX))), rows: Math.max(1, Math.min(6, origin.rows + Math.round((event.clientY - origin.y) / stepY))) };
  emit('preview', latest);
}
function finish() { if (active.value) { active.value = false; emit('save', latest); } }
function cancel() { if (active.value) { active.value = false; emit('preview', { cols: origin.cols, rows: origin.rows }); } }
function keyboard(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  measure(event.currentTarget as HTMLElement);
  emit('save', { cols: Math.max(1, Math.min(columns, props.size.cols + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0))), rows: Math.max(1, Math.min(6, props.size.rows + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0))) });
}
</script>

<style scoped>
.card-resize-handle { position: absolute; right: 2px; bottom: 2px; z-index: 5; width: 26px; height: 26px; border: 0; border-radius: 7px; background: rgba(128,128,128,.12); color: #777; cursor: nwse-resize; touch-action: none; font-size: 22px; line-height: 1; }
.card-resize-handle:focus-visible { outline: 2px solid #007aff; }
</style>
