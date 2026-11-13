<template>
  <div class="settings-page bg-settings">
    <!-- 背景类型 -->
    <section class="apple-section">
      <h3 class="apple-header">{{ t('background.typeTitle') }}</h3>
      <div class="apple-group" role="radiogroup" :aria-label="t('background.typeTitle')">
        <label class="apple-row" :class="{ 'is-disabled': isLoading === true }">
          <span class="apple-row-label">{{ t('background.none') }}</span>
          <input type="radio" class="apple-radio" value="none" v-model="wallpaperType" name="bg-type" :disabled="isLoading === true" />
        </label>
        <label class="apple-row" :class="{ 'is-disabled': isLoading === true }">
          <span class="apple-row-label">{{ t('background.source') }}</span>
          <input type="radio" class="apple-radio" value="source" v-model="wallpaperType" name="bg-type" :disabled="isLoading === true" />
        </label>
        <label class="apple-row" :class="{ 'is-disabled': isLoading === true }">
          <span class="apple-row-label">{{ t('background.image') }}</span>
          <input type="radio" class="apple-radio" value="custom" v-model="wallpaperType" name="bg-type" :disabled="isLoading === true" />
        </label>
        <label class="apple-row" :class="{ 'is-disabled': isLoading === true }">
          <span class="apple-row-label">{{ t('background.color') }}</span>
          <input type="radio" class="apple-radio" value="color" v-model="wallpaperType" name="bg-type" :disabled="isLoading === true" />
        </label>
      </div>
      <p class="apple-footnote">{{ t('background.typeDesc') }}</p>
    </section>

    <section v-if="wallpaperType !== 'none'" class="apple-section">
      <h3 class="apple-header">{{ t('background.maskTitle') }}</h3>
      <div class="apple-group">
        <label class="apple-row">
          <span class="apple-row-label">{{ t('background.showMask') }}</span>
          <input type="checkbox" role="switch" class="apple-switch" :checked="showMask" @change="onMaskChange" />
        </label>
      </div>
      <p class="apple-footnote">{{ t('background.maskDesc') }}</p>
    </section>

    <!-- 自定义图片 -->
    <template v-if="wallpaperType === 'custom'">
      <hr class="settings-divider" />
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">{{ t('background.imageTitle') }}</h3>
          <p class="settings-section-desc">{{ t('background.imageDesc') }}</p>
        </div>

        <div class="bg-row">
          <input
            v-model="backgroundUrl"
            class="settings-input"
            :placeholder="localImageActive ? t('background.localPlaceholder') : t('background.urlPlaceholder')"
            @blur="validateAndApplyBackgroundUrl"
          />
          <button type="button" class="settings-btn settings-btn--ghost" @click="handleUploadClick">
            <Icon icon="fluent:arrow-upload-24-filled" class="text-sm" />
            {{ t('background.localImage') }}
          </button>
          <input type="file" @change="fileUp" id="fileInput" class="hidden" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" />
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div v-if="isUploading" class="upload-card">
            <div class="loading-spinner" />
            <div>
              <p class="upload-title">{{ t('background.processing') }}</p>
              <p class="settings-hint">{{ t('background.progress', { percent: Math.floor(uploadProgress) }) }}</p>
            </div>
          </div>
        </Transition>

        <div v-if="wallpaperUrl || backgroundUrl" class="preview-block">
          <p class="settings-field-label">{{ t('background.currentBackground') }}</p>
          <img
            :src="wallpaperUrl || backgroundUrl"
            class="preview-img"
            :alt="t('background.currentImageAlt')"
            loading="lazy"
          />
          <div class="source-actions">
            <button
              v-if="currentWallpaperUrl"
              type="button"
              class="settings-btn settings-btn--ghost"
              :disabled="isSavingFavorite || isCurrentWallpaperFavorite"
              @click="bookmarkCurrentWallpaper"
            >
              <Icon
                :icon="isCurrentWallpaperFavorite ? 'fluent:bookmark-24-filled' : 'fluent:bookmark-add-24-regular'"
                class="text-sm"
              />
              {{ isSavingFavorite ? t('background.savingFavorite') : isCurrentWallpaperFavorite ? t('background.saved') : t('background.save') }}
            </button>
            <a
              v-if="currentWallpaperUrl"
              class="settings-btn settings-btn--ghost source-visit-link"
              :href="currentWallpaperUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon icon="fluent:open-24-regular" class="text-sm" />
              {{ t('background.visit') }}
            </a>
          </div>
        </div>
      </section>
    </template>

    <!-- 颜色背景 -->
    <template v-if="wallpaperType === 'color'">
      <hr class="settings-divider" />
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">{{ t('background.colorTitle') }}</h3>
          <p class="settings-section-desc">{{ t('background.colorDesc') }}</p>
        </div>

        <div class="color-picker-panel">
          <div
            class="hue-bar"
            ref="hueBar"
            @click="selectHue"
            @mousedown="startHueDrag"
          >
            <div class="hue-thumb" :style="{ left: `${huePosition}%`, backgroundColor: hueColor }" />
          </div>
          <div
            class="sb-panel"
            ref="satBrightnessArea"
            :style="{
              backgroundColor: hueColor,
              backgroundImage: 'linear-gradient(to right, white, transparent), linear-gradient(to bottom, transparent, black)',
            }"
            @click="selectSaturationBrightness"
            @mousedown="startSatBrightDrag"
          >
            <div
              class="sb-thumb"
              :style="{ left: `${saturationPosition}%`, top: `${brightnessPosition}%` }"
            />
          </div>
        </div>

        <div class="bg-row">
          <div class="color-swatch" :style="{ backgroundColor: colorInput }" />
          <input
            type="text"
            v-model="colorInput"
            class="settings-input"
            placeholder="#3498db"
            spellcheck="false"
            @blur="validateColorInput"
          />
        </div>

        <div class="preset-grid">
          <button
            v-for="color in uniquePresets"
            :key="color"
            type="button"
            class="preset-chip"
            :style="{ backgroundColor: color }"
            :class="{ 'preset-chip--active': colorInput === color }"
            @click="selectPresetColor(color)"
          />
        </div>

        <div class="color-preview" :style="{ backgroundColor: colorInput }">
          <span :class="isDarkColor(colorInput) ? 'text-white' : 'text-gray-800'">{{ t('background.colorPreview') }}</span>
        </div>
      </section>
    </template>

    <!-- 壁纸源 -->
    <template v-if="wallpaperType === 'source'">
      <hr class="settings-divider" />
      <section class="settings-section">
        <div class="settings-section-head source-section-head">
          <div>
            <h3 class="settings-section-title">{{ t('background.sourceTitle') }}</h3>
            <p class="settings-section-desc">{{ t('background.sourceDesc') }}</p>
          </div>
          <button
            v-if="hasSourceOptions"
            type="button"
            class="source-config-btn"
            :class="{ 'source-config-btn--active': sourceOptionsOpen }"
            :aria-expanded="sourceOptionsOpen"
            :aria-label="t('background.configureSource')"
            :title="t('background.configureSource')"
            @click="sourceOptionsOpen = !sourceOptionsOpen"
          >
            <Icon icon="fluent:settings-24-regular" />
          </button>
        </div>

        <div class="source-grid">
          <button
            v-for="src in wallpaperSources"
            :key="src.id"
            type="button"
            class="source-card"
            :class="{ 'source-card--active': wallpaperSourceId === src.id }"
            :disabled="isRefreshingSource"
            @click="selectSource(src.id)"
          >
            <span class="source-card-icon" :class="`source-card-icon--${src.id}`">
              <img v-if="sourceLogo(src.id)" :src="sourceLogo(src.id)" class="source-brand-logo" alt="" width="24" height="24" />
              <Icon v-else icon="fluent:link-24-regular" class="text-base" />
            </span>
            <span class="source-card-copy">
              <span class="source-card-name">{{ t(`background.sources.${src.id}.name`) }}</span>
              <span class="source-card-desc">{{ t(`background.sources.${src.id}.description`) }}</span>
            </span>
            <Icon
              v-if="wallpaperSourceId === src.id"
              icon="fluent:checkmark-circle-24-filled"
              class="source-card-check"
            />
          </button>
        </div>

        <!-- 当前源选项 -->
        <div v-if="showSourceOptions" class="source-options">
          <template v-if="showWallhavenOptions">
            <div class="settings-field">
              <label class="settings-field-label">{{ t('background.keyword') }}</label>
              <input
                v-model="wallhavenQueryInput"
                class="settings-input"
                placeholder="landscape、anime、nature…"
                @blur="applyWallhavenQuery"
                @keydown.enter="applyWallhavenQuery"
              />
            </div>
            <div class="settings-field">
              <label class="settings-field-label">API Key <span class="opt-tag">{{ t('background.optional') }}</span></label>
              <input
                v-model="wallhavenApiKeyInput"
                class="settings-input"
                type="password"
                :placeholder="t('background.quotaPlaceholder')"
                autocomplete="off"
                @blur="applyWallhavenApiKey"
              />
            </div>
            <label class="settings-toggle-row" :class="{ 'is-disabled': !wallhavenApiKeyInput.trim() }">
              <input
                type="checkbox"
                class="settings-toggle-input"
                :checked="wallhavenNsfw"
                :disabled="!wallhavenApiKeyInput.trim()"
                @change="onWallhavenNsfwChange"
              />
              <span class="settings-toggle-label">{{ t('background.allowNsfw') }}</span>
            </label>
            <p class="settings-hint">
              {{ t('background.from') }}
              <a class="settings-link" href="https://wallhaven.cc/" target="_blank" rel="noopener noreferrer">wallhaven.cc</a>
              · {{ t('background.nsfwNeedsKey') }}
            </p>
          </template>

          <div v-else-if="wallpaperSourceId === 'custom'" class="settings-field">
              <label class="settings-field-label">{{ t('background.imageUrl') }}</label>
            <input
              v-model="sourceUrlInput"
              class="settings-input"
              placeholder="https://example.com/wallpaper.jpg"
              @blur="validateAndApplySourceUrl"
              @keydown.enter="validateAndApplySourceUrl"
            />
          </div>
        </div>

        <!-- 预览 + 操作 -->
        <div class="source-footer">
          <div v-if="wallpaperUrl || sourceUrl" class="source-preview">
            <img
              :src="wallpaperUrl || sourceUrl"
              :alt="t('background.currentWallpaper')"
              class="source-preview-img"
              loading="lazy"
            />
            <div class="source-preview-meta">
              <span class="source-preview-label">{{ t('background.currentWallpaper') }}</span>
              <span class="source-preview-res">{{ t('background.aboutResolution', { resolution: targetResolutionLabel }) }}</span>
            </div>
          </div>

          <div class="source-actions">
            <button
              type="button"
              class="settings-btn source-prev-btn"
              :disabled="!canRestorePreviousWallpaper || isRefreshingSource || isRestoringWallpaper"
              :title="canRestorePreviousWallpaper ? t('background.previous') : t('background.previous')"
              @click="restoreCurrentSource"
            >
              <Icon
                icon="fluent:arrow-left-24-filled"
                class="text-sm"
                :class="{ 'is-spinning': isRestoringWallpaper }"
              />
              {{ t('background.previous') }}
            </button>
            <button
              type="button"
              class="settings-btn settings-btn--primary source-refresh-btn"
              :disabled="isRefreshingSource || isRestoringWallpaper"
              @click="refreshCurrentSource"
            >
              <Icon
                icon="fluent:arrow-sync-24-filled"
                class="text-sm"
                :class="{ 'is-spinning': isRefreshingSource }"
              />
              {{ isRefreshingSource ? t('background.fetching') : t('background.another') }}
            </button>
            <button
              v-if="currentWallpaperUrl"
              type="button"
              class="settings-btn settings-btn--ghost"
              :disabled="isSavingFavorite || isCurrentWallpaperFavorite"
              @click="bookmarkCurrentWallpaper"
            >
              <Icon
                :icon="isCurrentWallpaperFavorite ? 'fluent:bookmark-24-filled' : 'fluent:bookmark-add-24-regular'"
                class="text-sm"
              />
              {{ isSavingFavorite ? t('background.savingFavorite') : isCurrentWallpaperFavorite ? t('background.saved') : t('background.save') }}
            </button>
            <a
              v-if="currentWallpaperUrl"
              class="settings-btn settings-btn--ghost source-visit-link"
              :href="currentWallpaperUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon icon="fluent:open-24-regular" class="text-sm" />
              {{ t('background.visit') }}
            </a>
            <a
              v-if="currentSourceMeta?.homepage"
              class="source-home-link"
              :href="currentSourceMeta.homepage"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t('background.homepage') }}
              <Icon icon="fluent:open-24-regular" class="text-xs" />
            </a>
          </div>
        </div>
      </section>
    </template>

    <hr class="settings-divider" />
    <section class="settings-section">
      <div class="settings-section-head">
        <h3 class="settings-section-title">{{ t('background.favoritesTitle') }}</h3>
        <p class="settings-section-desc">{{ t('background.favoriteCount', { count: favoriteWallpapers.length }) }}</p>
      </div>

      <div v-if="favoriteWallpapers.length" class="favorite-grid">
        <article v-for="favorite in favoriteWallpapers" :key="favorite.url" class="favorite-card">
          <img :src="favorite.url" :alt="favorite.sourceName" class="favorite-img" loading="lazy" />
          <div class="favorite-footer">
            <span class="favorite-source">{{ favorite.sourceName }}</span>
            <div class="favorite-actions">
              <button
                type="button"
                class="favorite-action-btn"
                :aria-label="t('background.useThis')"
                :title="t('background.use')"
                @click="useFavoriteWallpaper(favorite)"
              >
                <Icon icon="fluent:checkmark-24-regular" />
              </button>
              <a
                class="favorite-action-btn"
                :href="favorite.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="t('background.visitOriginal')"
                :title="t('background.visit')"
              >
                <Icon icon="fluent:open-24-regular" />
              </a>
              <button
                type="button"
                class="favorite-action-btn favorite-action-btn--danger"
                :aria-label="t('background.unfavorite')"
                :title="t('background.unfavorite')"
                @click="removeFavoriteWallpaper(favorite.url)"
              >
                <Icon icon="fluent:delete-24-regular" />
              </button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="favorite-empty">{{ t('background.noFavorites') }}</div>
    </section>
  </div>
