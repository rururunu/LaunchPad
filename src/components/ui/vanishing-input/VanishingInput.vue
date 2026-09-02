<template>
  <form id="van-form" :class="[
    'relative mx-auto h-12 w-full max-w-xl overflow-hidden rounded-full bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),_0px_1px_0px_0px_rgba(25,28,33,0.02),_0px_0px_0px_1px_rgba(25,28,33,0.08)] transition duration-200 dark:bg-zinc-800',
    vanishingText && 'bg-gray-50',
  ]" @submit.prevent="handleSubmit">
    <!-- Left icon slot -->
    <div
      v-if="hasLeftIcon"
      class="absolute left-0 top-0 h-full flex items-center pl-3 z-[51] pointer-events-none"
    >
      <div class="pointer-events-auto">
        <slot name="left-icon" />
      </div>
    </div>

    <!-- Canvas Element -->
    <canvas ref="canvasRef" :class="[
      'pointer-events-none absolute top-[20%] origin-top-left scale-50 pr-20 text-base invert dark:invert-0',
      hasLeftIcon ? 'left-10 sm:left-11' : 'left-2 sm:left-8',
      animating ? 'opacity-100' : 'opacity-0',
    ]" />

    <!-- Text Input -->
    <input ref="inputRef" :disabled="animating" type="text"
      class="relative z-50 size-full rounded-full border-none bg-transparent pr-20 text-sm text-black focus:outline-none focus:ring-0 sm:text-base dark:text-white"
      :class="[
        hasLeftIcon ? 'pl-10 sm:pl-11' : 'pl-4 sm:pl-10',
        animating ? 'text-transparent dark:text-transparent' : '',
      ]"
      @keydown="handleKeyDown" @focus="$emit('focus')" @blur="$emit('blur')"
      :value="vanishingText" @input="vanishingInput" />

    <!-- Submit Button -->
    <button :disabled="!vanishingText" type="submit"
      class="absolute right-2 top-1/2 z-50 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black transition duration-200 disabled:bg-gray-100 dark:bg-zinc-900 dark:disabled:bg-zinc-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="size-4 text-gray-300">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M5 12l14 0" :style="{
          strokeDasharray: '50%',
          strokeDashoffset: vanishingText ? '0' : '50%',
          transition: 'stroke-dashoffset 0.3s linear',
        }" />
        <path d="M13 18l6 -6" />
        <path d="M13 6l6 6" />
      </svg>
    </button>

    <!-- Placeholder Text -->
    <div class="pointer-events-none absolute inset-0 flex items-center rounded-full">
      <Transition v-show="!vanishingText" mode="out-in" enter-active-class="transition duration-300 ease-out"
        leave-active-class="transition duration-300 ease-in" enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0" leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4">
        <p :key="currentPlaceholder"
          class="w-[calc(100%-2rem)] truncate text-left text-sm font-normal text-neutral-500 sm:text-base dark:text-zinc-500"
          :class="hasLeftIcon ? 'pl-10 sm:pl-11' : 'pl-4 sm:pl-10'">
          {{ placeholders[currentPlaceholder] }}
        </p>
      </Transition>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, useSlots, onMounted, watch, onBeforeUnmount } from 'vue';
import { templateRef } from '@vueuse/core';

// Define interfaces for props and data structures
interface Props {
  placeholders: string[];
}

interface PixelData {
  x: number;
  y: number;
  color: string;
}

interface AnimatedPixel extends PixelData {
  r: number;
}

const vanishingText = defineModel<string>({
  default: '',
});
const emit = defineEmits(['submit', 'change', 'escape', 'focus', 'blur']);

const canvasRef = templateRef<HTMLCanvasElement>('canvasRef');
const inputRef = templateRef<HTMLInputElement>('inputRef');


// normal refs
const currentPlaceholder = ref<number>(0);
const animating = ref<boolean>(false);
const intervalRef = ref<number | null>(null);
const newDataRef = ref<AnimatedPixel[]>([]);
const animationFrame = ref<number | null>(null);

let escapeTimeout: ReturnType<typeof setTimeout> | null = null;

// props
const props = withDefaults(defineProps<Props>(), {
  placeholders: () => ['Placeholder 1', 'Placeholder 2', 'Placeholder 3'],
});

const slots = useSlots()
const hasLeftIcon = computed(() => !!slots['left-icon'])

// Focus on input when mounted
onMounted(() => {
  if (!inputRef.value) return;
});

function changePlaceholder(): void {
  intervalRef.value = window.setInterval(() => {
    currentPlaceholder.value = (currentPlaceholder.value + 1) % props.placeholders.length;
  }, 3000);
}

function handleVisibilityChange(): void {
  if (document.visibilityState !== 'visible' && intervalRef.value) {
    clearInterval(intervalRef.value);
    intervalRef.value = null;
  } else if (document.visibilityState === 'visible') {
    changePlaceholder();
  }
}

