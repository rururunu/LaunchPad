<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();

const props = defineProps<{
  show: boolean;
  select: any[];
  title?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const PROJECT_URL = "https://github.com/rururunu/LaunchPad";
const appVersion = (() => {
  try {
    return chrome.runtime?.getManifest?.().version || __APP_VERSION__;
  } catch {
    return __APP_VERSION__;
  }
})();

const currentSettingComponent = shallowRef<any>(props.select?.[0] ?? null);
const visibleCount = ref(props.select.length);
const moreMenuOpen = ref(false);
const navRef = ref<HTMLElement | null>(null);
const measureRef = ref<HTMLElement | null>(null);
const trackRef = ref<HTMLElement | null>(null);
const indicator = ref({ left: 0, width: 0 });
const indicatorReady = ref(false);
let indicatorFrame = 0;
let resizeObserver: ResizeObserver | null = null;

function updateIndicator() {
  const track = trackRef.value;
  const active = track?.querySelector<HTMLElement>(".segment--active");
  if (!track || !active) return;
  // offsetLeft remains stable while the drawer itself is animating.
  indicator.value = {
    left: active.offsetLeft + (active.parentElement === track ? 0 : active.parentElement!.offsetLeft),
    width: active.offsetWidth,
  };
  cancelAnimationFrame(indicatorFrame);
  indicatorFrame = requestAnimationFrame(() => { indicatorReady.value = true; });
}

function onNavKeydown(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = [...(trackRef.value?.querySelectorAll<HTMLButtonElement>(".segment") ?? [])];
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
    : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
  if (buttons[next]?.getAttribute("role") === "tab") buttons[next]?.click();
}

const visibleSelect = computed(() => props.select.slice(0, visibleCount.value));
const overflowSelect = computed(() => props.select.slice(visibleCount.value));
const overflowIsActive = computed(() =>
  overflowSelect.value.some((item) => item.key === currentSettingComponent.value?.key)
);

function fitSegments() {
  const nav = navRef.value;
  const measure = measureRef.value;
  if (!nav || !measure) return;
  const styles = getComputedStyle(nav);
  const available = nav.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  if (available <= 0) return;
  const items = [...measure.querySelectorAll<HTMLElement>("[data-seg]")];
  const moreWidth = measure.querySelector<HTMLElement>("[data-more]")?.offsetWidth ?? 0;
  const trackPad = 8;
  let used = trackPad;
  let count = items.length;
  const allFit = trackPad + items.reduce((total, item) => total + item.offsetWidth, 0) <= available;
  for (let i = 0; !allFit && i < items.length; i++) {
    const needsMore = i < items.length - 1;
    if (used + items[i].offsetWidth + (needsMore ? moreWidth : 0) > available) {
      count = i;
      break;
    }
    used += items[i].offsetWidth;
  }
  if (count !== visibleCount.value) visibleCount.value = count;
  if (count >= props.select.length) moreMenuOpen.value = false;
  nextTick(updateIndicator);
}

function bindMeasure() {
  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(() => fitSegments());
  if (navRef.value) resizeObserver.observe(navRef.value);
  if (measureRef.value) resizeObserver.observe(measureRef.value);
  fitSegments();
}

onMounted(() => {
  if (props.select?.[0]) setUpClick(props.select[0].key);
  if (props.show) {
    document.addEventListener("keydown", onKeydown);
    nextTick(bindMeasure);
  }
});

const handleClose = () => {
  emit("close");
};

function setUpClick(select: string) {
  const found = props.select.find((item) => item.key === select);
  if (found) currentSettingComponent.value = found;
  moreMenuOpen.value = false;
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.show) {
    e.preventDefault();
    if (moreMenuOpen.value) {
      moreMenuOpen.value = false;
      trackRef.value?.querySelector<HTMLButtonElement>(".segment--more")?.focus();
      return;
    }
    handleClose();
  }
};