</template>

<script setup lang='ts'>
import { useNotification } from "@/composables/useNotification";
import { useI18n } from "@/i18n";
import { useWallpaper } from "@/composables/useWallpaper";
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { Icon } from "@iconify/vue";
import { storage } from "@/utils/storage";
import { useDebounceFn } from "@vueuse/core";
import { loadImage } from "@/utils/imageCache";
import { isLocalImageUrl, prepareLocalWallpaper } from "@/utils/localWallpaper";
import {
  WALLPAPER_SOURCES,
  getWallpaperSourceMeta,
  supportsWallhavenQuery,
  getTargetResolution,
  type WallpaperSourceId,
} from "@/utils/wallpaperSources";

const { success, error } = useNotification();
const { t } = useI18n();
const {
  wallpaperType,
  wallpaperUrl,
  originalWallpaperUrl, // 添加原始URL变量
  sourceUrl,
  wallpaperSourceId,
  wallhavenQuery,
  wallhavenApiKey,
  wallhavenNsfw,
  backgroundColor,
  showMask,
  updateWallpaper,
  updateSourceUrl,
  updateWallpaperSource,
  refreshSourceWallpaper,
  restorePreviousWallpaper,
  applySourceWallpaper,
  updateWallhavenQuery,
  updateWallhavenApiKey,
  updateWallhavenNsfw,
  updateBackgroundColor,
  loadState,
  toggleMask,
  canRestorePreviousWallpaper,
  isRestoringWallpaper,
} = useWallpaper();

