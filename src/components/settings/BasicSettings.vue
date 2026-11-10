<template>
  <div id="basic" class="settings-page">
    <div class="space-y-6">

      <section class="setting-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('basic.languageTitle') }}</h3>
          <p class="section-desc">{{ t('basic.languageDesc') }}</p>
        </div>
        <div class="language-options" role="radiogroup" :aria-label="t('basic.languageTitle')">
          <button
            v-for="option in localeOptions"
            :key="option.id"
            type="button"
            class="language-option"
            role="radio"
            :aria-checked="preference === option.id"
            @click="setLocalePreference(option.id)"
          >{{ option.native }}</button>
        </div>
      </section>

      <div class="divider" />

      <!-- 时间显示设置 -->
      <section class="setting-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('basic.timeTitle') }}</h3>
          <p class="section-desc">{{ t('basic.timeDesc') }}</p>
        </div>
        <div class="toggle-list">
          <label class="toggle-row">
            <input type="checkbox" v-model="showTimeValue" class="toggle-checkbox" />
            <span class="toggle-label">{{ t('basic.showTime') }}</span>
          </label>
          <label class="toggle-row ml-6" :class="{ 'opacity-40': !showTimeValue }">
            <input type="checkbox" v-model="showSecondsValue" :disabled="!showTimeValue" class="toggle-checkbox" />
            <span class="toggle-label">{{ t('basic.showSeconds') }}</span>
          </label>
          <label class="toggle-row ml-6" :class="{ 'opacity-40': !showTimeValue }">
            <input type="checkbox" v-model="use24HourValue" :disabled="!showTimeValue" class="toggle-checkbox" />
            <span class="toggle-label">{{ t('basic.hour24') }}</span>
          </label>
          <label class="toggle-row">
            <input type="checkbox" v-model="showDateValue" class="toggle-checkbox" />
            <span class="toggle-label">{{ t('basic.showDate') }}</span>
          </label>
        </div>
      </section>

      <div class="divider" />

      <!-- 字体设置 -->
      <section class="setting-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('basic.fontTitle') }}</h3>
          <p class="section-desc">{{ t('basic.fontDesc') }}</p>
        </div>
        <div class="font-grid">
          <button
            v-for="f in fontOptions"
            :key="f.value"
            class="font-card"
            :class="{ 'font-card--active': clockFontValue === f.value }"
            @click="selectFont(f.value)"
          >
            <span class="font-preview" :style="{ fontFamily: `'${f.value}', sans-serif` }">14:32</span>
            <span class="font-name">{{ f.label }}</span>
          </button>
        </div>
      </section>

      <div class="divider" />

      <!-- 字体大小 & 粗细 -->
      <section class="setting-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('basic.sizeTitle') }}</h3>
          <p class="section-desc">{{ t('basic.sizeDesc') }}</p>
        </div>

        <!-- 大小滑块 -->
        <div class="slider-row">
          <span class="slider-label">{{ t('basic.size') }}</span>
          <input
            type="range"
            class="size-slider"
            :min="48" :max="160" :step="8"
            v-model.number="clockFontSizeValue"
            @input="onFontSizeChange"
          />
          <span class="slider-value">{{ clockFontSizeValue }}px</span>
        </div>

        <!-- 粗细滑块 -->
        <div class="slider-row">
          <span class="slider-label">{{ t('basic.weight') }}</span>
          <input
            type="range"
            class="size-slider"
            min="300" max="700" step="100"
            v-model.number="clockFontWeightValue"
            @change="onFontWeightChange"
          />
          <span class="slider-value" :style="{ fontWeight: clockFontWeightValue }">{{ weightLabel }}</span>
        </div>

        <!-- 恢复默认 -->
        <button class="reset-btn" @click="resetToDefaults">
          <Icon icon="fluent:arrow-reset-24-regular" class="text-xs" />
          {{ t('basic.reset') }}
        </button>

        <!-- 实时预览 -->
        <div class="size-preview">
          <span
            :style="{
              fontFamily: `'${clockFontValue}', sans-serif`,
              fontSize: clockFontSizeValue * 0.35 + 'px',
              fontWeight: clockFontWeightValue,
              color: '#1f2937',
              lineHeight: 1,
            }"
          >14:32</span>
        </div>
      </section>

      <div class="divider" />

      <!-- 主色调设置 -->
      <section class="setting-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('basic.colorTitle') }}</h3>
          <p class="section-desc">{{ t('basic.colorDesc') }}</p>
        </div>

        <!-- 自定义颜色开关 -->
        <div class="toggle-list">
          <label class="toggle-row">
            <input type="checkbox" v-model="useCustomColorValue" class="toggle-checkbox" @change="onCustomColorToggle" />
            <span class="toggle-label">{{ t('basic.customColor') }}</span>
          </label>
          <p class="custom-color-hint" v-if="!useCustomColorValue">
            {{ t('basic.adaptiveColor') }}
          </p>
        </div>

        <div class="color-row" v-if="useCustomColorValue">
          <!-- 色块触发器 -->
          <div class="swatch-wrapper" ref="swatchWrapperRef">
            <button
              class="color-swatch"
              :style="{ backgroundColor: themeColorInput }"
              @click="togglePicker"
              :title="t('basic.pickColor')"
            />

            <!-- 气泡框 -->
            <Transition name="popover">
              <div v-if="showPicker" class="color-popover" ref="popoverRef">
                <!-- 色相条 -->
                <div
                  class="hue-bar"
                  ref="themeHueBar"
                  @click="selectThemeHue"
                  @mousedown="startThemeHueDrag"
                >
                  <div
                    class="hue-thumb"
                    :style="{ left: `${themeHuePosition}%`, backgroundColor: themeHueColor }"
                  />
                </div>

                <!-- 饱和度/亮度面板 -->
                <div
                  class="sb-panel"
                  ref="themeSatBrightnessArea"
                  :style="{
                    backgroundColor: themeHueColor,
                    backgroundImage: 'linear-gradient(to right, white, transparent), linear-gradient(to bottom, transparent, black)',
                  }"
                  @click="selectThemeSaturationBrightness"
                  @mousedown="startThemeSatBrightDrag"
                >
                  <div
                    class="sb-thumb"
                    :style="{ left: `${themeSaturationPosition}%`, top: `${themeBrightnessPosition}%` }"
                  />
                </div>

                <!-- 预设色 -->
                <div class="preset-grid">
                  <button
                    v-for="color in presetColors"
                    :key="color"
                    class="preset-chip"
                    :style="{ backgroundColor: color }"
                    :class="{ 'preset-chip--active': themeColorInput === color }"
                    @click="selectThemePresetColor(color)"
                  />
                </div>

                <!-- Hex 输入 -->
                <div class="hex-row">
                  <span class="hex-label">HEX</span>
                  <input
                    v-model="themeColorInput"
                    class="hex-input"
                    placeholder="#495057"
                    @blur="validateAndApplyThemeColor"
                    @keydown.enter="validateAndApplyThemeColor"
                    spellcheck="false"
                  />
                </div>
              </div>
            </Transition>
          </div>

          <!-- 当前颜色 Hex 显示（只读，点击气泡里才能改） -->
          <div class="hex-badge" :style="{ color: themeColorInput }">
            {{ themeColorInput }}
          </div>

          <!-- 效果预览 -->
          <div class="preview-pill">
            <span class="preview-time" :style="{ color: themeColorInput }">12:34</span>
            <Icon icon="fluent:settings-24-filled" class="preview-icon" :style="{ color: themeColorInput }" />
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useNotification } from "@/composables/useNotification";
import { useI18n } from "@/i18n";
import { useWallpaper } from "@/composables/useWallpaper";

