import { ref, computed, onMounted } from 'vue';
import { isChromeStorageAvailable, storage } from '@/utils/storage';
import { loadImage, clearImageCache } from '@/utils/imageCache';
import {
    DEFAULT_WALLPAPER_SOURCE_ID,
    resolveWallpaperUrl,
    type WallpaperSourceId,
} from '@/utils/wallpaperSources';

export type BackgroundType = 'none' | 'source' | 'custom' | 'color';

export interface WallpaperState {
    type: BackgroundType;
    url: string;
    sourceUrl?: string;
    color?: string;
}

const DEFAULT_SOURCE_URL = 'https://picsum.photos/1920/1080';

const wallpaperType = ref<BackgroundType>('none');
const wallpaperUrl = ref<string>('');
const originalWallpaperUrl = ref<string>('');
const sourceUrl = ref<string>(DEFAULT_SOURCE_URL);
const wallpaperSourceId = ref<WallpaperSourceId>(DEFAULT_WALLPAPER_SOURCE_ID);
const wallhavenQuery = ref<string>('');
const wallhavenApiKey = ref<string>('');
const wallhavenNsfw = ref<boolean>(false);
const backgroundColor = ref<string>('#3498db');
const themeColor = ref<string>('#495057');
const showMask = ref<boolean>(true);
const showTime = ref<boolean>(true);
const showSeconds = ref<boolean>(false);
const showDate = ref<boolean>(true);
const use24Hour = ref<boolean>(true);
const clockFont = ref<string>('Inter');
const clockFontSize = ref<number>(96);
const clockFontWeight = ref<number>(700);
const useCustomColor = ref<boolean>(false);

const MAX_WALLPAPER_UNDO = 30;
const MAX_RECENT_WALLPAPERS = 20;

/** 可回到的上一张壁纸（按时间顺序） */
const wallpaperUndoStack = ref<string[]>([]);
/** 最近展示过的壁纸，用于随机时去重 */
const recentWallpaperUrls = ref<string[]>([]);
const isRestoringWallpaper = ref(false);

const canRestorePreviousWallpaper = computed(
  () => wallpaperUndoStack.value.length > 0 && !isRestoringWallpaper.value,
);

function rememberRecentWallpaper(url: string) {
  if (!url) return;
  recentWallpaperUrls.value = [
    url,
    ...recentWallpaperUrls.value.filter((item) => item !== url),
  ].slice(0, MAX_RECENT_WALLPAPERS);
}

function pushWallpaperUndo(url: string) {
  if (!url) return;
  wallpaperUndoStack.value = [...wallpaperUndoStack.value, url].slice(-MAX_WALLPAPER_UNDO);
}

function clearWallpaperNavigationHistory() {
  wallpaperUndoStack.value = [];
  recentWallpaperUrls.value = [];
}

async function applyWallpaperUrl(url: string) {
  originalWallpaperUrl.value = url;
  if (wallpaperSourceId.value === 'custom') {
    sourceUrl.value = url;
  }
  try {
    wallpaperUrl.value = await loadImage(url);
  } catch (e) {
    console.error('壁纸加载失败:', e);
    wallpaperUrl.value = url;
  }
}

interface AppConfig {
    wallpaperType: BackgroundType;
    wallpaperUrl: string;
    originalWallpaperUrl?: string;
    sourceUrl: string;
    wallpaperSourceId?: WallpaperSourceId;
    wallhavenQuery?: string;
    wallhavenApiKey?: string;
    wallhavenNsfw?: boolean;
    backgroundColor: string;
    themeColor: string;
    showMask: boolean;
    showTime: boolean;
    showSeconds: boolean;
    showDate: boolean;
    use24Hour: boolean;
    clockFont: string;
    clockFontSize: number;
    clockFontWeight: number;
    useCustomColor: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
    wallpaperType: 'none',
    wallpaperUrl: '',
    originalWallpaperUrl: '',
    sourceUrl: DEFAULT_SOURCE_URL,
    wallpaperSourceId: DEFAULT_WALLPAPER_SOURCE_ID,
    wallhavenQuery: '',
    wallhavenApiKey: '',
    wallhavenNsfw: false,
    backgroundColor: '#3498db',
    themeColor: '#495057',
    showMask: true,
    showTime: true,
    showSeconds: false,
    showDate: true,
    use24Hour: true,
    clockFont: 'Inter',
    clockFontSize: 96,
    clockFontWeight: 700,
    useCustomColor: false,
};