function draw(): void {
  if (!inputRef.value || !canvasRef.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const computedStyles = getComputedStyle(inputRef.value);

  canvas.width = 800;
  canvas.height = 800;
  ctx.clearRect(0, 0, 800, 800);

  const fontSize = parseFloat(computedStyles.getPropertyValue('font-size'));
  ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
  ctx.fillStyle = '#FFF';
  ctx.fillText(vanishingText.value, 16, 40);

  const imageData = ctx.getImageData(0, 0, 800, 800);
  const pixelData = imageData.data;
  const newData: PixelData[] = [];

  for (let t = 0; t < 800; t++) {
    let i = 4 * t * 800;
    for (let n = 0; n < 800; n++) {
      let e = i + 4 * n;
      if (pixelData[e] !== 0 && pixelData[e + 1] !== 0 && pixelData[e + 2] !== 0) {
        newData.push({
          x: n,
          y: t,
          color: `rgba(${pixelData[e]}, ${pixelData[e + 1]}, ${pixelData[e + 2]}, ${pixelData[e + 3]})`,
        });
      }
    }
  }
  newDataRef.value = newData.map(({ x, y, color }) => ({ x, y, r: 1, color }));
}

function animate(start: number = 0): void {
  animationFrame.value = requestAnimationFrame(() => {
    const newArr: AnimatedPixel[] = [];
    for (const current of newDataRef.value) {
      if (current.x < start) {
        newArr.push(current);
      } else {
        if (current.r <= 0) {
          current.r = 0;
          continue;
        }
        current.x += Math.random() > 0.5 ? 1 : -1;
        current.y += Math.random() > 0.5 ? 1 : -1;
        current.r -= 0.05 * Math.random();
        newArr.push(current);
      }
    }
    newDataRef.value = newArr;
    const ctx = canvasRef.value?.getContext('2d');
    if (ctx) {
      ctx.clearRect(start, 0, 800, 800);
      newDataRef.value.forEach(({ x, y, r, color }) => {
        if (x > start) {
          ctx.beginPath();
          ctx.rect(x, y, r, r);
          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      });
    }
    if (newDataRef.value.length > 0) {
      animate(start - 8);
    } else {
      vanishingText.value = '';
      animating.value = false;
      setTimeout(() => {
        // regain focus after animation
        inputRef.value.focus();
      }, 100);
    }
  });
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !animating.value) {
    e.preventDefault();
    vanishAndSubmit();
  } else if (e.key === 'Escape') {
    // 发出ESC键事件
    emit('escape');
  }
}

function vanishAndSubmit(): void {
  if (animating.value) return;
  animating.value = true;
  draw();
  if (vanishingText.value) {
    const maxX = Math.max(...newDataRef.value.map(({ x }) => x));
    animate(maxX);
    emit('submit', vanishingText.value);
  }
}

function handleSubmit(): void {
  vanishAndSubmit();
}

function vanishingInput(e: any): void {
  const newValue = e.target.value;
  vanishingText.value = newValue;
  
  // // 检测长按删除
  // if (newValue === '') {
  //   if (!isLongPressDelete.value) {
  //     isLongPressDelete.value = true;
  //     deleteTimeout = setTimeout(() => {
  //       isLongPressDelete.value = false;
  //     }, 300);
  //   }
  // }
  
  // // 立即检查空值
  // if (!newValue || newValue.trim() === '') {
  //   console.log('Emitting escape from input event');
    
  //   // 长按删除时不立即关闭，等待结束
  //   if (!isLongPressDelete.value) {
  //     emit('escape');
  //   }
  // }
}

// 添加长按删除状态跟踪
// const isLongPressDelete = ref(false);
// let deleteTimeout: ReturnType<typeof setTimeout> | null = null;

// // 添加键盘事件监听
// document.addEventListener('keyup', (e) => {
//   if (e.key === 'Backspace' || e.key === 'Delete') {
//     if (isLongPressDelete.value && deleteTimeout) {
//       clearTimeout(deleteTimeout);
//       isLongPressDelete.value = false;
//       // 长按删除结束后触发关闭
//       emit('escape');
//     }
//   }
// });

// 监听值变化
watch(vanishingText, (newVal) => {
  console.log('Watch value change:', newVal);
  // 只处理非空情况
  if (newVal && newVal.trim() !== '') {
    vanishingText.value = newVal;
    emit('change', { target: { value: newVal } });
  }
});

onMounted(() => {
  changePlaceholder();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
  if (intervalRef.value) {
    clearInterval(intervalRef.value);
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
});
</script>

<style lang="css" scoped>
#van-form {
  border: none;
  padding: 0;
  margin: 0 auto;
  font-size: inherit;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
}
</style>