const wallpaperSources = WALLPAPER_SOURCES;
const isRefreshingSource = ref(false);
const isSavingFavorite = ref(false);
const sourceOptionsOpen = ref(false);
const wallhavenQueryInput = ref(wallhavenQuery.value || '');
const wallhavenApiKeyInput = ref(wallhavenApiKey.value || '');

const showWallhavenOptions = computed(() => supportsWallhavenQuery(wallpaperSourceId.value));
const hasSourceOptions = computed(
  () => showWallhavenOptions.value || wallpaperSourceId.value === 'custom'
);
const showSourceOptions = computed(
  () => hasSourceOptions.value && sourceOptionsOpen.value
);
const currentSourceMeta = computed(() => getWallpaperSourceMeta(wallpaperSourceId.value));
const targetResolutionLabel = computed(() => getTargetResolution().atleast);
const currentWallpaperUrl = computed(() => {
  if (!['source', 'custom'].includes(wallpaperType.value)) return '';
  const url = originalWallpaperUrl.value || (wallpaperType.value === 'source' ? sourceUrl.value : '');
  if (!url) return '';

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
});
const currentFavoriteSourceId = computed<WallpaperSourceId>(() =>
  wallpaperType.value === 'custom' ? 'custom' : wallpaperSourceId.value
);
const currentFavoriteSourceName = computed(() =>
  wallpaperType.value === 'custom' ? t('background.customImage') : t(`background.sources.${wallpaperSourceId.value}.name`)
);