watch(
  () => props.show,
  async (open) => {
    if (open) {
      document.addEventListener("keydown", onKeydown);
      await nextTick();
      bindMeasure();
    } else {
      indicatorReady.value = false;
      moreMenuOpen.value = false;
      document.removeEventListener("keydown", onKeydown);
      resizeObserver?.disconnect();
    }
  }
);

watch(() => currentSettingComponent.value?.key, () => nextTick(updateIndicator));

function onOutsidePointer(event: PointerEvent) {
  if (!navRef.value?.contains(event.target as Node)) moreMenuOpen.value = false;
}
onMounted(() => document.addEventListener("pointerdown", onOutsidePointer));

watch(
  () => props.select.map((item) => item.label).join("\0"),
  () => nextTick(fitSegments)
);

onBeforeUnmount(() => {
  cancelAnimationFrame(indicatorFrame);
  document.removeEventListener("pointerdown", onOutsidePointer);
  document.removeEventListener("keydown", onKeydown);
  resizeObserver?.disconnect();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="show" class="drawer-root">
        <!-- 遮罩 -->
        <div class="drawer-mask" @click="handleClose" />

        <!-- 左侧抽屉 -->
        <aside class="drawer-panel" role="dialog" aria-modal="true" @click.stop>
          <!-- 顶栏 -->
          <header class="drawer-header">
            <span class="drawer-title">{{ props.title || t("settings.title") }}</span>
            <button type="button" class="drawer-close" :title="t('settings.close')" @click="handleClose">
              <Icon icon="fluent:dismiss-24-filled" class="text-lg" />
            </button>
          </header>

          <!-- 导航 -->
          <nav ref="navRef" class="drawer-nav" :aria-label="props.title || t('settings.title')">
            <div ref="trackRef" class="segmented" role="tablist" :aria-label="props.title || t('settings.title')" @keydown="onNavKeydown">
              <span
                class="segment-indicator"
                :class="{ 'is-ready': indicatorReady }"
                :style="{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px`, opacity: indicator.width ? 1 : 0 }"
                aria-hidden="true"
              />
              <button
                v-for="item in visibleSelect"
                :key="item.key"
                type="button"
                role="tab"
                class="segment"
                :class="{ 'segment--active': currentSettingComponent?.key === item.key }"
                :aria-selected="currentSettingComponent?.key === item.key"
                :id="`settings-tab-${item.key}`"
                aria-controls="settings-tab-panel"
                :tabindex="currentSettingComponent?.key === item.key ? 0 : -1"
                @click="setUpClick(item.key)"
              >
                <Icon :icon="item.icon" class="nav-icon" />
                <span>{{ item.label }}</span>
              </button>
              <div v-if="overflowSelect.length" class="nav-more-wrap">
                <button
                  type="button"
                  class="segment segment--more"
                  :class="{ 'segment--active': overflowIsActive }"
                  :aria-expanded="moreMenuOpen"
                  aria-haspopup="menu"
                  :tabindex="overflowIsActive || moreMenuOpen ? 0 : -1"
                  :title="t('settings.more')"
                  :aria-label="t('settings.more')"
                  @click="moreMenuOpen = !moreMenuOpen"
                >
                  <Icon icon="ph:dots-three" class="nav-icon" />
                </button>
                <Transition name="nav-menu">
                <div v-if="moreMenuOpen" class="nav-more-menu" role="menu">
                  <button
                    v-for="item in overflowSelect"
                    :key="item.key"
                    type="button"
                    role="menuitem"
                    class="nav-more-item"
                    :class="{ 'nav-more-item--active': currentSettingComponent?.key === item.key }"
                    @click="setUpClick(item.key)"
                  >
                    <Icon :icon="item.icon" class="nav-icon" />
                    <span>{{ item.label }}</span>
                  </button>
                </div>
                </Transition>
              </div>
            </div>
            <div ref="measureRef" class="segment-measure" aria-hidden="true">
              <span v-for="item in props.select" :key="item.key" class="segment" data-seg>
                <Icon :icon="item.icon" class="nav-icon" />
                <span>{{ item.label }}</span>
              </span>
              <span class="segment segment--more" data-more>
                <Icon icon="ph:dots-three" class="nav-icon" />
              </span>
            </div>
          </nav>

          <!-- 内容 -->
          <div id="settings-tab-panel" class="drawer-body" role="tabpanel" :aria-label="currentSettingComponent?.label" :aria-labelledby="overflowIsActive ? undefined : `settings-tab-${currentSettingComponent?.key}`">
            <Transition name="settings-content">
            <component
              v-if="currentSettingComponent"
              :key="currentSettingComponent.key"
              class="drawer-content ui-scroll"
              :is="currentSettingComponent.in"
            />
            </Transition>
          </div>

          <!-- 底栏 -->
          <footer class="drawer-footer">
            <span class="footer-version">LaunchPad v{{ appVersion }}</span>
            <a
              class="footer-link"
              :href="PROJECT_URL"
              target="_blank"
              rel="noopener noreferrer"
              :title="t('settings.github')"
            >
              <Icon icon="fluent:open-24-regular" />
              GitHub
            </a>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
}

.drawer-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 15, 18, 0.28);
  backdrop-filter: blur(8px) saturate(130%);
  -webkit-backdrop-filter: blur(8px) saturate(130%);
  pointer-events: auto;
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  left: auto;
  bottom: 0;
  width: min(820px, 94vw);
  display: flex;
  flex-direction: column;
  background: #f5f5f7;
  border-left: 1px solid rgba(60, 60, 67, 0.16);
  border-right: none;
  box-shadow: -16px 0 48px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  pointer-events: auto;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.12);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.drawer-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #111827;
}

