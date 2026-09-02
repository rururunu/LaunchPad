<template>
  <div class="se-root">
    <div class="engine-list ui-scroll">
      <div class="settings-section-head se-head">
        <div class="se-head-row">
          <div>
            <h3 class="settings-section-title">已添加的引擎</h3>
            <p class="settings-section-desc">添加 / 修改后自动保存并立即生效</p>
          </div>
          <span
            class="save-hint"
            :class="{ 'save-hint--ok': saveState === 'saved', 'save-hint--err': saveState === 'error' }"
          >
            {{ saveHintText }}
          </span>
        </div>
      </div>

      <TransitionGroup name="engine-card" tag="div" class="engine-list-inner">
        <div
          v-for="(engine, index) in jumpData"
          :key="engine._id"
          class="engine-card"
          :class="{ 'engine-card--editing': editingId === engine._id }"
        >
          <!-- 摘要行 -->
          <div class="card-top">
            <FaviconImg :url="engine.iconUrl || engine.jumpUrl || ''" :size="20" />
            <button
              type="button"
              class="card-summary"
              :title="editingId === engine._id ? '收起' : '编辑'"
              @click="toggleEdit(engine._id)"
            >
              <span class="summary-name">{{ engine.label || '未命名引擎' }}</span>
              <span class="summary-meta">
                <span v-if="engine.key?.[0]" class="key-chip">{{ engine.key[0] }}</span>
                <span v-if="engine.key?.[1]" class="key-chip key-chip--muted">{{ engine.key[1] }}</span>
                <span v-if="engine.injectPrompt" class="inject-tag">填词</span>
              </span>
            </button>
            <button
              type="button"
              class="icon-btn icon-btn--edit"
              :title="editingId === engine._id ? '收起' : '编辑'"
              @click="toggleEdit(engine._id)"
            >
              <Icon
                :icon="editingId === engine._id ? 'fluent:chevron-up-24-regular' : 'fluent:edit-24-regular'"
                class="text-sm"
              />
            </button>
            <button type="button" class="icon-btn" title="删除" @click="removeEngine(index)">
              <Icon icon="fluent:dismiss-24-filled" class="text-sm" />
            </button>
          </div>

          <!-- 编辑表单：点击编辑才展开 -->
          <div v-if="editingId === engine._id" class="card-editor">
            <div class="form-grid">
              <label class="form-row">
                <span class="form-label">名称</span>
                <input
                  v-model="engine.label"
                  class="form-input"
                  placeholder="引擎名称"
                  @change="scheduleSave"
                  @blur="scheduleSave"
                />
              </label>

              <label class="form-row">
                <span class="form-label">链接</span>
                <input
                  v-model="engine.jumpUrl"
                  class="form-input form-input--mono"
                  placeholder="https://example.com/search?q=&<query>"
                  @change="scheduleSave"
                  @blur="scheduleSave"
                />
              </label>

              <div class="form-row form-row--keys">
                <span class="form-label">指令</span>
                <div class="key-pair">
                  <input
                    v-model="engine.key[0]"
                    class="form-input key-field"
                    placeholder="主指令"
                    spellcheck="false"
                    @change="scheduleSave"
                    @blur="scheduleSave"
                  />
                  <input
                    v-model="engine.key[1]"
                    class="form-input key-field"
                    placeholder="别名"
                    spellcheck="false"
                    @change="scheduleSave"
                    @blur="scheduleSave"
                  />
                </div>
              </div>
            </div>

            <div class="switch-row">
              <div class="switch-copy">
                <span class="switch-title">对话页自动填词</span>
                <span class="switch-desc">把查询词写入目标页输入框</span>
              </div>
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="!!engine.injectPrompt"
                :class="{ 'switch--on': engine.injectPrompt }"
                :title="engine.injectPrompt ? '已开启' : '已关闭'"
                @click="toggleInject(engine, !engine.injectPrompt)"
              >
                <span class="switch-thumb" />
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <div v-if="jumpData.length === 0" class="empty-state">
        <Icon icon="fluent:search-off-24-regular" class="text-3xl text-gray-300 dark:text-zinc-600" />
        <p class="text-sm text-gray-400 dark:text-zinc-500 mt-2">暂无搜索引擎，可从下方预设添加</p>
      </div>

      <div class="preset-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">预设引擎</h3>
          <p class="settings-section-desc">点击即可添加，自动保存</p>
        </div>

        <div v-for="group in presetGroups" :key="group.id" class="preset-group">
          <div class="preset-group-title">{{ group.label }}</div>
          <div class="preset-grid">
            <button
              v-for="engine in group.engines"
              :key="engine.key[0]"
              type="button"
              class="preset-chip"
              :class="{ 'preset-chip--added': isAdded(engine) }"
              :disabled="isAdded(engine)"
              :title="isAdded(engine) ? '已添加' : `添加 ${engine.label}`"
              @click="addPreset(engine)"
            >
              <FaviconImg :url="engine.iconUrl || engine.jumpUrl" :size="16" />
              <span>{{ engine.label }}</span>
              <Icon
                v-if="isAdded(engine)"
                icon="fluent:checkmark-12-filled"
                class="text-xs opacity-70"
              />
              <Icon v-else icon="fluent:add-12-filled" class="text-xs opacity-60" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <div class="action-left">
        <button type="button" class="btn-add" @click="addNewEngine">
          <Icon icon="fluent:add-24-filled" class="text-sm" />
          自定义
        </button>
        <button type="button" class="btn-add" title="恢复默认引擎列表" @click="restoreDefaults">
          <Icon icon="fluent:arrow-reset-24-regular" class="text-sm" />
          恢复默认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Icon } from '@iconify/vue';
