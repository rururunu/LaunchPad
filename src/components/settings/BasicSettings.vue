<template>
  <div id="basic" class="settings-page">
    <section class="apple-section">
      <div class="apple-group"><div class="apple-row">
        <span class="apple-row-label">{{ t('basic.appearance') }}</span>
        <AppleMenu
          :model-value="appearanceMode"
          :groups="appearanceGroups"
          :aria-label="t('basic.appearance')"
          @update:model-value="changeAppearance"
        />
      </div></div>
    </section>
    <section class="apple-section">
      <h3 class="apple-header">{{ t('basic.glassSearch') }}</h3>
      <div class="apple-group">
        <label class="apple-row">
          <span class="apple-row-label">{{ t('basic.glassSearch') }}</span>
          <input v-model="searchGlassValue" type="checkbox" role="switch" class="apple-switch" />
        </label>
      </div>
      <p class="apple-footnote">{{ t('basic.glassSearchDesc') }}</p>
    </section>
    <section class="apple-section">
      <div class="apple-group">
        <div class="apple-row">
          <span class="apple-row-label">{{ t('basic.languageTitle') }}</span>
          <AppleMenu
            :model-value="preference"
            :groups="languageGroups"
            :aria-label="t('basic.languageTitle')"
            @update:model-value="onLocaleChange"
          />
        </div>
      </div>
      <p class="apple-footnote">{{ t('basic.languageDesc') }}</p>
    </section>

    <section class="apple-section">
      <h3 class="apple-header">{{ t('basic.timeTitle') }}</h3>
      <div class="apple-group">
        <label class="apple-row">
          <span class="apple-row-label">{{ t('basic.showTime') }}</span>
          <input v-model="showTimeValue" type="checkbox" role="switch" class="apple-switch" />
        </label>
        <label class="apple-row" :class="{ 'is-disabled': !showTimeValue }">
          <span class="apple-row-label">{{ t('basic.showSeconds') }}</span>
          <input v-model="showSecondsValue" type="checkbox" role="switch" class="apple-switch" :disabled="!showTimeValue" />
        </label>
        <label class="apple-row" :class="{ 'is-disabled': !showTimeValue }">
          <span class="apple-row-label">{{ t('basic.hour24') }}</span>
          <input v-model="use24HourValue" type="checkbox" role="switch" class="apple-switch" :disabled="!showTimeValue" />
        </label>
        <label class="apple-row">
          <span class="apple-row-label">{{ t('basic.showDate') }}</span>
          <input v-model="showDateValue" type="checkbox" role="switch" class="apple-switch" />
        </label>
      </div>
      <p class="apple-footnote">{{ t('basic.timeDesc') }}</p>
    </section>

    <section class="apple-section">
      <h3 class="apple-header">{{ t('basic.fontTitle') }}</h3>
      <div class="apple-group">
        <div class="apple-row">
          <span class="apple-row-label">{{ t('basic.fontLabel') }}</span>
          <AppleMenu
            :model-value="clockFontValue"
            :groups="clockMenuGroups"
            :aria-label="t('basic.fontTitle')"
            sample="14:32"
            @open="ensureClockFontCatalog"
            @update:model-value="selectFont"
          />
        </div>

        <label class="apple-row apple-row--slider">
          <span class="apple-row-label">{{ t('basic.size') }}</span>
          <input
            v-model.number="clockFontSizeValue"
            type="range"
            class="apple-slider"
            :min="48"
            :max="160"
            :step="8"
            :style="{ '--p': sizeProgress }"
            @input="onFontSizeChange"
          />
          <span class="apple-value">{{ clockFontSizeValue }}px</span>
        </label>

        <label class="apple-row apple-row--slider">
          <span class="apple-row-label">{{ t('basic.weight') }}</span>
          <input
            v-model.number="clockFontWeightValue"
            type="range"
            class="apple-slider"
            min="300"
            max="700"
            step="100"
            :style="{ '--p': weightProgress }"
            @change="onFontWeightChange"
          />
          <span class="apple-value" :style="{ fontWeight: clockFontWeightValue }">{{ weightLabel }}</span>
        </label>

        <div class="apple-row apple-row--preview" aria-hidden="true">
          <span
            class="apple-preview-time"
            :style="{
              fontFamily: clockFontFamily(clockFontValue),
              fontSize: Math.min(clockFontSizeValue * 0.4, 56) + 'px',
              fontWeight: clockFontWeightValue,
            }"
          >14:32</span>
        </div>

        <div class="apple-row apple-row--action">
          <button type="button" class="apple-action" @click="resetToDefaults">{{ t('basic.reset') }}</button>
        </div>
      </div>
      <p class="apple-footnote">{{ t('basic.fontFootnote') }}</p>
    </section>

    <section class="apple-section">
      <h3 class="apple-header">{{ t('basic.dateSize') }}</h3>
      <div class="apple-group">
        <label class="apple-row apple-row--slider">
          <span class="apple-row-label">{{ t('basic.dateSize') }}</span>
          <input v-model.number="dateFontSizeValue" type="range" class="apple-slider"
            min="10" max="40" step="1" :style="{ '--p': `${(dateFontSizeValue - 10) / 30 * 100}%` }"
            @input="dateFontSize = dateFontSizeValue" @change="saveDateFontSize" />
          <span class="apple-value">{{ dateFontSizeValue }}px</span>
        </label>
        <div class="apple-row apple-row--preview" aria-hidden="true">
          <span :style="{ fontFamily: clockFontFamily(clockFontValue), fontSize: `${dateFontSizeValue}px` }">{{ datePreview }}</span>
        </div>
      </div>
      <p class="apple-footnote">{{ t('basic.dateSizeDesc') }}</p>
    </section>

    <section class="apple-section">
      <h3 class="apple-header">{{ t('basic.pageFontTitle') }}</h3>
      <div class="apple-group">
        <div class="apple-row">
          <span class="apple-row-label">{{ t('basic.pageFontLabel') }}</span>
          <AppleMenu
            :model-value="pageFontValue"
            :groups="pageMenuGroups"
            :aria-label="t('basic.pageFontTitle')"
            :sample="t('basic.pageFontSample')"
            @open="ensureClockFontCatalog"
            @update:model-value="selectPageFont"
          />
        </div>
        <div class="apple-row apple-row--preview" aria-hidden="true">
          <span class="apple-preview-page" :style="{ fontFamily: clockFontFamily(pageFontValue) }">{{ t('basic.pageFontSample') }}</span>
        </div>
      </div>
      <p class="apple-footnote">{{ t('basic.pageFontFootnote') }}</p>
    </section>

    <section class="apple-section" :class="{ 'is-open': showPicker }">
      <h3 class="apple-header">{{ t('basic.colorTitle') }}</h3>
      <div class="apple-group">
        <label class="apple-row">
          <span class="apple-row-label">{{ t('basic.customColor') }}</span>
          <input v-model="useCustomColorValue" type="checkbox" role="switch" class="apple-switch" @change="onCustomColorToggle" />
        </label>

        <div v-if="useCustomColorValue" class="apple-row apple-row--color">
          <span class="apple-row-label">{{ t('basic.colorWell') }}</span>
          <div class="color-controls">
            <div class="swatch-wrapper" ref="swatchWrapperRef">
              <button
                type="button"
                class="color-swatch"
                :style="{ backgroundColor: themeColorInput }"
                :title="t('basic.pickColor')"
                :aria-label="t('basic.pickColor')"
                @click="togglePicker"
              />
              <Transition name="popover">
                <div v-if="showPicker" class="color-popover" ref="popoverRef">
                  <div
                    class="hue-bar"
                    ref="themeHueBar"
                    @click="selectThemeHue"
                    @mousedown="startThemeHueDrag"
                  >
                    <div class="hue-thumb" :style="{ left: `${themeHuePosition}%`, backgroundColor: themeHueColor }" />
                  </div>
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
                    <div class="sb-thumb" :style="{ left: `${themeSaturationPosition}%`, top: `${themeBrightnessPosition}%` }" />
                  </div>
                  <div class="preset-grid">
                    <button
                      v-for="color in presetColors"
                      :key="color"
                      type="button"
                      class="preset-chip"
                      :style="{ backgroundColor: color }"
                      :class="{ 'preset-chip--active': themeColorInput === color }"
                      @click="selectThemePresetColor(color)"
                    />
                  </div>
                  <div class="hex-row">
                    <span class="hex-label">HEX</span>
                    <input
                      v-model="themeColorInput"
                      class="hex-input"
                      placeholder="#495057"
                      spellcheck="false"
                      @blur="validateAndApplyThemeColor"
                      @keydown.enter="validateAndApplyThemeColor"
                    />
                  </div>
                </div>
              </Transition>
            </div>
            <span class="apple-hex">{{ themeColorInput }}</span>
            <div class="preview-pill">
              <span class="preview-time" :style="{ color: themeColorInput }">12:34</span>
              <Icon icon="fluent:settings-24-filled" class="preview-icon" :style="{ color: themeColorInput }" />
            </div>
          </div>
        </div>
      </div>
      <p v-if="!useCustomColorValue" class="apple-footnote">{{ t('basic.adaptiveColor') }}</p>
      <p v-else class="apple-footnote">{{ t('basic.colorDesc') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppearance, type AppearanceMode } from '@/composables/useAppearance';
const { mode: appearanceMode, setMode } = useAppearance();
async function changeAppearance(value: string) {
  if (!['system', 'light', 'dark'].includes(value)) return;
  try { await setMode(value as AppearanceMode); }
  catch (e) { error(t('basic.updateFailed'), String(e)); }
}

import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useNotification } from "@/composables/useNotification";
import { isLocalePreference, useI18n } from "@/i18n";
import { useWallpaper } from "@/composables/useWallpaper";
import AppleMenu from "@/components/ui/AppleMenu.vue";
import {
  CLOCK_FONT_GROUPS,
  CLOCK_FONTS,
  clockFontFamily,
  ensureClockFontCatalog,
  type ClockFontGroup,
} from "@/utils/clockFonts";