.drawer-nav {
  position: relative;
  z-index: 10;
  display: flex;
  padding: 16px 22px 8px;
  overflow: visible;
  flex-shrink: 0;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.segmented {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
  padding: 4px;
  border-radius: 12px;
  background: rgba(118, 118, 128, 0.10);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.045), 0 1px 0 rgba(255, 255, 255, 0.7);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.nav-icon {
  width: 15px;
  height: 15px;
  font-size: 15px;
  flex-shrink: 0;
}

.segment {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  margin: 0;
  padding: 0 12px;
  box-sizing: border-box;
  border: 0;
  border-radius: 7px;
  appearance: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  z-index: 1;
  transition: color 180ms ease, background-color 180ms ease;
}

.segmented > .segment {
  flex: 1 1 0;
  min-width: max-content;
}

.segment > span,
.segment > .nav-icon {
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.segment:active > span,
.segment:active > .nav-icon {
  transform: translateY(0.5px) scale(0.97);
}

.segment-indicator {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  pointer-events: none;
  border-radius: 9px;
  background: linear-gradient(180deg, #fff, #fdfdfe);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.10), 0 0 0 0.5px rgba(0, 0, 0, 0.055);
}

.segment-indicator.is-ready {
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), width 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.segment:hover {
  color: #1d1d1f;
}

.segment--active,
.segment--active:hover {
  color: #1d1d1f;
}

.segment--active .nav-icon {
  color: var(--ui-accent, #007aff);
}

.segment:focus-visible {
  outline: 2px solid #007aff;
  outline-offset: -1px;
}

/* Quiet separators disappear on either side of the moving selection. */
.segmented > .segment + .segment::before,
.segmented > .nav-more-wrap::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 1px;
  background: rgba(60, 60, 67, 0.13);
  pointer-events: none;
  transition: opacity 160ms ease;
}
.segmented > .segment--active::before,
.segmented > .segment--active + .segment::before,
.segmented > .segment--active + .nav-more-wrap::before,
.segmented > .nav-more-wrap:has(.segment--active)::before {
  opacity: 0;
}

.segment--more {
  width: 38px;
  padding: 0;
}

.segment-measure {
  position: fixed;
  left: -10000px;
  top: 0;
  display: flex;
  visibility: hidden;
  pointer-events: none;
}

.nav-more-wrap {
  position: relative;
  display: flex;
  flex-shrink: 0;
}

.nav-more-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  min-width: 148px;
  padding: 5px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16), 0 0 0 0.5px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
}

.nav-more-item {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 7px;
  color: #1d1d1f;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
}

.nav-more-item:hover,
.nav-more-item--active {
  color: #fff;
  background: #007aff;
}

.drawer-body {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f5f5f7;
}

.drawer-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 44px;
  padding: 0 24px;
  flex-shrink: 0;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.48);
}