interface FavoriteWallpaper {
  url: string;
  sourceId: WallpaperSourceId;
  sourceName: string;
  savedAt: number;
}

const FAVORITE_WALLPAPERS_KEY = 'favoriteWallpapers';
const favoriteWallpapers = ref<FavoriteWallpaper[]>([]);
const isCurrentWallpaperFavorite = computed(() =>
  favoriteWallpapers.value.some((favorite) => favorite.url === currentWallpaperUrl.value)
);

const persistFavoriteWallpapers = () =>
  storage.set(FAVORITE_WALLPAPERS_KEY, JSON.stringify(favoriteWallpapers.value));

const loadFavoriteWallpapers = async () => {
  const stored = await storage.get<string | FavoriteWallpaper[]>(FAVORITE_WALLPAPERS_KEY);
  try {
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    favoriteWallpapers.value = Array.isArray(parsed)
      ? parsed.filter((favorite) => favorite && typeof favorite.url === 'string')
      : [];
  } catch {
    favoriteWallpapers.value = [];
  }
};

const SOURCE_LOGOS: Partial<Record<WallpaperSourceId, string>> = {
  picsum: '/brand-icons/picsum.png',
  bing: '/brand-icons/bing.png',
  'wallhaven-random': '/brand-icons/wallhaven.png',
  'wallhaven-toplist': '/brand-icons/wallhaven.png',
};
const sourceLogo = (id: WallpaperSourceId) => SOURCE_LOGOS[id];

const selectSource = async (id: WallpaperSourceId) => {
  if (isRefreshingSource.value) return;
  sourceOptionsOpen.value = false;
  isRefreshingSource.value = true;
  try {
    await updateWallpaperSource(id);
    success(t('background.sourceSwitched'), t(`background.sources.${id}.name`));
  } catch (e) {
    error(t('background.sourceSwitchFailed'), e?.toString());
  } finally {
    isRefreshingSource.value = false;
  }
};

const refreshCurrentSource = async () => {
  if (isRefreshingSource.value) return;
  isRefreshingSource.value = true;
  try {
    await refreshSourceWallpaper();
    success(t('background.wallpaperUpdated'), t(`background.sources.${wallpaperSourceId.value}.name`));
  } catch (e) {
    error(t('background.wallpaperFailed'), e?.toString());
  } finally {
    isRefreshingSource.value = false;
  }
};

const restoreCurrentSource = async () => {
  if (!canRestorePreviousWallpaper.value || isRefreshingSource.value || isRestoringWallpaper.value) return;
  try {
    const restored = await restorePreviousWallpaper();
    if (restored) success(t('background.restoredPrevious'), '');
  } catch (e) {
    error(t('background.restoreFailed'), e?.toString());
  }
};

const bookmarkCurrentWallpaper = async () => {
  const url = currentWallpaperUrl.value;
  if (!url || isSavingFavorite.value || isCurrentWallpaperFavorite.value) return;

  isSavingFavorite.value = true;
  try {
    favoriteWallpapers.value.unshift({
      url,
      sourceId: currentFavoriteSourceId.value,
      sourceName: currentFavoriteSourceName.value,
      savedAt: Date.now(),
    });
    await persistFavoriteWallpapers();
    success(t('background.favoriteSaved'), t('background.favoriteSavedDetail'));
  } catch (e) {
    error(t('background.favoriteFailed'), e instanceof Error ? e.message : String(e));
  } finally {
    isSavingFavorite.value = false;
  }
};