const { success, error } = useNotification();
const { t, locale, preference, localeOptions, setLocalePreference } = useI18n();
const {
  themeColor, showTime, showSeconds, showDate, use24Hour,
  clockFont, clockFontSize, clockFontWeight, pageFont, useCustomColor, dateFontSize, searchGlass,
  updateThemeColor, updateShowTime, updateShowSeconds, updateShowDate, updateUse24Hour,
  updateClockFont, updateClockFontSize, updateClockFontWeight, updatePageFont, updateUseCustomColor,
  loadState, updateDateFontSize, updateSearchGlass,
} = useWallpaper();

const fontGroupLabel: Record<ClockFontGroup, string> = {
  system: "basic.fontGroupSystem",
  sans: "basic.fontGroupSans",
  display: "basic.fontGroupDisplay",
  serif: "basic.fontGroupSerif",
  script: "basic.fontGroupScript",
  mono: "basic.fontGroupMono",
};

const fontGroups = computed(() =>
  CLOCK_FONT_GROUPS.map((id) => ({
    id,
    label: t(fontGroupLabel[id]),
    fonts: CLOCK_FONTS.filter((font) => font.group === id),
  })),
);

const toFontMenu = (selected: string) => {
  const groups = fontGroups.value.map((group) => ({
    label: group.label,
    options: group.fonts.map((font) => ({
      value: font.id,
      label: font.labelKey ? t(font.labelKey) : font.id,
      fontFamily: clockFontFamily(font.id),
    })),
  }));
  if (CLOCK_FONTS.some((font) => font.id === selected)) return groups;
  return [{ options: [{ value: selected, label: selected, fontFamily: clockFontFamily(selected) }] }, ...groups];
};