.footer-version {
  font-variant-numeric: tabular-nums;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  color: #4b5563;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.footer-link:hover {
  color: #007aff;
  background: rgba(60, 60, 67, 0.07);
}

.footer-link:focus-visible {
  outline: 2px solid #007aff;
  outline-offset: 1px;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .drawer-footer {
    color: #a1a1aa;
    border-top-color: rgba(235, 235, 245, 0.10);
    background: rgba(255, 255, 255, 0.025);
  }

  .footer-link {
    color: #d4d4d8;
  }

  .footer-link:hover {
    color: #0a84ff;
    background: rgba(255, 255, 255, 0.07);
  }

  .drawer-mask {
    background: rgba(0, 0, 0, 0.45);
  }

  .drawer-panel {
    background: #1c1c1e;
    border-left-color: rgba(255, 255, 255, 0.08);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.4);
  }

  .drawer-header {
    border-bottom-color: rgba(235, 235, 245, 0.12);
  }

  .drawer-title {
    color: #f3f4f6;
  }

  .drawer-close {
    color: #a1a1aa;
  }

  .drawer-close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
  }

  .segmented {
    background: rgba(118, 118, 128, 0.24);
  }

  .segment {
    color: rgba(235, 235, 245, 0.6);
  }

  .segment:hover {
    color: #f5f5f7;
  }

  .segment--active,
  .segment--active:hover {
    color: #fff;
  }

  .segmented {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.16), 0 1px 0 rgba(255, 255, 255, 0.04);
  }
  .segment-indicator {
    background: linear-gradient(180deg, #626266, #555559);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.24), inset 0 0 0 0.5px rgba(255, 255, 255, 0.12);
  }
  .segment--active .nav-icon { color: #77b6ff; }
  .segmented > .segment + .segment::before,
  .segmented > .nav-more-wrap::before {
    background: rgba(235, 235, 245, 0.12);
  }

  .nav-more-menu {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(44, 44, 46, 0.92);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  }

  .nav-more-item {
    color: #f5f5f7;
  }

  .nav-more-item:hover,
  .nav-more-item--active {
    background: #0a84ff;
    color: #fff;
  }

  .drawer-body {
    background: #1c1c1e;
  }
}

/* Keep incoming content responsive while the previous page fades away. */
.settings-content-enter-active {
  transition: opacity 220ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.settings-content-leave-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.settings-content-enter-from { opacity: 0; transform: translateY(5px); }
.settings-content-leave-to { opacity: 0; }
.nav-menu-enter-active,
.nav-menu-leave-active {
  transform-origin: top right;
  transition: opacity 150ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.nav-menu-enter-from,
.nav-menu-leave-to { opacity: 0; transform: translateY(-3px) scale(0.97); }

/* 抽屉动画：从右侧滑入 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-enter-active .drawer-mask,
.drawer-leave-active .drawer-mask {
  transition: opacity 0.22s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 1;
}

.drawer-enter-from .drawer-mask,
.drawer-leave-to .drawer-mask {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

.drawer-enter-to .drawer-panel,
.drawer-leave-from .drawer-panel {
  transform: translateX(0);
}

@media (max-width: 560px) {
  .drawer-panel {
    width: 100vw;
  }

  .drawer-nav { padding-inline: 12px; }
  .drawer-footer { padding-inline: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