const useFavoriteWallpaper = async (favorite: FavoriteWallpaper) => {
  try {
    await applySourceWallpaper(favorite.url, favorite.sourceId);
    success(t('background.wallpaperApplied'), favorite.sourceName);
  } catch (e) {
    error(t('background.applyFailed'), e instanceof Error ? e.message : String(e));
  }
};

const removeFavoriteWallpaper = async (url: string) => {
  const previous = favoriteWallpapers.value;
  favoriteWallpapers.value = previous.filter((favorite) => favorite.url !== url);
  try {
    await persistFavoriteWallpapers();
    success(t('background.unfavorited'), t('background.unfavoritedDetail'));
  } catch (e) {
    favoriteWallpapers.value = previous;
    error(t('background.unfavoriteFailed'), e instanceof Error ? e.message : String(e));
  }
};

const applyWallhavenQuery = async () => {
  await updateWallhavenQuery(wallhavenQueryInput.value.trim());
};

const applyWallhavenApiKey = async () => {
  await updateWallhavenApiKey(wallhavenApiKeyInput.value.trim());
};

const onWallhavenNsfwChange = async (event: Event) => {
  await updateWallhavenNsfw((event.target as HTMLInputElement).checked);
};

const onMaskChange = (e: Event) => {
  toggleMask((e.target as HTMLInputElement).checked);
};

// 本地状态只用于临时存储
// 使用原始URL而不是缓存的数据URL
const backgroundUrl = ref(isLocalImageUrl(originalWallpaperUrl.value) ? "" : originalWallpaperUrl.value || "");
const recentImage = ref("");
const sourceUrlInput = ref(
  sourceUrl.value || "https://picsum.photos/1920/1080"
);
// 设置为null，表示组件初始化中，避免在初始化阶段显示加载状态
const isLoading = ref(null);

// 缓存的图片URL映射
const cachedImages = ref(new Map<string, string>());

// 颜色背景相关状态
const colorInput = ref(backgroundColor.value || '#3498db');

// 调色盘相关状态
const huePosition = ref(50); // 色相位置（百分比）
const saturationPosition = ref(50); // 饱和度位置（百分比）
const brightnessPosition = ref(50); // 亮度位置（百分比）
const hueColor = ref('#ff0000'); // 当前色相的颜色

// 调色盘元素引用
const hueBar = ref(null);
const satBrightnessArea = ref(null);

// 拖动状态
const isDraggingHue = ref(false);
const isDraggingSatBright = ref(false);

// 简化预设颜色，只保留基础颜色
const presetColors = [
  // 基础颜色
  '#ffffff', // 白色
  '#000000', // 黑色
  '#3498db', // 蓝色
  '#2ecc71', // 绿色
  '#e74c3c', // 红色
  '#f39c12', // 橙色
  '#9b59b6', // 紫色
  '#1abc9c', // 青绿色
  '#34495e', // 深蓝色
  '#7f8c8d', // 灰色
  '#2c3e50', // 深灰色
  '#d35400', // 深橙色
  '#c0392b', // 深红色
  '#8e44ad', // 深紫色
  '#16a085', // 深青绿色
  '#27ae60', // 深绿色
  '#f1c40f', // 黄色
  '#ffffff', // 白色
];

const uniquePresets = computed(() => [...new Set(presetColors)]);

// 添加上传状态
const isUploading = ref(false);
const localImageActive = computed(() => wallpaperType.value === 'custom' && isLocalImageUrl(originalWallpaperUrl.value));
const uploadProgress = ref(0);

// 获取原始URL
// 现在我们有originalWallpaperUrl变量，可以直接使用

// 获取图片URL，添加时间戳参数避免缓存
const getNoCacheImageUrl = (url: string): string => {
  if (!url) return '';
  
  let originalUrl = url;
  
  // 如果是数据URL，尝试获取原始URL
  if (url.startsWith('data:')) {
    // 如果是当前壁纸，使用originalWallpaperUrl
    if (url === wallpaperUrl.value && originalWallpaperUrl.value) {
      originalUrl = originalWallpaperUrl.value;
      console.log('当前壁纸使用原始URL:', originalUrl);
    } 
    // 如果是源壁纸，使用源URL
    else if (wallpaperType.value === 'source' && sourceUrl.value) {
      originalUrl = sourceUrl.value;
      console.log('源壁纸使用源URL:', originalUrl);
    } 
    // 如果没有原始URL，使用占位图片
    else {
      console.log('没有找到原始URL，使用占位图片');
      return 'https://via.placeholder.com/300x168?text=Image';
    }
  }
  
  // 添加时间戳参数避免浏览器缓存
  const timestamp = Date.now();
  const separator = originalUrl.includes('?') ? '&' : '?';
  const result = `${originalUrl}${separator}t=${timestamp}`;
  console.log('最终返回的URL:', result);
  return result;
};

// 历史记录功能已移除