const appearanceGroups = computed(() => [{ options: [
  { value: 'system', label: t('basic.systemAppearance') },
  { value: 'light', label: t('basic.lightAppearance') },
  { value: 'dark', label: t('basic.darkAppearance') },
] }]);
const languageGroups = computed(() => [{
  options: localeOptions.map((option) => ({ value: option.id, label: option.native })),
}]);

const clockFontValue = ref(clockFont.value || "Inter");
const pageFontValue = ref(pageFont.value || "system-ui");
const clockMenuGroups = computed(() => toFontMenu(clockFontValue.value));
const pageMenuGroups = computed(() => toFontMenu(pageFontValue.value));

function onLocaleChange(value: string) {
  if (isLocalePreference(value)) setLocalePreference(value);
}

async function selectFont(font: string) {
  clockFontValue.value = font;
  await updateClockFont(font);
}

async function selectPageFont(font: string) {
  pageFontValue.value = font;
  await updatePageFont(font);
}

const dateFontSizeValue = ref(dateFontSize.value);
const searchGlassValue = ref(searchGlass.value);
watch(searchGlass, value => { searchGlassValue.value = value; });
watch(searchGlassValue, async value => {
  try { await updateSearchGlass(value); }
  catch (e) { error(t("basic.updateFailed"), String(e)); }
});
const datePreview = computed(() => new Intl.DateTimeFormat(locale.value, {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
}).format(new Date()));
async function saveDateFontSize() {
  try { await updateDateFontSize(dateFontSizeValue.value); }
  catch (e) { error(t("basic.updateFailed"), String(e)); }
}
const clockFontSizeValue = ref(clockFontSize.value || 96);
const clockFontWeightValue = ref(clockFontWeight.value || 700);
const sizeProgress = computed(() => `${((clockFontSizeValue.value - 48) / 112) * 100}%`);
const weightProgress = computed(() => `${((clockFontWeightValue.value - 300) / 400) * 100}%`);