const { success, error } = useNotification();
const { t, preference, localeOptions, setLocalePreference } = useI18n();
const {
  themeColor, showTime, showSeconds, showDate, use24Hour,
  clockFont, clockFontSize, clockFontWeight, useCustomColor,
  updateThemeColor, updateShowTime, updateShowSeconds, updateShowDate, updateUse24Hour,
  updateClockFont, updateClockFontSize, updateClockFontWeight, updateUseCustomColor,
  loadState,
} = useWallpaper();

// ─── 字体选项 ──────────────────────────────────────────
const fontOptions = [
  { label: 'Inter',             value: 'Inter' },
  { label: 'Jakarta Sans',      value: 'Plus Jakarta Sans' },
  { label: 'Outfit',            value: 'Outfit' },
  { label: 'Poppins',           value: 'Poppins' },
  { label: 'Nunito',            value: 'Nunito' },
  { label: 'Montserrat',        value: 'Montserrat' },
];

const clockFontValue = ref(clockFont.value || 'Inter');

async function selectFont(font: string) {
  clockFontValue.value = font;
  await updateClockFont(font);
}

// ─── 字体大小 & 粗细 ───────────────────────────────────
const clockFontSizeValue = ref(clockFontSize.value || 96);
const clockFontWeightValue = ref(clockFontWeight.value || 700);