// 使用防抖优化壁纸类型切换
const debouncedWatchWallpaperType = useDebounceFn(async (newType: string) => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    if (newType === "custom") {
      const url = originalWallpaperUrl.value || backgroundUrl.value;
      backgroundUrl.value = isLocalImageUrl(url) ? '' : url;
      if (url) await updateWallpaper("custom", url);
    } else if (newType === "source") {
      await updateWallpaper("source");
    } else if (newType === "color") {
      colorInput.value = backgroundColor.value;
      await updateWallpaper("color");
    } else {
      backgroundUrl.value = "";
      await updateWallpaper("none");
    }
  } catch (e) {
    error(t("background.switchFailed"), e?.toString());
  } finally {
    isLoading.value = false;
  }
}, 300);

// 监听壁纸类型变化
watch(wallpaperType, debouncedWatchWallpaperType);

// 监听sourceUrl变化，同步到本地输入框
watch(sourceUrl, (newUrl) => {
  if (newUrl) {
    sourceUrlInput.value = newUrl;
  }
});

// 监听originalWallpaperUrl变化，同步到背景输入框
watch(originalWallpaperUrl, (newUrl) => {
  if (newUrl && wallpaperType.value === 'custom') {
    backgroundUrl.value = isLocalImageUrl(newUrl) ? '' : newUrl;
  }
});

// 验证并应用背景图片URL
const validateAndApplyBackgroundUrl = async () => {
  if (isLoading.value || !backgroundUrl.value.trim()) return;

  isLoading.value = true;
  try {
    // 清除存储中的旧壁纸信息
    await storage.remove("customWallpaper");
    // 设置新的壁纸，使用原始URL
    const originalUrl = backgroundUrl.value;
    recentImage.value = originalUrl;
    await updateWallpaper("custom", originalUrl);
    success(t("background.backgroundUpdated"), t("background.backgroundUpdatedDetail"));
  } catch (e) {
    error(t("background.applyBackgroundFailed"), e?.toString());
  } finally {
    isLoading.value = false;
  }
};

// 应用背景URL
const applyBackgroundUrl = async () => {
  if (isLoading.value || !backgroundUrl.value) return;

  isLoading.value = true;
  try {
    // 清除存储中的旧壁纸信息
    await storage.remove("customWallpaper");
    // 设置新的壁纸，使用原始URL
    const originalUrl = backgroundUrl.value;
    recentImage.value = originalUrl;
    await updateWallpaper("custom", originalUrl);
    success(t("background.backgroundUpdated"), t("background.backgroundUpdatedDetail"));
  } catch (e) {
    error(t("background.applyBackgroundFailed"), e?.toString());
  } finally {
    isLoading.value = false;
  }
};

// 验证并应用自定义壁纸链接
const validateAndApplySourceUrl = async () => {
  if (isLoading.value || isRefreshingSource.value) return;

  isLoading.value = true;
  try {
    const url = sourceUrlInput.value.trim();
    if (!url) {
      error(t('background.urlRequired'), '');
      return;
    }
    await updateSourceUrl(url);
    success(t('background.customApplied'), '');
  } catch (e) {
    error(t('background.updateFailed'), e?.toString());
  } finally {
    isLoading.value = false;
  }
};

const handleUploadClick = () => {
  document.getElementById("fileInput")?.click();
};

// 本地图片：只在浏览器内处理并保存到插件存储，不上传到任何服务器
const fileUp = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || isUploading.value) return;

  isUploading.value = true;
  uploadProgress.value = 30;
  try {
    const dataUrl = await prepareLocalWallpaper(file);
    uploadProgress.value = 80;
    await storage.remove("customWallpaper");
    recentImage.value = dataUrl;
    backgroundUrl.value = '';
    await updateWallpaper('custom', dataUrl);
    uploadProgress.value = 100;
    success(t('background.localSet'), file.name);
  } catch (e) {
    error(t('background.localFailed'), e instanceof Error ? e.message : String(e));
  } finally {
    setTimeout(() => {
      isUploading.value = false;
      uploadProgress.value = 0;
    }, 300);
  }
};

// 获取缓存的图片URL
const getCachedImageUrl = (url: string): string => {
  // 如果没有URL或URL为空，返回空字符串
  if (!url) return '';
  
  // 如果是数据URL，直接返回
  if (url.startsWith('data:')) return url;
  
  // 如果已经有缓存，直接返回
  if (cachedImages.value.has(url)) {
    return cachedImages.value.get(url) || url;
  }
  
  // 否则异步加载并缓存图片，但不阻塞当前渲染
  setTimeout(() => {
    if (!cachedImages.value.has(url)) {
      loadImage(url).then(cachedUrl => {
        cachedImages.value.set(url, cachedUrl);
      }).catch(err => {
        console.error('加载缓存图片失败:', err);
      });
    }
  }, 0);
  
  // 在缓存加载完成前先返回原始URL
  return url;
};

// 判断颜色是否为深色，用于决定文字颜色
const isDarkColor = (color: string): boolean => {
  // 将十六进制颜色转换为RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 计算亮度（使用感知亮度公式）
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 如果亮度小于128，认为是深色
  return brightness < 128;
};

// 选择预设颜色
const selectPresetColor = (color: string) => {
  colorInput.value = color;
  updateColorFromHex(color);
  validateColorInput();
};

