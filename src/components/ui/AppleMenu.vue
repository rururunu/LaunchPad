<template>
  <div ref="root" class="apple-menu" :class="{ 'is-open': open }">
    <button
      type="button"
      class="apple-menu-trigger"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="apple-menu-value" :style="{ fontFamily: current?.fontFamily }">{{ current?.label }}</span>
      <svg class="apple-menu-chevron" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <Transition name="apple-menu-reveal">
      <div
        v-if="open"
        ref="menu"
        :id="menuId"
        :aria-activedescendant="activeOptionId"
        class="apple-menu-popover"
        role="listbox"
        tabindex="-1"
        :aria-label="ariaLabel"
        :style="popoverStyle"
        @keydown="onMenuKey"
      >
        <div v-for="(group, groupIndex) in groups" :key="group.label ?? groupIndex" class="apple-menu-group">
          <div v-if="group.label" class="apple-menu-group-label">{{ group.label }}</div>
          <button
            v-for="option in group.options"
            :key="option.value"
            :id="`${menuId}-${flat.findIndex(item => item.value === option.value)}`"
            tabindex="-1"
            type="button"
            class="apple-menu-item"
            role="option"
            :aria-selected="option.value === modelValue"
            :class="{ 'is-selected': option.value === modelValue, 'is-active': option.value === activeValue }"
            @mouseenter="activeValue = option.value"
            @click="choose(option.value)"
          >
            <svg class="apple-menu-check" viewBox="0 0 16 16" aria-hidden="true">
              <path v-if="option.value === modelValue" d="M3.5 8.2 6.4 11.1 12.5 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="apple-menu-name" :style="sample ? undefined : { fontFamily: option.fontFamily }">{{ option.label }}</span>
            <span v-if="sample" class="apple-menu-sample" :style="{ fontFamily: option.fontFamily }">{{ sample }}</span>
          </button>
        </div>
      </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, useId } from 'vue'

export interface AppleMenuOption {
  value: string
  label: string
  fontFamily?: string
}

export interface AppleMenuGroup {
  label?: string
  options: AppleMenuOption[]
}

const props = defineProps<{
  modelValue: string
  groups: AppleMenuGroup[]
  ariaLabel?: string
  sample?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  open: []
}>()

const menuId = useId();
const activeOptionId = computed(() => `${menuId}-${flat.value.findIndex(item => item.value === activeValue.value)}`);
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const open = ref(false)
const activeValue = ref(props.modelValue)
const popover = ref({ top: 0, left: 0, width: 280, maxHeight: 320, upward: false })

const flat = computed(() => props.groups.flatMap((group) => group.options))
const current = computed(() => flat.value.find((option) => option.value === props.modelValue) ?? flat.value[0])

const popoverStyle = computed(() => ({
  top: `${popover.value.top}px`,
  left: `${popover.value.left}px`,
  width: `${popover.value.width}px`,
  maxHeight: `${popover.value.maxHeight}px`,
  transform: popover.value.upward ? 'translateY(-100%)' : undefined,
}))

function place() {
  const trigger = root.value?.querySelector('.apple-menu-trigger')
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const width = Math.min(Math.max(280, rect.width), window.innerWidth - 16)
  const spaceBelow = window.innerHeight - rect.bottom - 12
  const spaceAbove = rect.top - 12
  const upward = spaceBelow < 220 && spaceAbove > spaceBelow
  const available = Math.max(80, upward ? spaceAbove : spaceBelow)
  popover.value = {
    top: upward ? rect.top - 6 : rect.bottom + 6,
    left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    width,
    maxHeight: Math.min(360, available),
    upward,
  }
}

function toggle() {
  open.value = !open.value
}

function closeAndFocus() {
  open.value = false
  root.value?.querySelector<HTMLButtonElement>('.apple-menu-trigger')?.focus({ preventScroll: true })
}

function choose(value: string) {
  emit('update:modelValue', value)
  closeAndFocus()
}