import { useNotification } from '@/composables/useNotification';
import { storage } from '@/utils/storage';
import FaviconImg from '@/components/ui/FaviconImg.vue';
import { preloadFavicons } from '@/utils/iconCache';
import {
  DEFAULT_SEARCH_ENGINES,
  PRESET_SEARCH_ENGINES,
  ENGINE_GROUP_LABELS,
  cloneEngine,
  getEngineHost,
  type SearchEngine,
} from '@/utils/searchEngines';
import { migrateJumpDataEngines } from '@/utils/jumpDataMigration';

const { success, error } = useNotification();

const LEGACY_INJECT_HOSTS = new Set([
  'kimi.com',
  'kimi.moonshot.cn',
  'chat.deepseek.com',
  'deepseek.com',
  'chatgpt.com',
  'chat.openai.com',
  'gemini.google.com',
  'claude.ai',
  'doubao.com',
  'www.doubao.com',
  'tongyi.com',
  'www.tongyi.com',
]);

const resolveInjectPrompt = (e: any): boolean => {
  if (e.injectPrompt === true) return true;
  if (e.injectPrompt === false) return false;
  const host = getEngineHost(e.jumpUrl || '');
  return LEGACY_INJECT_HOSTS.has(host);
};

interface JumpData extends SearchEngine {
  _id: number;
}

const jumpData = ref<JumpData[]>([]);
const editingId = ref<number | null>(null);
let nextId = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let ready = false;

const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');

const toggleEdit = (id: number) => {
  editingId.value = editingId.value === id ? null : id;
};

const saveHintText = computed(() => {
  if (saveState.value === 'saving') return '保存中…';
  if (saveState.value === 'saved') return '已自动保存';
  if (saveState.value === 'error') return '保存失败';
  return '';
});

const presetGroups = computed(() => {
  const order: Array<NonNullable<SearchEngine['group']>> = ['general', 'cn', 'ai', 'dev', 'media'];
  return order.map((id) => ({
    id,
    label: ENGINE_GROUP_LABELS[id],
    engines: PRESET_SEARCH_ENGINES.filter((e) => e.group === id),
  }));
});

const isAdded = (engine: SearchEngine) => {
  const primary = engine.key[0];
  return jumpData.value.some(
    (e) =>
      e.key?.[0] === primary ||
      (e.jumpUrl && engine.jumpUrl && e.jumpUrl === engine.jumpUrl)
  );
};

const loadEngines = async () => {
  try {
    const saved = await storage.get('jumpData');
    let data: any[];
    if (Array.isArray(saved)) {
      data = saved;
    } else if (typeof saved === 'string') {
      data = JSON.parse(saved);
    } else {
      data = DEFAULT_SEARCH_ENGINES.map(cloneEngine);
    }
    jumpData.value = data.map((e: any) => ({
      key: Array.isArray(e.key) ? e.key : ['', ''],
      label: e.label || '',
      jumpUrl: e.jumpUrl || '',
      iconUrl: e.iconUrl || undefined,
      injectPrompt: resolveInjectPrompt(e),
      _id: nextId++,
    }));

    const { engines, changed } = migrateJumpDataEngines(jumpData.value);
    jumpData.value = engines;
    if (changed) {
      await persistEngines(false);
    }
  } catch {
    jumpData.value = DEFAULT_SEARCH_ENGINES.map((e) => ({
      ...cloneEngine(e),
      _id: nextId++,
    }));
  }

  preloadFavicons(
    jumpData.value.map((e) => e.iconUrl || e.jumpUrl).filter(Boolean) as string[]
  );
  ready = true;
};

const persistEngines = async (showToast = false) => {
  if (!ready) return;
  saveState.value = 'saving';
  try {
    const normalized = jumpData.value.map(({ _id, group, ...rest }) => ({
      key: [rest.key?.[0] || '', rest.key?.[1] || ''],
      label: rest.label,
      jumpUrl: rest.jumpUrl,
      ...(rest.iconUrl ? { iconUrl: rest.iconUrl } : {}),
      ...(rest.injectPrompt ? { injectPrompt: true } : {}),
    }));
    await storage.set('jumpData', JSON.stringify(normalized));
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ action: 'UPDATE_JUMP_DATA', data: normalized });
      } catch {
        // ignore
      }
    }
    saveState.value = 'saved';
    if (showToast) success('已更新', '搜索引擎已同步');
  } catch (e) {
    saveState.value = 'error';
    error('保存失败', e?.toString());
  }
};