// 验证颜色输入
const validateColorInput = () => {
  // 验证颜色格式
  const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
  if (!colorRegex.test(colorInput.value)) {
    // 如果不是有效的十六进制颜色，重置为默认值
    error(t('background.colorInvalid'), t('background.colorInvalidDetail'));
    colorInput.value = backgroundColor.value || '#3498db';
    updateColorFromHex(colorInput.value);
    return;
  }
  
  // 更新背景颜色
  updateBackgroundColor(colorInput.value);
  updateColorFromHex(colorInput.value);
};

// 调色盘相关函数

// 选择色相
const selectHue = (event: MouseEvent) => {
  if (!hueBar.value) return;
  
  const rect = hueBar.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const width = rect.width;
  
  // 计算百分比位置
  const position = Math.max(0, Math.min(100, (x / width) * 100));
  huePosition.value = position;
  
  // 更新色相颜色
  updateHueColor();
  
  // 更新最终颜色
  updateFinalColor();
};

// 选择饱和度和亮度
const selectSaturationBrightness = (event: MouseEvent) => {
  if (!satBrightnessArea.value) return;
  
  const rect = satBrightnessArea.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const width = rect.width;
  const height = rect.height;
  
  // 计算百分比位置
  const satPosition = Math.max(0, Math.min(100, (x / width) * 100));
  const brightPosition = Math.max(0, Math.min(100, (y / height) * 100));
  
  saturationPosition.value = satPosition;
  brightnessPosition.value = brightPosition;
  
  // 更新最终颜色
  updateFinalColor();
};

// 开始拖动色相
const startHueDrag = (event: MouseEvent) => {
  isDraggingHue.value = true;
  selectHue(event);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingHue.value) {
      selectHue(e);
    }
  };
  
  const handleMouseUp = () => {
    isDraggingHue.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 开始拖动饱和度/亮度
const startSatBrightDrag = (event: MouseEvent) => {
  isDraggingSatBright.value = true;
  selectSaturationBrightness(event);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingSatBright.value) {
      selectSaturationBrightness(e);
    }
  };
  
  const handleMouseUp = () => {
    isDraggingSatBright.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 更新色相颜色
const updateHueColor = () => {
  // 根据色相位置计算RGB颜色
  const hue = (huePosition.value / 100) * 360;
  hueColor.value = hslToHex(hue, 100, 50);
};

// 更新最终颜色
const updateFinalColor = () => {
  // 根据色相、饱和度和亮度计算最终颜色
  const hue = (huePosition.value / 100) * 360;
  const saturation = saturationPosition.value;
  const brightness = 100 - brightnessPosition.value; // 亮度是从上到下递减的
  
  // 转换为十六进制颜色
  colorInput.value = hslToHex(hue, saturation, brightness);
  
  // 更新背景颜色
  updateBackgroundColor(colorInput.value);
};

// 从十六进制颜色更新调色盘状态
const updateColorFromHex = (hexColor: string) => {
  // 将十六进制颜色转换为HSL
  const hsl = hexToHsl(hexColor);
  
  // 更新调色盘状态
  huePosition.value = (hsl.h / 360) * 100;
  saturationPosition.value = hsl.s;
  brightnessPosition.value = 100 - hsl.l; // 亮度是从上到下递减的
  
  // 更新色相颜色
  updateHueColor();
};

// HSL转十六进制颜色
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  // 转换为十六进制
  const toHex = (c: number): string => {
    const hex = Math.round((c + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// 十六进制颜色转换为HSL
const hexToHsl = (hex: string): {h: number, s: number, l: number} => {
  // 将十六进制颜色转换为RGB
  let r, g, b;
  
  // 处理缩写形式 #RGB
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else {
    // 处理完整形式 #RRGGBB
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }
  
  // 计算HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
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
  
  return {
    h: h * 360,
    s: s * 100,
    l: l * 100
  };
};



// 组件挂载时加载状态
onMounted(async () => {
  // 静默加载状态，不显示加载动画
  await Promise.all([loadState(), loadFavoriteWallpapers()]);

  // 根据当前壁纸类型设置相应的状态
  if (wallpaperType.value === "custom") {
    // 如果是自定义背景，使用原始URL而不是缓存的数据URL
    backgroundUrl.value = originalWallpaperUrl.value || wallpaperUrl.value;
    console.log('初始化背景URL:', backgroundUrl.value);
    recentImage.value = wallpaperUrl.value;
  } else if (wallpaperType.value === "source") {
    sourceUrlInput.value = sourceUrl.value || '';
    wallhavenQueryInput.value = wallhavenQuery.value || '';
    wallhavenApiKeyInput.value = wallhavenApiKey.value || '';
  } else if (wallpaperType.value === "color") {
    // 如果是颜色背景，同步颜色到输入框
    colorInput.value = backgroundColor.value || "#3498db";
    // 初始化调色盘状态
    updateColorFromHex(colorInput.value);
  }

  // 初始化完成后，将isLoading设置为false
  isLoading.value = false;
});

// 监听颜色输入变化
watch(colorInput, async (newValue) => {
  // 验证颜色格式
  const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
  if (!colorRegex.test(newValue)) {
    return; // 如果不是有效的颜色格式，不进行更新
  }

  if (isLoading.value || newValue === backgroundColor.value) return;

  isLoading.value = true;
  try {
    // 更新背景颜色
    await updateBackgroundColor(newValue);

    // 如果当前是颜色背景类型，更新壁纸
    if (wallpaperType.value === 'color') {
      await updateWallpaper('color');
    }

    success(t('background.colorUpdated'), t('background.colorUpdatedDetail'));
  } catch (e) {
    error(t('background.colorFailed'), e?.toString());
    // 如果出错，还原设置
    colorInput.value = backgroundColor.value;
  } finally {
    isLoading.value = false;
  }
});

// 组件卸载时清理
onUnmounted(() => {
  if (recentImage.value && recentImage.value.startsWith("blob:")) {
    URL.revokeObjectURL(recentImage.value);
  }
});
</script>

<style scoped>
.bg-settings {
  gap: 28px;
}

.bg-settings .settings-section {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px 16px;
}

.bg-settings .settings-divider { display: none; }

@media (prefers-color-scheme: dark) {
  .bg-settings .settings-section { background: #2c2c2e; }
}

.bg-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bg-row .settings-input {
  flex: 1;
}

.source-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.source-section-head {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.source-config-btn {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-border-strong);
  border-radius: 8px;
  background: var(--ui-surface-soft);
  color: var(--ui-text-secondary);
  cursor: pointer;
  font-size: 16px;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.source-config-btn:hover,
.source-config-btn--active {
  color: var(--ui-accent);
  border-color: rgba(37, 99, 235, 0.4);
  background: var(--ui-accent-soft);
}

.source-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.source-card:hover:not(:disabled) {
  border-color: var(--ui-border-strong);
  background: rgba(255, 255, 255, 0.9);
}

.source-card:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.source-card--active {
  border-color: rgba(37, 99, 235, 0.45);
  background: var(--ui-accent-soft);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.source-brand-logo { width: 24px; height: 24px; object-fit: contain; }

.source-card-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #64748b;
  background: var(--ui-surface-soft);
}

.source-card--active .source-brand-logo { width: 24px; height: 24px; object-fit: contain; }

.source-card-icon {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.12);
}

.source-card-icon--bing { color: #0ea5e9; }
.source-card-icon--wallhaven-random,
.source-card-icon--wallhaven-toplist { color: #8b5cf6; }
.source-card-icon--custom { color: #64748b; }

.source-card-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  padding-right: 14px;
}

.source-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
  line-height: 1.2;
}

.source-card-desc {
  font-size: 11px;
  color: var(--ui-text-muted);
  line-height: 1.35;
}

.source-card-check {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 16px;
  color: #2563eb;
}

.source-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface-soft);
}

.opt-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--ui-text-muted);
  margin-left: 4px;
}

.source-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
}

.source-preview-img {
  width: 88px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  background: var(--ui-surface-soft);
}

.source-preview-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.source-preview-label {
  font-size: 12px;
  font-weight: 550;
  color: var(--ui-text);
}

.source-preview-res {
  font-size: 11px;
  color: var(--ui-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.source-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.source-refresh-btn {
  min-width: 108px;
}

.source-visit-link {
  text-decoration: none;
}

.favorite-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.favorite-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-surface);
}

.favorite-img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--ui-surface-soft);
}