const weightLabel = computed(() => {
  const labels: Record<number, string> = {
    300: t('basic.weightThin'),
    400: t('basic.weightRegular'),
    500: t('basic.weightMedium'),
    600: t('basic.weightSemibold'),
    700: t('basic.weightBold'),
  };
  return labels[clockFontWeightValue.value] ?? String(clockFontWeightValue.value);
});

let sizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function onFontSizeChange() {
  if (sizeDebounceTimer) clearTimeout(sizeDebounceTimer);
  sizeDebounceTimer = setTimeout(() => {
    updateClockFontSize(clockFontSizeValue.value);
  }, 200);
}

async function onFontWeightChange() {
  await updateClockFontWeight(clockFontWeightValue.value);
}

// 恢复所有时钟相关默认值
const DEFAULTS = { font: 'Inter', size: 96, weight: 700 };
async function resetToDefaults() {
  clockFontValue.value = DEFAULTS.font;
  clockFontSizeValue.value = DEFAULTS.size;
  clockFontWeightValue.value = DEFAULTS.weight;
  await Promise.all([
    updateClockFont(DEFAULTS.font),
    updateClockFontSize(DEFAULTS.size),
    updateClockFontWeight(DEFAULTS.weight),
  ]);
  success(t('basic.restored'), t('basic.restoredDetail'));
}

// ─── 主色调 ───────────────────────────────────────────
const themeColorInput = ref(themeColor.value || "#495057");
const showPicker = ref(false);

const themeHuePosition = ref(50);
const themeSaturationPosition = ref(50);
const themeBrightnessPosition = ref(50);
const themeHueColor = ref("#ff0000");

const themeHueBar = ref<HTMLElement | null>(null);
const themeSatBrightnessArea = ref<HTMLElement | null>(null);
const swatchWrapperRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);

const isDraggingHue = ref(false);
const isDraggingSat = ref(false);
const isLoading = ref(false);

// ─── 自定义颜色开关 ────────────────────────────────────
const useCustomColorValue = ref(useCustomColor.value);

async function onCustomColorToggle() {
  await updateUseCustomColor(useCustomColorValue.value);
}

// ─── 时间设置 ──────────────────────────────────────────
const showTimeValue = ref(showTime.value);
const showSecondsValue = ref(showSeconds.value);
const showDateValue = ref(showDate.value);
const use24HourValue = ref(use24Hour.value);

// ─── 预设颜色 ──────────────────────────────────────────
const presetColors = [
  "#ffffff", "#000000", "#495057", "#3498db",
  "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6",
  "#1abc9c", "#34495e", "#7f8c8d",
];

// ─── 气泡框开关 ────────────────────────────────────────
function togglePicker() {
  showPicker.value = !showPicker.value;
}

function closePicker() {
  showPicker.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (
    swatchWrapperRef.value &&
    !swatchWrapperRef.value.contains(e.target as Node)
  ) {
    closePicker();
  }
}