const scheduleSave = () => {
  if (!ready) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistEngines(false);
  }, 350);
};

const addNewEngine = async () => {
  const id = nextId++;
  jumpData.value.push({
    _id: id,
    key: ['', ''],
    label: '',
    jumpUrl: '',
    injectPrompt: false,
  });
  editingId.value = id;
  await persistEngines(false);
};

const addPreset = async (engine: SearchEngine) => {
  if (isAdded(engine)) return;
  jumpData.value.push({
    ...cloneEngine(engine),
    key: [engine.key[0] || '', engine.key[1] || ''],
    injectPrompt: !!engine.injectPrompt,
    _id: nextId++,
  });
  preloadFavicons([engine.iconUrl || engine.jumpUrl].filter(Boolean) as string[]);
  await persistEngines(false);
};

const toggleInject = async (engine: JumpData, enabled: boolean) => {
  engine.injectPrompt = enabled;
  await persistEngines(false);
};

const removeEngine = async (index: number) => {
  const removed = jumpData.value[index];
  if (removed && editingId.value === removed._id) editingId.value = null;
  jumpData.value.splice(index, 1);
  await persistEngines(false);
};

const restoreDefaults = async () => {
  editingId.value = null;
  jumpData.value = DEFAULT_SEARCH_ENGINES.map((e) => ({
    ...cloneEngine(e),
    key: [e.key[0] || '', e.key[1] || ''],
    _id: nextId++,
  }));
  await persistEngines(true);
};

onMounted(loadEngines);

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
});
</script>

<style scoped>
.se-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.engine-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 16px 8px;
}

.se-head {
  margin-bottom: 12px;
}

.se-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.save-hint {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--ui-text-muted);
  padding-top: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.save-hint--ok,
.save-hint--err {
  opacity: 1;
}

.save-hint--ok {
  color: #16a34a;
}

.save-hint--err {
  color: #ef4444;
}

.engine-list-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.engine-card {
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.engine-card--editing {
  border-color: var(--ui-border-strong);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.summary-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 18px;
}

.key-chip {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--ui-text-secondary);
  background: var(--ui-surface-soft);
}

.key-chip--muted {
  opacity: 0.75;
}

.inject-tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 550;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}

.card-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--ui-border);
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.icon-btn--edit:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.icon-btn:not(.icon-btn--edit):hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  gap: 8px;
}

.form-row--keys {
  align-items: stretch;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-text-muted);
  line-height: 1;
}

.form-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--ui-text-secondary);
  background: var(--ui-surface-soft);
  border: 1px solid transparent;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.form-input:hover {
  border-color: var(--ui-border-strong);
}

.form-input:focus {
  border-color: var(--ui-accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
}

.form-input::placeholder {
  color: var(--ui-text-muted);
}

.key-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.key-field {
  text-align: left;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--ui-border);
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.switch-title {
  font-size: 12px;
  font-weight: 550;
  color: var(--ui-text);
}

.switch-desc {
  font-size: 11px;
  color: var(--ui-text-muted);
}

.switch {
  position: relative;
  width: 40px;
  height: 24px;
  border-radius: 999px;
  border: none;
  padding: 0;
  background: rgba(0, 0, 0, 0.12);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.switch--on {
  background: var(--ui-accent);
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.switch--on .switch-thumb {
  transform: translateX(16px);
}

.empty-state {
  text-align: center;
  padding: 28px 12px 12px;
}

.preset-section {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--ui-border);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preset-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--ui-text-muted);
  letter-spacing: 0.04em;
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ui-border-strong);
  background: var(--ui-surface);
  color: var(--ui-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

.preset-chip:hover:not(:disabled) {
  border-color: var(--ui-accent);
  background: var(--ui-accent-soft);
}

.preset-chip--added,
.preset-chip:disabled {
  opacity: 0.55;
  cursor: default;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--ui-border);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.5);
}

.action-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-add {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, transform 0.1s;
  background: var(--ui-surface-soft);
  color: var(--ui-text-secondary);
  border: 1px solid var(--ui-border-strong);
}

.btn-add:hover {
  background: rgba(0, 0, 0, 0.06);
}

.btn-add:active {
  transform: scale(0.97);
}

.engine-card-enter-active,
.engine-card-leave-active {
  transition: all 0.25s ease;
}

.engine-card-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.engine-card-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

@media (prefers-color-scheme: dark) {
  .form-input:focus {
    background: rgba(255, 255, 255, 0.06);
  }

  .switch {
    background: rgba(255, 255, 255, 0.16);
  }

  .switch--on {
    background: var(--ui-accent);
  }

  .action-bar {
    background: rgba(255, 255, 255, 0.03);
  }

  .btn-add:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