.favorite-footer {
  min-height: 40px;
  padding: 6px 7px 6px 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.favorite-source {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-secondary);
  font-size: 11px;
}

.favorite-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.favorite-action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  font-size: 15px;
  text-decoration: none;
}

.favorite-action-btn:hover {
  color: var(--ui-accent);
  background: var(--ui-accent-soft);
}

.favorite-action-btn--danger:hover {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}

.favorite-empty {
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--ui-border-strong);
  border-radius: 8px;
  color: var(--ui-text-muted);
  font-size: 12px;
}

.source-home-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ui-text-muted);
  text-decoration: none;
  transition: color 0.15s;
}

.source-home-link:hover {
  color: var(--ui-accent);
}

.is-spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.settings-link {
  font-size: 12px;
  color: var(--ui-accent);
  text-decoration: none;
}

.settings-link:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  .source-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
  }

  .source-card--active {
    background: rgba(37, 99, 235, 0.16);
  }
}

@media (max-width: 520px) {
  .favorite-grid {
    grid-template-columns: 1fr;
  }
}

.upload-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
}

.upload-title {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-text);
}

.preview-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-img {
  width: 100%;
  max-width: 300px;
  height: 168px;
  object-fit: cover;
  border-radius: 10px;
  border: 1.5px solid var(--ui-accent);
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.18);
}

.color-picker-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
}

.hue-bar {
  position: relative;
  height: 14px;
  border-radius: 7px;
  cursor: crosshair;
  background: linear-gradient(
    to right,
    #ff0000 0%, #ffff00 17%, #00ff00 33%,
    #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%
  );
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.hue-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.sb-panel {
  position: relative;
  height: 120px;
  border-radius: 7px;
  cursor: crosshair;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.sb-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-swatch {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-chip {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid transparent;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.1s, border-color 0.1s;
}

.preset-chip:hover {
  transform: scale(1.12);
}

.preset-chip--active {
  border-color: var(--ui-accent) !important;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
  transform: scale(1.08);
}

.color-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--ui-border);
}

.loading-spinner {
  width: 22px;
  height: 22px;
  border: 2.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--ui-accent);
  animation: spin 1s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
  .loading-spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: #60a5fa;
  }
}
</style>