// ─── 颜色工具 ──────────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function updateThemeHueColor() {
  themeHueColor.value = hslToHex((themeHuePosition.value / 100) * 360, 100, 50);
}

function updateThemeFinalColor() {
  const hue = (themeHuePosition.value / 100) * 360;
  const color = hslToHex(hue, themeSaturationPosition.value, 100 - themeBrightnessPosition.value);
  themeColorInput.value = color;
  updateThemeColor(color);
}

function updateThemeColorFromHex(hex: string) {
  const hsl = hexToHsl(hex);
  themeHuePosition.value = (hsl.h / 360) * 100;
  themeSaturationPosition.value = hsl.s;
  themeBrightnessPosition.value = 100 - hsl.l;
  updateThemeHueColor();
}

// ─── 色相拖拽 ──────────────────────────────────────────
function selectThemeHue(e: MouseEvent) {
  if (!themeHueBar.value) return;
  const rect = themeHueBar.value.getBoundingClientRect();
  themeHuePosition.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  updateThemeHueColor();
  updateThemeFinalColor();
}

function startThemeHueDrag(e: MouseEvent) {
  isDraggingHue.value = true;
  selectThemeHue(e);
  const move = (ev: MouseEvent) => { if (isDraggingHue.value) selectThemeHue(ev); };
  const up = () => { isDraggingHue.value = false; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

// ─── 饱和度/亮度拖拽 ──────────────────────────────────
function selectThemeSaturationBrightness(e: MouseEvent) {
  if (!themeSatBrightnessArea.value) return;
  const rect = themeSatBrightnessArea.value.getBoundingClientRect();
  themeSaturationPosition.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  themeBrightnessPosition.value = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
  updateThemeFinalColor();
}

function startThemeSatBrightDrag(e: MouseEvent) {
  isDraggingSat.value = true;
  selectThemeSaturationBrightness(e);
  const move = (ev: MouseEvent) => { if (isDraggingSat.value) selectThemeSaturationBrightness(ev); };
  const up = () => { isDraggingSat.value = false; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

// ─── 预设 & 验证 ───────────────────────────────────────
function selectThemePresetColor(color: string) {
  themeColorInput.value = color;
  updateThemeColorFromHex(color);
  updateThemeColor(color);
}

function validateAndApplyThemeColor() {
  const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
  if (!colorRegex.test(themeColorInput.value)) {
    error(t("basic.invalidColor"), t("basic.invalidColorDetail"));
    themeColorInput.value = themeColor.value || "#495057";
    updateThemeColorFromHex(themeColorInput.value);
    return;
  }
  updateThemeColor(themeColorInput.value);
  updateThemeColorFromHex(themeColorInput.value);
}

// ─── 时间设置 watchers ────────────────────────────────
async function withLoading(fn: () => Promise<void>, onError: () => void) {
  if (isLoading.value) return;
  isLoading.value = true;
  try { await fn(); } catch (e) { error(t("basic.updateFailed"), e?.toString()); onError(); } finally { isLoading.value = false; }
}

watch(showTimeValue, (v) => withLoading(async () => { await updateShowTime(v); success(t("basic.updated"), t(v ? "basic.timeOn" : "basic.timeOff")); }, () => { showTimeValue.value = !v; }));
watch(showSecondsValue, (v) => { if (!showTimeValue.value) return; withLoading(async () => { await updateShowSeconds(v); success(t("basic.updated"), t(v ? "basic.secondsOn" : "basic.secondsOff")); }, () => { showSecondsValue.value = !v; }); });
watch(showDateValue, (v) => withLoading(async () => { await updateShowDate(v); success(t("basic.updated"), t(v ? "basic.dateOn" : "basic.dateOff")); }, () => { showDateValue.value = !v; }));
watch(use24HourValue, (v) => { if (!showTimeValue.value) return; withLoading(async () => { await updateUse24Hour(v); success(t("basic.updated"), t(v ? "basic.switched24" : "basic.switched12")); }, () => { use24HourValue.value = !v; }); });

watch(themeColorInput, async (v) => {
  const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
  if (!colorRegex.test(v) || isLoading.value || v === themeColor.value) return;
  isLoading.value = true;
  try { await updateThemeColor(v); } catch { themeColorInput.value = themeColor.value; } finally { isLoading.value = false; }
});

onMounted(async () => {
  await loadState();
  themeColorInput.value = themeColor.value || "#495057";
  updateThemeColorFromHex(themeColorInput.value);
  showTimeValue.value = showTime.value;
  showSecondsValue.value = showSeconds.value;
  showDateValue.value = showDate.value;
  use24HourValue.value = use24Hour.value;
  clockFontValue.value = clockFont.value || 'Inter';
  clockFontSizeValue.value = clockFontSize.value || 96;
  clockFontWeightValue.value = clockFontWeight.value || 700;
  useCustomColorValue.value = useCustomColor.value;
  document.addEventListener("mousedown", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style scoped>
#basic {
  /* settings-page 已处理滚动与内边距 */
  padding: 20px 24px 32px;
}

#basic > div { width: 100%; max-width: 760px; margin: 0 auto; }

/* 分区 */
.setting-section { display: flex; flex-direction: column; gap: 12px; }
.language-options { display: flex; flex-wrap: wrap; gap: 8px; }
.language-option { min-height: 36px; padding: 0 14px; border: 1px solid rgba(60, 60, 67, 0.16); border-radius: 10px; background: #fff; color: #1f2937; cursor: pointer; font: inherit; font-size: 13px; }
.language-option[aria-checked="true"] { border-color: #007aff; color: #007aff; background: rgba(0, 122, 255, 0.08); }
.language-option:focus-visible { outline: 2px solid #007aff; outline-offset: 2px; }
@media (prefers-color-scheme: dark) {
  .language-option { border-color: rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.04); color: #f5f5f7; }
  .language-option[aria-checked="true"] { border-color: #0a84ff; color: #0a84ff; background: rgba(10, 132, 255, 0.16); }
}
.section-head { display: flex; flex-direction: column; gap: 4px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--ui-text); }
.section-desc  { font-size: 12px; color: var(--ui-text-muted); }

.divider {
  height: 1px;
  background: rgba(60, 60, 67, 0.12);
}

/* 切换开关列表 */
.toggle-list { display: flex; flex-direction: column; gap: 9px; }

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  appearance: none;
  width: 17px;
  height: 17px;
  margin: 0;
  border: 1.5px solid rgba(60, 60, 67, 0.36);
  border-radius: 5px;
  background: #fff;
  cursor: pointer;
  flex-shrink: 0;
  display: grid;
  place-content: center;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.toggle-checkbox:checked { border-color: var(--ui-accent); background: var(--ui-accent); }
.toggle-checkbox:checked::after { content: ""; width: 8px; height: 4px; border: 2px solid #fff; border-top: 0; border-right: 0; transform: rotate(-45deg) translateY(-1px); }
.toggle-checkbox:focus-visible { outline: 3px solid rgba(0, 122, 255, 0.22); outline-offset: 2px; }
.toggle-checkbox:disabled { cursor: not-allowed; opacity: 0.55; }
.toggle-label { font-size: 14px; color: var(--ui-text-secondary); }

/* 大小滑块行 */
.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-label {
  font-size: 13px;
  color: #6b7280;
  width: 28px;
  flex-shrink: 0;
}

.size-slider {
  flex: 1;
  accent-color: var(--ui-accent);
  cursor: pointer;
  height: 4px;
  appearance: none;
  border-radius: 999px;
  background: rgba(60, 60, 67, 0.18);
}

.size-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--ui-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
}

.size-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--ui-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
}

.slider-value {
  font-size: 12px;
  color: #9ca3af;
  font-family: ui-monospace, monospace;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

/* 恢复默认按钮 */
.reset-btn {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(60, 60, 67, 0.16);
  background: transparent;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.reset-btn:hover {
  background: rgba(0,0,0,0.05);
  color: #374151;
}

/* 实时预览 */
.size-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  background: rgba(0,0,0,0.03);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.05);
}

/* 字体网格 */
.font-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.font-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 11px;
  border: 1px solid rgba(60, 60, 67, 0.14);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.font-card:hover {
  background: rgba(0,0,0,0.05);
  transform: translateY(-1px);
}

.font-card--active {
  border-color: #2563eb;
  background: rgba(37,99,235,0.06);
}

.font-preview {
  font-size: 21px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.font-name {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.font-card--active .font-name {
  color: var(--ui-accent);
}

/* 颜色行 */
.color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 色块 */
.swatch-wrapper { position: relative; flex-shrink: 0; }

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 0 1.5px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.15s, box-shadow 0.15s;
  display: block;
}

.color-swatch:hover {
  transform: scale(1.08);
  box-shadow: 0 0 0 2px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.15);
}

/* Hex 小标签 */
.hex-badge {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  opacity: 0.85;
}

/* 效果预览胶囊 */
.preview-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.06);
}

.preview-time {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.preview-icon { font-size: 16px; }

/* ── 气泡框 ───────────────────────────────────── */
.color-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 240px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06);
  padding: 10px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 色相条 */
.hue-bar {
  position: relative;
  height: 14px;
  border-radius: 7px;
  cursor: crosshair;
  background: linear-gradient(to right,
    #ff0000 0%, #ffff00 17%, #00ff00 33%,
    #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  user-select: none;
}

.hue-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 饱和度/亮度面板 */
.sb-panel {
  position: relative;
  height: 120px;
  border-radius: 7px;
  cursor: crosshair;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
  user-select: none;
}

.sb-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 预设色 */
.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preset-chip {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  padding: 0;
}

.preset-chip:hover { transform: scale(1.15); }
.preset-chip--active {
  border-color: #2563eb !important;
  transform: scale(1.1);
  box-shadow: 0 0 0 2px rgba(37,99,235,0.25);
}

/* Hex 输入行 */
.hex-row {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid rgba(0,0,0,0.07);
  padding-top: 8px;
}

.hex-label {
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.hex-input {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: #374151;
  background: rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
}

.hex-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
}

/* 气泡动画 */
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .section-title { color: #f3f4f6; }
  .toggle-label  { color: #d1d5db; }
  .divider       { background: rgba(255,255,255,0.07); }

  .font-card {
    border-color: rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
  }

  .font-card:hover { background: rgba(255,255,255,0.06); }

  .font-card--active {
    border-color: rgba(10, 132, 255, 0.72);
    background: rgba(10, 132, 255, 0.12);
  }

  .font-preview { color: #f3f4f6; }

  .font-card--active .font-name { color: #0a84ff; }

  .toggle-checkbox { border-color: rgba(235, 235, 245, 0.34); background: #2c2c2e; }
  .divider { background: rgba(235, 235, 245, 0.12); }
  .size-slider { background: rgba(235, 235, 245, 0.20); }

  .reset-btn {
    border-color: rgba(255,255,255,0.1);
    color: #9ca3af;
  }

  .reset-btn:hover {
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
  }

  .size-preview {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.06);
  }

  .size-preview span { color: #f3f4f6 !important; }

  .preview-pill {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.08);
  }

  .color-popover {
    background: #1f2937;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
  }

  .hue-bar, .sb-panel { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08); }

  .hex-row { border-top-color: rgba(255,255,255,0.08); }

  .hex-input {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.1);
    color: #e5e7eb;
  }

  .hex-input:focus { border-color: #3b82f6; }
}

input:disabled { cursor: not-allowed; }

.custom-color-hint {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.5;
  padding: 6px 8px;
  background: rgba(0,0,0,0.03);
  border-radius: 6px;
  border-left: 2px solid rgba(0,0,0,0.08);
}

@media (prefers-color-scheme: dark) {
  .custom-color-hint {
    background: rgba(255,255,255,0.04);
    border-left-color: rgba(255,255,255,0.1);
  }
}

@media (max-width: 560px) {
  #basic { padding: 16px 18px 28px; }
  .font-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