function move(step: number) {
  const options = flat.value
  if (!options.length) return
  const index = Math.max(0, options.findIndex((option) => option.value === activeValue.value))
  const next = options[(index + step + options.length) % options.length]
  activeValue.value = next.value
  nextTick(() => {
    menu.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
  })
}

function onTriggerKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    open.value = true
  }
}

function onMenuKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const option = event.key === 'Home' ? flat.value[0] : flat.value.at(-1)
    if (option) activeValue.value = option.value
    nextTick(() => menu.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }))
  } else if (event.key === 'Tab') {
    closeAndFocus()
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(activeValue.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeAndFocus()
  }
}

function onPointerDown(event: MouseEvent) {
  const target = event.target as Node
  if (root.value?.contains(target) || menu.value?.contains(target)) return
  open.value = false
}

function onScroll(event: Event) {
  if (menu.value?.contains(event.target as Node)) return
  place()
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  activeValue.value = props.modelValue
  emit('open')
  await nextTick()
  place()
  if (!open.value) return
  menu.value?.focus({ preventScroll: true })
  menu.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', onScroll, true)
})

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
  } else {
    document.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', onScroll, true)
  }
})
</script>

<style>
.apple-menu { position: relative; flex: 0 1 auto; }

.apple-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  height: 32px;
  margin: 6px 0;
  padding: 0 10px 0 12px;
  border: 1px solid rgba(60, 60, 67, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
  font: inherit;
  cursor: pointer;
}

.apple-menu.is-open .apple-menu-trigger,
.apple-menu-trigger:focus-visible {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.22);
}

.apple-menu-value {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.apple-menu-chevron {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #8e8e93;
}

.apple-menu-popover {
  position: fixed;
  z-index: 1400;
  overflow: auto;
  padding: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16), 0 0 0 0.5px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  outline: none;
}

.apple-menu-group + .apple-menu-group { margin-top: 4px; }

.apple-menu-group-label {
  padding: 6px 10px 4px;
  font-size: 11px;
  line-height: 1.2;
  color: #6e6e73;
}

.apple-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1d1d1f;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.apple-menu-item.is-active {
  background: #007aff;
  color: #fff;
}

.apple-menu-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #007aff;
}

.apple-menu-item.is-active .apple-menu-check { color: #fff; }

.apple-menu-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.apple-menu-sample {
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

@media (prefers-color-scheme: dark) {
  .apple-menu-trigger {
    border-color: rgba(255, 255, 255, 0.12);
    background: #3a3a3c;
    box-shadow: none;
    color: #f5f5f7;
  }

  .apple-menu-popover {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(44, 44, 46, 0.92);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  }

  .apple-menu-group-label { color: #98989d; }
  .apple-menu-item { color: #f5f5f7; }
  .apple-menu-item.is-active { background: #0a84ff; }
  .apple-menu-check { color: #0a84ff; }
  .apple-menu-item.is-active .apple-menu-check { color: #fff; }
}
.apple-menu-popover { box-sizing: border-box; overscroll-behavior: contain; }
.apple-menu-trigger { transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease; }
.apple-menu-trigger:hover { border-color: #8e8e9366; }
.apple-menu-chevron { transition: transform 160ms ease; }
.apple-menu.is-open .apple-menu-chevron { transform: rotate(180deg); }
.apple-menu-reveal-enter-active { transition: opacity 140ms ease; }
.apple-menu-reveal-leave-active { transition: opacity 100ms ease; pointer-events: none; }
.apple-menu-reveal-enter-from, .apple-menu-reveal-leave-to { opacity: 0; }
@media (pointer: coarse) { .apple-menu-trigger, .apple-menu-item { min-height: 44px; } }
@media (prefers-reduced-motion: reduce) {
  .apple-menu-trigger, .apple-menu-chevron, .apple-menu-reveal-enter-active, .apple-menu-reveal-leave-active { transition: none; }
}
</style>