const LEGACY_CONFIG_KEYS = [
    'wallpaperType', 'wallpaperUrl', 'sourceUrl', 'backgroundColor',
    'themeColor', 'showMask', 'wallpaperHistory', 'showTime',
    'showSeconds', 'showDate', 'use24Hour',
];

function getChromeLocalStorage() {
    return isChromeStorageAvailable() ? chrome.storage.local : null;
}

function migrateSourceId(config: { sourceUrl?: string; wallpaperSourceId?: string }): WallpaperSourceId {
    if (config.wallpaperSourceId) {
        return config.wallpaperSourceId as WallpaperSourceId;
    }
    const url = config.sourceUrl || '';
    if (!url || url.includes('picsum.photos')) return 'picsum';
    if (url.includes('bing.com')) return 'bing';
    if (url.includes('wallhaven')) return 'wallhaven-random';
    return 'custom';
}

let isStateLoaded = false;
let loadStatePromise: Promise<void> | null = null;

export function useWallpaper() {
    const loadStateNow = async () => {
        try {
            let config: AppConfig = { ...DEFAULT_CONFIG };

            const chromeStorage = getChromeLocalStorage();
            if (chromeStorage) {
                const chromeData = await chromeStorage.get('appConfig');
                
                if (chromeData.appConfig) {
                    try {
                        const parsedConfig = typeof chromeData.appConfig === 'string' 
                            ? JSON.parse(chromeData.appConfig) 
                            : chromeData.appConfig;
                            
                        config = { ...DEFAULT_CONFIG, ...parsedConfig };
                    } catch (e) {
                        console.error('解析配置失败:', e);
                    }
                } else {
                    const oldData = await chromeStorage.get(LEGACY_CONFIG_KEYS);
                    
                    if (oldData) {
                        const oldConfig: Partial<AppConfig> = {};
                        
                        if (oldData.wallpaperType) oldConfig.wallpaperType = oldData.wallpaperType;
                        if (oldData.wallpaperUrl) oldConfig.wallpaperUrl = oldData.wallpaperUrl;
                        if (oldData.sourceUrl) oldConfig.sourceUrl = oldData.sourceUrl;
                        if (oldData.backgroundColor !== undefined) oldConfig.backgroundColor = oldData.backgroundColor;
                        if (oldData.themeColor !== undefined) oldConfig.themeColor = oldData.themeColor;
                        if (oldData.showMask !== undefined) oldConfig.showMask = oldData.showMask;
                        if (oldData.showTime !== undefined) oldConfig.showTime = oldData.showTime;
                        if (oldData.showSeconds !== undefined) oldConfig.showSeconds = oldData.showSeconds;
                        if (oldData.showDate !== undefined) oldConfig.showDate = oldData.showDate;
                        if (oldData.use24Hour !== undefined) oldConfig.use24Hour = oldData.use24Hour;
                        config = { ...DEFAULT_CONFIG, ...oldConfig };
                    }
                }
            } else {
                const localStorageConfig = localStorage.getItem('appConfig');
                
                if (localStorageConfig) {
                    try {
                        const parsedConfig = JSON.parse(localStorageConfig);
                        config = { ...DEFAULT_CONFIG, ...parsedConfig };
                    } catch (e) {
                        console.error('解析localStorage配置失败:', e);
                    }
                } else {
                    const oldConfig: Partial<AppConfig> = {};
                    
                    const storedType = localStorage.getItem('wallpaperType') as BackgroundType;
                    const storedUrl = localStorage.getItem('wallpaperUrl');
                    const storedSourceUrl = localStorage.getItem('sourceUrl');
                    const storedThemeColor = localStorage.getItem('themeColor');
                    const storedBackgroundColor = localStorage.getItem('backgroundColor');
                    const storedShowMask = localStorage.getItem('showMask');
                    const storedShowTime = localStorage.getItem('showTime');
                    const storedShowSeconds = localStorage.getItem('showSeconds');
                    const storedShowDate = localStorage.getItem('showDate');
                    const storedUse24Hour = localStorage.getItem('use24Hour');
                    
                    if (storedType) oldConfig.wallpaperType = storedType;
                    if (storedUrl) oldConfig.wallpaperUrl = storedUrl;
                    if (storedSourceUrl) oldConfig.sourceUrl = storedSourceUrl;
                    if (storedThemeColor) oldConfig.themeColor = storedThemeColor;
                    if (storedBackgroundColor) oldConfig.backgroundColor = storedBackgroundColor;
                    if (storedShowMask) oldConfig.showMask = storedShowMask === 'true';
                    if (storedShowTime) oldConfig.showTime = storedShowTime === 'true';
                    if (storedShowSeconds) oldConfig.showSeconds = storedShowSeconds === 'true';
                    if (storedShowDate) oldConfig.showDate = storedShowDate === 'true';
                    if (storedUse24Hour) oldConfig.use24Hour = storedUse24Hour === 'true';
                    
                    config = { ...DEFAULT_CONFIG, ...oldConfig };
                }
            }

            wallpaperType.value = config.wallpaperType;
            wallpaperUrl.value = config.wallpaperUrl || '';
            originalWallpaperUrl.value = config.originalWallpaperUrl || config.wallpaperUrl || '';
            sourceUrl.value = config.sourceUrl || DEFAULT_SOURCE_URL;
            wallpaperSourceId.value = migrateSourceId(config);
            wallhavenQuery.value = config.wallhavenQuery || '';
            wallhavenApiKey.value = config.wallhavenApiKey || '';
            wallhavenNsfw.value = Boolean(config.wallhavenNsfw && config.wallhavenApiKey);
            backgroundColor.value = config.backgroundColor || '#3498db';
            themeColor.value = config.themeColor || '#495057';
            showMask.value = config.showMask;
            showTime.value = config.showTime;
            showSeconds.value = config.showSeconds;
            showDate.value = config.showDate;
            use24Hour.value = config.use24Hour;
            clockFont.value = config.clockFont || 'Inter';
            clockFontSize.value = config.clockFontSize ?? 96;
            clockFontWeight.value = config.clockFontWeight ?? 700;
            useCustomColor.value = config.useCustomColor ?? false;
            
            if ((config.wallpaperType === 'custom' || config.wallpaperType === 'source') && themeColor.value === '#495057') {
                themeColor.value = '#ffffff';
            }

            if (config.wallpaperUrl && config.wallpaperType !== 'none') {
                try {
                    const cachedUrl = await loadImage(config.wallpaperUrl);
                    wallpaperUrl.value = cachedUrl;
                } catch (error) {
                    console.error('加载缓存壁纸失败:', error);
                    wallpaperUrl.value = config.wallpaperUrl;
                }
            }

            if (originalWallpaperUrl.value) {
                rememberRecentWallpaper(originalWallpaperUrl.value);
            }

        } catch (error) {
            console.error('Failed to load wallpaper state:', error);
            wallpaperType.value = 'none';
            wallpaperUrl.value = '';
            originalWallpaperUrl.value = '';
            sourceUrl.value = DEFAULT_SOURCE_URL;
            wallpaperSourceId.value = DEFAULT_WALLPAPER_SOURCE_ID;
            wallhavenQuery.value = '';
            wallhavenApiKey.value = '';
            wallhavenNsfw.value = false;
            showMask.value = true;
            showTime.value = true;
            showSeconds.value = false;
            showDate.value = true;
            use24Hour.value = true;
        }
    };

    const loadState = async (force = false) => {
        if (!force) {
            if (isStateLoaded) return;
            if (loadStatePromise) return loadStatePromise;
        }

        loadStatePromise = loadStateNow().then(() => {
            isStateLoaded = true;
        }).finally(() => {
            loadStatePromise = null;
        });

        return loadStatePromise;
    };

    const saveState = async () => {
        try {
            const appConfig = {
                wallpaperType: wallpaperType.value,
                wallpaperUrl: wallpaperUrl.value,
                originalWallpaperUrl: originalWallpaperUrl.value,
                sourceUrl: sourceUrl.value,
                wallpaperSourceId: wallpaperSourceId.value,
                wallhavenQuery: wallhavenQuery.value,
                wallhavenApiKey: wallhavenApiKey.value,
                wallhavenNsfw: wallhavenNsfw.value,
                backgroundColor: backgroundColor.value,
                themeColor: themeColor.value,
                showMask: showMask.value,
                showTime: showTime.value,
                showSeconds: showSeconds.value,
                showDate: showDate.value,
                use24Hour: use24Hour.value,
                clockFont: clockFont.value,
                clockFontSize: clockFontSize.value,
                clockFontWeight: clockFontWeight.value,
                useCustomColor: useCustomColor.value
            };
            
            const chromeStorage = getChromeLocalStorage();
            if (chromeStorage) {
                await chromeStorage.set({
                    appConfig: appConfig
                });
                
                await chromeStorage.remove(LEGACY_CONFIG_KEYS);
            }

            localStorage.setItem('appConfig', JSON.stringify(appConfig));
            for (const key of LEGACY_CONFIG_KEYS) {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.error('Failed to save wallpaper state:', error);
        }
    };

    const refreshSourceWallpaper = async () => {
        const current = originalWallpaperUrl.value;
        if (current) {
            pushWallpaperUndo(current);
            rememberRecentWallpaper(current);
        }

        const excludeUrls = [...recentWallpaperUrls.value];
        let imageUrl = '';
        const resolveOptions = {
            customUrl: sourceUrl.value,
            wallhavenQuery: wallhavenQuery.value,
            wallhavenApiKey: wallhavenApiKey.value,
            wallhavenNsfw: wallhavenNsfw.value,
            excludeUrls,
        };

        for (let attempt = 0; attempt < 4; attempt++) {
            imageUrl = await resolveWallpaperUrl(wallpaperSourceId.value, {
                ...resolveOptions,
                excludeUrls: [...excludeUrls],
            });
            if (!excludeUrls.includes(imageUrl)) break;
            excludeUrls.push(imageUrl);
        }

        await applyWallpaperUrl(imageUrl);
        rememberRecentWallpaper(imageUrl);
        await saveState();
        return imageUrl;
    };

    const restorePreviousWallpaper = async () => {
        if (!wallpaperUndoStack.value.length || isRestoringWallpaper.value) return null;

        isRestoringWallpaper.value = true;
        try {
            const stack = [...wallpaperUndoStack.value];
            const previous = stack.pop();
            if (!previous) return null;

            wallpaperUndoStack.value = stack;
            await applyWallpaperUrl(previous);
            rememberRecentWallpaper(previous);
            await saveState();
            return previous;
        } finally {
            isRestoringWallpaper.value = false;
        }
    };

    const applySourceWallpaper = async (url: string, sourceId?: WallpaperSourceId) => {
        wallpaperType.value = 'source';
        if (sourceId) wallpaperSourceId.value = sourceId;
        if (sourceId === 'custom') sourceUrl.value = url;
        originalWallpaperUrl.value = url;

        if (themeColor.value === '#495057') {
            themeColor.value = '#ffffff';
        }

        try {
            wallpaperUrl.value = await loadImage(url);
        } catch (e) {
            console.error('收藏壁纸加载失败:', e);
            wallpaperUrl.value = url;
        }

        await saveState();
    };

    const updateWallpaperSource = async (id: WallpaperSourceId) => {
        clearWallpaperNavigationHistory();
        wallpaperSourceId.value = id;
        if (wallpaperType.value === 'source') {
            await refreshSourceWallpaper();
        } else {
            await saveState();
        }
    };

    const updateWallhavenQuery = async (q: string) => {
        wallhavenQuery.value = q;
        await saveState();
    };

    const updateWallhavenApiKey = async (key: string) => {
        wallhavenApiKey.value = key;
        if (!key) wallhavenNsfw.value = false;
        await saveState();
    };

    const updateWallhavenNsfw = async (enabled: boolean) => {
        wallhavenNsfw.value = Boolean(enabled && wallhavenApiKey.value);
        await saveState();
    };

    const updateWallpaper = async (type: BackgroundType, url: string = '') => {
        wallpaperType.value = type;

        if ((type === 'custom' || type === 'source') && themeColor.value === '#495057') {
            themeColor.value = '#ffffff';
        }

        if (type === 'color') {
            wallpaperUrl.value = '';
            originalWallpaperUrl.value = '';
            await saveState();
            return;
        }

        if (type === 'source') {
            await refreshSourceWallpaper();
            return;
        }

        if (type === 'custom') {
            if (url) {
                originalWallpaperUrl.value = url;
                try {
                    wallpaperUrl.value = await loadImage(url);
                } catch (error) {
                    console.error('Failed to load and cache image:', error);
                    wallpaperUrl.value = url;
                }
            }
            await saveState();
            return;
        }

        wallpaperUrl.value = '';
        originalWallpaperUrl.value = '';
        await saveState();
    };

    const updateSourceUrl = async (url: string) => {
        sourceUrl.value = url || DEFAULT_SOURCE_URL;
        wallpaperSourceId.value = 'custom';

        if (wallpaperType.value === 'source') {
            await refreshSourceWallpaper();
        } else {
            await saveState();
        }
    };

    const getWallpaperStyle = () => {
        if (wallpaperType.value === 'none') {
            return {};
        }
        if (wallpaperType.value === 'source' || (wallpaperType.value === 'custom' && wallpaperUrl.value)) {
            return {
                backgroundImage: `url("${wallpaperUrl.value}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }
        if (wallpaperType.value === 'color') {
            return {
                backgroundColor: backgroundColor.value,
                backgroundImage: 'none'
            };
        }
        return {};
    };

    const clearWallpaperCache = async (url: string) => {
        if (url) {
            await clearImageCache(url);
        }
    };
    
    const updateBackgroundColor = async (color: string) => {
        backgroundColor.value = color;
        await saveState();
    };
    
    const updateThemeColor = async (color: string) => {
        themeColor.value = color;
        await saveState();
    };

    const toggleMask = async (show: boolean) => {
        showMask.value = show;
        await saveState();
    };

    const updateShowSeconds = async (show: boolean) => {
        showSeconds.value = show;
        await saveState();
    };

    const updateShowDate = async (show: boolean) => {
        showDate.value = show;
        await saveState();
    };

    const updateShowTime = async (show: boolean) => {
        showTime.value = show;
        await saveState();
    };

    const updateUse24Hour = async (use24: boolean) => {
        use24Hour.value = use24;
        await saveState();
    };

    const updateClockFont = async (font: string) => {
        clockFont.value = font;
        await saveState();
    };

    const updateClockFontSize = async (size: number) => {
        clockFontSize.value = size;
        await saveState();
    };

    const updateClockFontWeight = async (weight: number) => {
        clockFontWeight.value = weight;
        await saveState();
    };

    const updateUseCustomColor = async (use: boolean) => {
        useCustomColor.value = use;
        await saveState();
    };

    onMounted(() => {
        loadState();
    });

    return {
        wallpaperType,
        wallpaperUrl,
        originalWallpaperUrl,
        sourceUrl,
        wallpaperSourceId,
        wallhavenQuery,
        wallhavenApiKey,
        wallhavenNsfw,
        backgroundColor,
        themeColor,
        showMask,
        showTime,
        showSeconds,
        showDate,
        use24Hour,
        clockFont,
        clockFontSize,
        clockFontWeight,
        useCustomColor,
        canRestorePreviousWallpaper,
        isRestoringWallpaper,
        loadState,
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
        updateThemeColor,
        updateShowTime,
        updateShowSeconds,
        updateShowDate,
        updateUse24Hour,
        updateClockFont,
        updateClockFontSize,
        updateClockFontWeight,
        updateUseCustomColor,
        getWallpaperStyle,
        toggleMask,
        clearWallpaperCache
    };
}