const weightLabel = computed(() => {
  const labels: Record<number, string> = {
    300: t("basic.weightThin"),
    400: t("basic.weightRegular"),
    500: t("basic.weightMedium"),
    600: t("basic.weightSemibold"),
    700: t("basic.weightBold"),
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

const DEFAULTS = { font: "Inter", size: 96, weight: 700 };
async function resetToDefaults() {
  clockFontValue.value = DEFAULTS.font;
  clockFontSizeValue.value = DEFAULTS.size;
  clockFontWeightValue.value = DEFAULTS.weight;
  searchGlassValue.value = false;
  await Promise.all([
    updateClockFont(DEFAULTS.font),
    updateClockFontSize(DEFAULTS.size),
    updateClockFontWeight(DEFAULTS.weight),
  ]);
  success(t("basic.restored"), t("basic.restoredDetail"));
}

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

const useCustomColorValue = ref(useCustomColor.value);

async function onCustomColorToggle() {
  await updateUseCustomColor(useCustomColorValue.value);
  if (!useCustomColorValue.value) showPicker.value = false;
}

const showTimeValue = ref(showTime.value);
const showSecondsValue = ref(showSeconds.value);
const showDateValue = ref(showDate.value);
const use24HourValue = ref(use24Hour.value);

const presetColors = [
  "#ffffff", "#000000", "#495057", "#3498db",
  "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6",
  "#1abc9c", "#34495e", "#7f8c8d",
];

function togglePicker() {
  showPicker.value = !showPicker.value;
}

function closePicker() {
  showPicker.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (swatchWrapperRef.value && !swatchWrapperRef.value.contains(e.target as Node)) {
    closePicker();
  }
}

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
  ensureClockFontCatalog();
  await loadState();
  themeColorInput.value = themeColor.value || "#495057";
  updateThemeColorFromHex(themeColorInput.value);
  showTimeValue.value = showTime.value;
  showSecondsValue.value = showSeconds.value;
  showDateValue.value = showDate.value;
  use24HourValue.value = use24Hour.value;
  clockFontValue.value = clockFont.value || "Inter";
  dateFontSizeValue.value = dateFontSize.value;
  pageFontValue.value = pageFont.value || "system-ui";
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
  padding: 18px 16px 32px;
  gap: 0;
  background: transparent;
}

.apple-section + .apple-section { margin-top: 28px; }
.apple-section.is-open { position: relative; z-index: 3; }

.apple-header {
  margin: 0;
  padding: 0 16px 7px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.3;
  color: #6e6e73;
}

.apple-footnote {
  margin: 7px 0 0;
  padding: 0 16px;
  font-size: 12px;
  line-height: 1.4;
  color: #6e6e73;
}

.apple-group {
  background: #fff;
  border-radius: 10px;
}

.apple-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 16px;
}

.apple-row + .apple-row::before {
  content: "";
  position: absolute;
  top: 0;
  left: 16px;
  right: 0;
  height: 1px;
  background: rgba(60, 60, 67, 0.16);
}

.apple-row-label {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.25;
  color: #1d1d1f;
}

.apple-row.is-disabled { opacity: 0.4; }

.apple-row--slider .apple-row-label { flex: 0 0 4.5rem; }

.apple-popup {
  --popup-chevron: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%236e6e73' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  appearance: none;
  -webkit-appearance: none;
  flex: 0 1 220px;
  width: min(220px, 58%);
  height: 28px;
  margin: 8px 0;
  padding: 0 28px 0 10px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 7px;
  background-color: #f5f5f7;
  background-image: var(--popup-chevron);
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 11px 11px;
  box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.7);
  color: #1d1d1f;
  font: inherit;
  font-size: 13px;
  line-height: 28px;
  cursor: pointer;
}

.apple-popup:hover { background-color: #ececee; }
.apple-popup:focus-visible {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.28);
}

.apple-popup--font { font-size: 15px; }

.apple-switch {
  appearance: none;
  -webkit-appearance: none;
  flex-shrink: 0;
  width: 42px;
  height: 26px;
  margin: 0;
  border: 0;
  border-radius: 13px;
  background: #e9e9eb;
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
}

.apple-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24), 0 0.5px 1px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.apple-switch:checked { background: #34c759; }
.apple-switch:checked::after { transform: translateX(16px); }
.apple-switch:disabled { cursor: not-allowed; }
.apple-switch:focus-visible {
  outline: 3px solid rgba(52, 199, 89, 0.35);
  outline-offset: 2px;
}

.apple-slider {
  flex: 1;
  min-width: 0;
  height: 22px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

.apple-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background:
    linear-gradient(#007aff, #007aff) left center / var(--p, 0%) 4px no-repeat,
    linear-gradient(rgba(60, 60, 67, 0.18), rgba(60, 60, 67, 0.18)) left center / 100% 4px no-repeat;
}

.apple-slider::-webkit-slider-thumb {
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -9px;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22), 0 0.5px 1px rgba(0, 0, 0, 0.1);
}

.apple-slider::-moz-range-track {
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: rgba(60, 60, 67, 0.18);
}

.apple-slider::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: #007aff;
}

.apple-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
}

.apple-slider:focus-visible { outline: none; }
.apple-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.28), 0 1px 4px rgba(0, 0, 0, 0.22);
}

.apple-value {
  flex: 0 0 4.75rem;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: end;
  white-space: nowrap;
  color: #6e6e73;
}

.apple-row--preview {
  justify-content: center;
  min-height: 76px;
  padding-block: 14px;
}

.apple-preview-time,
.apple-preview-page {
  color: #1d1d1f;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.apple-preview-page { font-size: 22px; letter-spacing: 0; }

.apple-row--action { padding: 0; }

.apple-action {
  flex: 1;
  min-height: 44px;
  border: 0;
  border-radius: 0 0 10px 10px;
  background: transparent;
  color: #007aff;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}

.apple-action:hover { background: rgba(0, 122, 255, 0.06); }
.apple-action:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px #007aff;
}

.color-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.swatch-wrapper { position: relative; flex-shrink: 0; }

.color-swatch {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: block;
}

.color-swatch:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12), 0 0 0 3px rgba(0, 122, 255, 0.28);
}

.apple-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #6e6e73;
}

.preview-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
}

.preview-time {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.preview-icon { font-size: 15px; }

.color-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  padding: 10px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hue-bar {
  position: relative;
  height: 14px;
  border-radius: 7px;
  cursor: crosshair;
  background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.hue-thumb,
.sb-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.hue-thumb { top: 50%; }

.sb-panel {
  position: relative;
  height: 120px;
  border-radius: 7px;
  cursor: crosshair;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.preset-grid { display: flex; flex-wrap: wrap; gap: 5px; }

.preset-chip {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1.5px solid transparent;
  border-radius: 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.preset-chip--active {
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.25);
}

.hex-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.hex-label {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.hex-input {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  outline: none;
}

.hex-input:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
}

.popover-enter-active,
.popover-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.popover-enter-from,
.popover-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }

@media (prefers-color-scheme: dark) {
  .apple-header,
  .apple-footnote,
  .apple-value,
  .apple-hex { color: #98989d; }

  .apple-group { background: #2c2c2e; }
  .apple-row-label,
  .apple-preview-time,
  .apple-preview-page { color: #f5f5f7; }
  .apple-row + .apple-row::before { background: rgba(84, 84, 88, 0.65); }

  .apple-popup {
    --popup-chevron: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%23aeaeb2' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    border-color: rgba(255, 255, 255, 0.12);
    background-color: #3a3a3c;
    box-shadow: none;
    color: #f5f5f7;
  }

  .apple-popup:hover { background-color: #48484a; }
  .apple-switch { background: #39393d; }
  .apple-switch:checked { background: #30d158; }
  .apple-action { color: #0a84ff; }
  .apple-action:hover { background: rgba(10, 132, 255, 0.16); }

  .apple-slider::-webkit-slider-runnable-track {
    background:
      linear-gradient(#0a84ff, #0a84ff) left center / var(--p, 0%) 4px no-repeat,
      linear-gradient(rgba(235, 235, 245, 0.28), rgba(235, 235, 245, 0.28)) left center / 100% 4px no-repeat;
  }

  .preview-pill { background: rgba(255, 255, 255, 0.08); }

  .color-popover {
    background: #2c2c2e;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .hex-row { border-top-color: rgba(255, 255, 255, 0.08); }
  .hex-input {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: #f5f5f7;
  }
}

@media (max-width: 560px) {
  #basic { padding: 16px 12px 28px; }
  .apple-row--color { align-items: flex-start; padding-block: 10px; }
  .color-controls { flex-wrap: wrap; justify-content: flex-end; }
}

@media (prefers-reduced-motion: reduce) {
  .apple-switch,
  .apple-switch::after,
  .popover-enter-active,
  .popover-leave-active { transition: none; }
}
</style>

