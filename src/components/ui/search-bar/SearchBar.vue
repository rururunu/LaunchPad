<template>
  <div class="search-bar-root">
    <div
      class="search-bar-inner"
      ref="searchBarInnerRef"
      :style="{ '--gs-dropdown-max-h': dropdownMaxH + 'px' }"
      :class="{ 'search-bar-inner--drop-above': dropdownPlacement === 'above' }"
    >
      <!-- 搜索框（引擎图标内嵌在 pill 左侧） -->
      <VanishingInput
        v-model="ide"
        :placeholders="placeholderArray"
        @submit="submit"
        @escape="handleEscapeKey"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
        ref="vanishingInputRef"
      >
        <template #left-icon>
          <button type="button" class="engine-icon-btn" :title="displayEngine?.label || '选择搜索引擎'" @click.stop="showEnginePicker = !showEnginePicker">
            <FaviconImg :url="displayEngine?.iconUrl || displayEngine?.jumpUrl || ''" :size="20" />
          </button>
        </template>
      </VanishingInput>

      <!-- 悬浮下拉区域（不占据布局空间） -->
      <div class="dropdowns">

        <!-- 引擎选择器（图标按钮触发） -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-[-6px]"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-[-6px]"
        >
          <div
            v-if="showEnginePicker"
            class="dropdown-panel"
            @click.stop
          >
            <div class="dropdown-header dropdown-header--row">
              <span>选择搜索引擎</span>
              <span class="dropdown-hints"><kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 确认</span>
            </div>
            <div class="dropdown-body dropdown-body--scroll ui-scroll" ref="engineListRef">
              <div
                v-for="(engine, index) in jumpData"
                :key="engine.key[0]"
                class="dropdown-item"
                :class="{
                  'dropdown-item--active': engine.key.includes(defaultKey),
                  'dropdown-item--selected': index === selectedEngineIndex,
                }"
                @click="confirmEngine(engine)"
                @mouseenter="selectedEngineIndex = index"
              >
                <div class="engine-item-left">
                  <FaviconImg :url="engine.iconUrl || engine.jumpUrl" :size="16" />
                  <span class="dropdown-item-label">{{ engine.label }}</span>
                </div>
                <kbd v-if="index === selectedEngineIndex" class="keyboard-key">Enter</kbd>
                <Icon
                  v-else-if="engine.key.includes(defaultKey)"
                  icon="material-symbols:check-rounded"
                  class="text-blue-500 text-base flex-shrink-0"
                />
              </div>
            </div>
          </div>
        </Transition>

        <!-- 搜索建议 -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-[-6px]"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-[-6px]"
        >
          <SearchSuggestions
            v-if="showSearchSuggestions"
            :query="currentSearchQuery"
            :engine-type="currentEngineType"
            :visible="showSearchSuggestions"
            @select="handleSuggestionSelect"
            @fill="handleSuggestionFill"
            @close="showSearchSuggestions = false"
          />
        </Transition>

        <!-- 搜索引擎选择器（cd 命令） -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-[-6px]"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-[-6px]"
        >
          <div
            v-if="showEngineSelector"
            class="dropdown-panel"
          >
            <div class="dropdown-header dropdown-header--row">
              <span>切换搜索引擎</span>
              <span class="dropdown-hints"><kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 确认 · <kbd>Esc</kbd> 关闭</span>
            </div>
            <div class="dropdown-body dropdown-body--scroll ui-scroll" ref="engineListRef">
              <div
                v-for="(engine, index) in filteredEngines"
                :key="engine.key[0]"
                class="dropdown-item"
                :class="{
                  'dropdown-item--active': engine.key.includes(defaultKey),
                  'dropdown-item--selected': index === selectedEngineIndex,
                }"
                @click="confirmEngine(engine)"
                @mouseenter="selectedEngineIndex = index"
              >
                <div class="engine-item-left">
                  <FaviconImg :url="engine.iconUrl || engine.jumpUrl" :size="16" />
                  <span class="dropdown-item-label">{{ engine.label }}</span>
                </div>
                <kbd v-if="index === selectedEngineIndex" class="keyboard-key">Enter</kbd>
                <span v-else class="dropdown-item-key">{{ engine.key.join(' / ') }}</span>
              </div>
              <div v-if="filteredEngines.length === 0" class="dropdown-empty">无匹配引擎</div>
            </div>
          </div>
        </Transition>

        <!-- 收藏夹搜索结果（* 前缀） -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-[-6px]"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-[-6px]"
        >
          <div v-if="showBookmarkResults" class="dropdown-panel bookmark-results">
            <div class="dropdown-header">收藏夹结果</div>
            <div class="dropdown-body dropdown-body--scroll ui-scroll">
              <div
                v-for="(bookmark, index) in bookmarkResults.slice(0, 5)"
                :key="index"
                @click="openBookmark(bookmark.url)"
                class="dropdown-item"
                :class="{ 'dropdown-item--active': index === selectedBookmarkIndex }"
              >
                <FaviconImg :url="bookmark.url ?? ''" :size="16" />
                <div class="bookmark-info">
                  <div class="bookmark-title">{{ bookmark.title }}</div>
                  <div class="bookmark-url">{{ bookmark.url }}</div>
                </div>
                <kbd v-if="index === selectedBookmarkIndex" class="keyboard-key">Enter</kbd>
              </div>
              <div v-if="bookmarkResults.length === 0" class="dropdown-empty">未找到匹配的收藏夹</div>
              <div v-if="bookmarkResults.length > 5" class="dropdown-more">
                另有 {{ bookmarkResults.length - 5 }} 条结果
              </div>
            </div>
          </div>
        </Transition>

        <!-- 标签页搜索结果（/ 命令） -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-[-6px]"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-[-6px]"
        >
          <div v-if="showTabResults" class="dropdown-panel tab-results">
            <div class="dropdown-header">标签页</div>
            <div class="dropdown-body dropdown-body--scroll ui-scroll">
              <div
                v-for="(tab, index) in tabResults.slice(0, 8)"
                :key="tab.id ?? index"
                @click="activateTab(tab.id)"
                class="dropdown-item"
                :class="{ 'dropdown-item--active': index === selectedTabIndex }"
              >
                <span class="tab-index-badge">t{{ tab.index }}</span>
                <FaviconImg :url="tab.url" :size="16" />
                <div class="bookmark-info">
                  <div class="bookmark-title">{{ tab.title }}</div>
                  <div class="bookmark-url">{{ tab.url }}</div>
                </div>
                <kbd v-if="index === selectedTabIndex" class="keyboard-key">Enter</kbd>
              </div>
              <div v-if="tabResults.length === 0" class="dropdown-empty">未找到匹配的标签页</div>
              <div v-if="tabResults.length > 8" class="dropdown-more">
                另有 {{ tabResults.length - 8 }} 个标签页
              </div>
            </div>
          </div>
        </Transition>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

defineEmits<{ focus: []; blur: [] }>()
import { Icon } from '@iconify/vue'
import VanishingInput from '@/components/ui/vanishing-input/VanishingInput.vue'
import SearchSuggestions from '@/components/ui/search-suggestions/SearchSuggestions.vue'
import FaviconImg from '@/components/ui/FaviconImg.vue'
import { storage } from '@/utils/storage'
import { preloadFavicons } from '@/utils/iconCache'
import { DEFAULT_SEARCH_ENGINES, cloneEngine, buildSearchUrl } from '@/utils/searchEngines'
import { migrateJumpDataEngines, serializeJumpEngines } from '@/utils/jumpDataMigration'
import {
  hasDefaultEngineFilterPrefix,
  stripDefaultEngineFilterPrefix,
  parseSlashCommand,
  isSlashCommand,
  type SlashCommand,
} from '@/utils/searchCommands'

type TabResult = { id?: number; index: number; title: string; url: string; active?: boolean }

type JumpData = { key: string[]; label: string; jumpUrl: string; iconUrl?: string; injectPrompt?: boolean }

const placeholderArray = [
  'Hello!!🖐️',
  '尝试输入 bd / gg / bi 加上搜索内容吧😎',
  '输入 cd 展开引擎列表，↑↓ 选择，Enter 切换默认引擎😋',
  '输入 * 后跟关键词可快速搜索收藏夹🌟',
]

const defaultJumpData: JumpData[] = DEFAULT_SEARCH_ENGINES.map(cloneEngine)

const ide = ref('')
const jumpData = ref<JumpData[]>([])
const defaultKey = ref('bd')
const jumpToData = ref<Map<string, JumpData>>(new Map())
const vanishingInputRef = ref(null)
const searchBarInnerRef = ref<HTMLElement | null>(null)
const engineListRef = ref<HTMLElement | null>(null)
const dropdownMaxH = ref(320)
const dropdownPlacement = ref<'below' | 'above'>('below')
let unsubJumpData: (() => void) | undefined

const showEnginePicker = ref(false)
const showEngineSelector = ref(false)
const showSearchSuggestions = ref(false)
const showBookmarkResults = ref(false)
const showTabResults = ref(false)
const bookmarkResults = ref<any[]>([])
const tabResults = ref<TabResult[]>([])
const selectedBookmarkIndex = ref(-1)
const selectedTabIndex = ref(-1)
const selectedEngineIndex = ref(0)
const currentEngineType = ref('bd')
const currentSearchQuery = ref('')
const suggestionsFullyClosed = ref(true)
const isKeyboardFill = ref(false)
const isSearchFocused = ref(false)

const isCdCommand = (value: string) => {
  const v = value.trim()
  return v === 'cd' || v.startsWith('cd ')
}

const engineListFilter = computed(() => {
  if (!showEngineSelector.value) return ''
  const parts = ide.value.trim().split(/\s+/)
  if (parts[0] !== 'cd') return ''
  return (parts[1] || '').toLowerCase()
})

const filteredEngines = computed(() => {
  const q = engineListFilter.value
  if (!q) return jumpData.value
  return jumpData.value.filter(
    (e) =>
      e.key.some((k) => k.toLowerCase().startsWith(q) || k.toLowerCase().includes(q)) ||
      e.label.toLowerCase().includes(q)
  )
})

const activeEngineList = computed(() =>
  showEngineSelector.value ? filteredEngines.value : jumpData.value
)

const initEngineSelection = () => {
  const list = activeEngineList.value
  const idx = list.findIndex((e) => e.key.includes(defaultKey.value))
  selectedEngineIndex.value = idx >= 0 ? idx : 0
}

const scrollSelectedEngineIntoView = () => {
  nextTick(() => {
    const root = engineListRef.value
    const el = root?.querySelector('.dropdown-item--selected') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

watch(isSearchFocused, (v) => {
  if (v && ide.value) showSearchSuggestions.value = true
  else if (!v) showSearchSuggestions.value = false
})

watch(showSearchSuggestions, (v) => {
  if (!v) setTimeout(() => { suggestionsFullyClosed.value = true }, 50)
  else suggestionsFullyClosed.value = false
})

watch(ide, (newValue) => {
  if (isKeyboardFill.value) { isKeyboardFill.value = false; return }
  const value = newValue?.trim()

  if (isCdCommand(value || '')) {
    const wasOpen = showEngineSelector.value
    showEngineSelector.value = true
    showSearchSuggestions.value = false
    showEnginePicker.value = false
    showTabResults.value = false
    if (!wasOpen) initEngineSelection()
  } else {
    showEngineSelector.value = false
    const slashCmd = parseSlashCommand(value || '')
    if (slashCmd) {
      showSearchSuggestions.value = false
      showBookmarkResults.value = false
      if (slashCmd.type === 'tab-search') {
        void searchTabs(slashCmd.query)
        showTabResults.value = true
        selectedTabIndex.value = -1
      } else {
        showTabResults.value = false
      }
    } else if (value.startsWith('*')) {
      const q = value.slice(1).trim()
      if (q) { searchBookmarks(q); showBookmarkResults.value = true }
      else { showBookmarkResults.value = false }
      showTabResults.value = false
    } else if (value) {
      showBookmarkResults.value = false
      showTabResults.value = false
      const parts = value.split(' ')
      const engineKey = parts[0]
      let matchedEngine = false
      for (const [_, engine] of jumpToData.value) {
        if (engine.key.includes(engineKey)) { currentEngineType.value = engineKey; matchedEngine = true; break }
      }
      if (matchedEngine && parts.length > 1) {
        currentSearchQuery.value = parts.slice(1).join(' ')
        showSearchSuggestions.value = true
      } else if (!matchedEngine) {
        currentEngineType.value = defaultKey.value
        currentSearchQuery.value = hasDefaultEngineFilterPrefix(value)
          ? stripDefaultEngineFilterPrefix(value)
          : value
        showSearchSuggestions.value = true
      } else {
        currentSearchQuery.value = ''
      }
    }
  }

  if (!value) {
    showSearchSuggestions.value = false
    showEngineSelector.value = false
    showBookmarkResults.value = false
    showTabResults.value = false
    currentSearchQuery.value = ''
  }
})

watch(filteredEngines, (list) => {
  if (!showEngineSelector.value) return
  if (list.length === 0) {
    selectedEngineIndex.value = 0
    return
  }
  if (selectedEngineIndex.value >= list.length) {
    selectedEngineIndex.value = list.length - 1
  }
})

watch(showEnginePicker, (open) => {
  if (open) {
    showEngineSelector.value = false
    initEngineSelection()
    nextTick(() => window.addEventListener('click', onPickerOutsideClick))
  } else {
    window.removeEventListener('click', onPickerOutsideClick)
  }
})

const applyJumpData = (parsed: JumpData[] | null | undefined): boolean => {
  const source = (parsed && Array.isArray(parsed) && parsed.length)
    ? parsed
    : [...defaultJumpData]

  const { engines, changed } = migrateJumpDataEngines(source)
  jumpData.value = engines

  jumpToData.value = new Map()
  jumpData.value.forEach((d) => {
    d.key?.forEach((k) => {
      if (k) jumpToData.value.set(k, d)
    })
  })

  if (!jumpToData.value.has(defaultKey.value) && jumpData.value.length > 0) {
    const first = jumpData.value[0]?.key?.[0]
    if (first) defaultKey.value = first
  }

  preloadFavicons(jumpData.value.map((e) => e.iconUrl || e.jumpUrl).filter(Boolean))
  return changed
}

const parseJumpData = (raw: unknown): JumpData[] | null => {
  let parsed: any = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { return null }
  }
  return Array.isArray(parsed) ? parsed : null
}

const loadEngines = async () => {
  try {
    const saved = await storage.get('jumpData')
    const migrated = applyJumpData(parseJumpData(saved))
    if (migrated && saved) {
      await storage.set('jumpData', serializeJumpEngines(jumpData.value))
    }
  } catch {
    applyJumpData(null)
  }
}

const init = async () => {
  try {
    const savedKey = await storage.get('defaultKey')
    defaultKey.value = (savedKey || 'bd') as string
    await loadEngines()

    if (!jumpToData.value.has(defaultKey.value) && jumpData.value.length > 0 && jumpData.value[0].key.length > 0) {
      defaultKey.value = jumpData.value[0].key[0]
      await storage.set('defaultKey', defaultKey.value)
    }
  } catch (e) {
    console.error('SearchBar init error:', e)
  }
}

function segmentationContent(medium: string, content: string): string[] {
  const [first, ...rest] = content.split(medium)
  return [first, rest.join(' ')]
}

async function jumpTo(jumpType: string, toData: string) {
  if (!jumpType) jumpType = defaultKey.value
  if (jumpType === 'cd') {
    if (jumpToData.value.has(toData)) {
      defaultKey.value = toData
      await storage.set('defaultKey', toData)
    }
    return
  }
  const engine = jumpToData.value.get(jumpType)
  let url = ''
  if (engine) {
    url = buildSearchUrl(engine.jumpUrl, toData)
  } else {
    const def = jumpToData.value.get(defaultKey.value) || jumpData.value[0]
    if (def) {
      url = buildSearchUrl(def.jumpUrl, jumpType + (toData ? ' ' + toData : ''))
    }
  }
  if (!url || !openOnce(url)) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

let lastOpenUrl = ''
let lastOpenAt = 0

function openOnce(url: string): boolean {
  const now = Date.now()
  if (url === lastOpenUrl && now - lastOpenAt < 600) return false
  lastOpenUrl = url
  lastOpenAt = now
  return true
}

function submit(content: string) {
  if (content.startsWith('*')) return
  const slashCmd = parseSlashCommand(content)
  if (slashCmd) {
    void executeSlashCommand(slashCmd)
    return
  }
  if (hasDefaultEngineFilterPrefix(content)) {
    jumpTo(defaultKey.value, stripDefaultEngineFilterPrefix(content))
    return
  }
  if (content.includes(' ')) { const [a, b] = segmentationContent(' ', content); jumpTo(a, b) }
  else jumpTo(defaultKey.value, content)
  showSearchSuggestions.value = false
  currentSearchQuery.value = ''
}

function handleSuggestionSelect(suggestion: string) {
  if (currentEngineType.value === defaultKey.value) ide.value = suggestion
  else ide.value = `${currentEngineType.value} ${suggestion}`
  submit(ide.value)
}

function handleSuggestionFill(data: { suggestion: string; isFillAction: boolean; isKeyboardFill?: boolean }) {
  if (currentEngineType.value === defaultKey.value) ide.value = data.suggestion
  else ide.value = `${currentEngineType.value} ${data.suggestion}`
  if (data.isKeyboardFill) isKeyboardFill.value = true
  setTimeout(() => (vanishingInputRef.value as any)?.focus?.(), 10)
}

function handleEscapeKey() {
  showSearchSuggestions.value = false
  showEngineSelector.value = false
  showBookmarkResults.value = false
  showTabResults.value = false
}

const currentEngine = computed(() =>
  jumpToData.value.get(defaultKey.value) ?? jumpData.value[0]
)

/** 根据输入前缀显示对应引擎图标（如输入 ds 显示 DeepSeek） */
const displayEngine = computed(() => {
  const raw = ide.value.trim()
  if (!raw || raw.startsWith('*') || isCdCommand(raw) || hasDefaultEngineFilterPrefix(raw) || isSlashCommand(raw)) {
    return currentEngine.value
  }
  const token = raw.split(/\s+/)[0]
  if (!token) return currentEngine.value
  const lower = token.toLowerCase()
  if (jumpToData.value.has(token)) return jumpToData.value.get(token) ?? currentEngine.value
  if (jumpToData.value.has(lower)) return jumpToData.value.get(lower) ?? currentEngine.value
  for (const eng of jumpData.value) {
    if (eng.key?.some((k) => k && k.toLowerCase() === lower)) return eng
  }
  return currentEngine.value
})

async function confirmEngine(engine: JumpData) {
  if (!engine?.key?.[0]) return
  defaultKey.value = engine.key[0]
  await storage.set('defaultKey', engine.key[0])
  showEnginePicker.value = false
  showEngineSelector.value = false
  if (isCdCommand(ide.value)) ide.value = ''
}

function onPickerOutsideClick() {
  showEnginePicker.value = false
}

function updateDropdownMaxH() {
  const el = searchBarInnerRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const gap = 8
  const edge = 12
  const spaceBelow = Math.floor(window.innerHeight - rect.bottom - gap - edge)
  const spaceAbove = Math.floor(rect.top - gap - edge)

  // 下方空间不够时改为向上展开，尽量把可用高度用满
  if (spaceBelow < 200 && spaceAbove > spaceBelow) {
    dropdownPlacement.value = 'above'
    dropdownMaxH.value = Math.max(96, spaceAbove)
  } else {
    dropdownPlacement.value = 'below'
    dropdownMaxH.value = Math.max(96, spaceBelow)
  }
}

watch(
  [showEnginePicker, showEngineSelector, showBookmarkResults, showTabResults, showSearchSuggestions],
  ([a, b, c, d, e]) => {
    if (a || b || c || d || e) {
      nextTick(() => {
        updateDropdownMaxH()
        requestAnimationFrame(updateDropdownMaxH)
      })
    }
  }
)

async function searchTabs(query: string) {
  try {
    const w = window as any
    if (w.chrome?.tabs) {
      const tabs = await w.chrome.tabs.query({ currentWindow: true })
      const lower = query.toLowerCase()
      tabResults.value = tabs
        .map((t: any, i: number) => ({
          id: t.id,
          index: i + 1,
          title: t.title || '(无标题)',
          url: t.url || '',
          active: !!t.active,
        }))
        .filter(
          (t: TabResult) =>
            !query ||
            t.title.toLowerCase().includes(lower) ||
            t.url.toLowerCase().includes(lower)
        )
    } else {
      tabResults.value = []
    }
  } catch {
    tabResults.value = []
  }
}

async function activateTab(tabId?: number) {
  const w = window as any
  if (!tabId || !w.chrome?.tabs) return
  try {
    const tab = await w.chrome.tabs.get(tabId)
    await w.chrome.tabs.update(tabId, { active: true })
    if (tab.windowId) await w.chrome.windows.update(tab.windowId, { focused: true })
    showTabResults.value = false
    ide.value = ''
  } catch (e) {
    console.error('activateTab error:', e)
  }
}

async function activateTabByIndex(index: number) {
  const w = window as any
  if (!w.chrome?.tabs) return
  const tabs = await w.chrome.tabs.query({ currentWindow: true })
  const tab = tabs[index - 1]
  if (tab?.id) await activateTab(tab.id)
}

async function createNewTab() {
  const w = window as any
  if (!w.chrome?.tabs) return
  await w.chrome.tabs.create({})
  ide.value = ''
}

async function executeSlashCommand(cmd: SlashCommand) {
  if (cmd.type === 'new') {
    await createNewTab()
    return
  }
  if (cmd.type === 'tab-index') {
    await activateTabByIndex(cmd.index)
    return
  }
  if (cmd.type === 'tab-search') {
    if (selectedTabIndex.value >= 0 && tabResults.value[selectedTabIndex.value]?.id) {
      await activateTab(tabResults.value[selectedTabIndex.value].id)
    }
  }
}

async function searchBookmarks(query: string) {
  try {
    const w = window as any
    if (w.chrome?.bookmarks) {
      const results = await w.chrome.bookmarks.search(query)
      bookmarkResults.value = results.filter((b: any) => b.url)
    }
  } catch { bookmarkResults.value = [] }
}

function openBookmark(url: string | undefined) {
  if (url) { window.open(url, '_blank', 'noopener,noreferrer'); showBookmarkResults.value = false }
}

const handleKeyDown = (e: KeyboardEvent) => {
  const engineOpen = showEngineSelector.value || showEnginePicker.value
  if (engineOpen) {
    const list = activeEngineList.value
    const max = list.length - 1
    if (max < 0) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      selectedEngineIndex.value = selectedEngineIndex.value <= 0 ? max : selectedEngineIndex.value - 1
      scrollSelectedEngineIntoView()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      selectedEngineIndex.value = selectedEngineIndex.value >= max ? 0 : selectedEngineIndex.value + 1
      scrollSelectedEngineIntoView()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const eng = list[selectedEngineIndex.value]
      if (eng) void confirmEngine(eng)
    }
    return
  }

  if (!showBookmarkResults.value && !showTabResults.value) return

  if (showTabResults.value) {
    const max = Math.min(tabResults.value.length - 1, 7)
    if (max < 0) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedTabIndex.value = selectedTabIndex.value <= 0 ? max : selectedTabIndex.value - 1
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedTabIndex.value = selectedTabIndex.value >= max ? 0 : selectedTabIndex.value + 1
    } else if (e.key === 'Enter' && selectedTabIndex.value >= 0) {
      e.preventDefault()
      void activateTab(tabResults.value[selectedTabIndex.value]?.id)
    }
    return
  }

  if (!showBookmarkResults.value) return
  const max = Math.min(bookmarkResults.value.length - 1, 4)
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedBookmarkIndex.value = selectedBookmarkIndex.value <= 0 ? max : selectedBookmarkIndex.value - 1
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedBookmarkIndex.value = selectedBookmarkIndex.value >= max ? 0 : selectedBookmarkIndex.value + 1
  } else if (e.key === 'Enter' && selectedBookmarkIndex.value >= 0) {
    e.preventDefault()
    openBookmark(bookmarkResults.value[selectedBookmarkIndex.value]?.url)
  }
}

onMounted(async () => {
  await init()
  updateDropdownMaxH()
  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('resize', updateDropdownMaxH)

  unsubJumpData = storage.onChange(['jumpData', 'defaultKey'], (changes) => {
    if (changes.jumpData) {
      applyJumpData(parseJumpData(changes.jumpData.newValue))
    }
    if (changes.defaultKey && typeof changes.defaultKey.newValue === 'string') {
      defaultKey.value = changes.defaultKey.newValue
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('click', onPickerOutsideClick)
  window.removeEventListener('resize', updateDropdownMaxH)
  unsubJumpData?.()
})
</script>

<style scoped>
.search-bar-root {
  width: 100%;
}

.search-bar-inner {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.engine-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.85;
  transition: opacity 0.15s, transform 0.15s;
}

.engine-icon-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.engine-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

/* 悬浮容器：absolute，不占布局高度 */
.dropdowns {
  position: absolute;
  top: calc(100% + 8px);
  bottom: auto;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.search-bar-inner--drop-above .dropdowns {
  top: auto;
  bottom: calc(100% + 8px);
}

.tab-index-badge {
  flex-shrink: 0;
  min-width: 28px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: rgb(113 113 122);
  background: rgb(244 244 245);
}

:global(.dark) .tab-index-badge {
  color: rgb(161 161 170);
  background: rgb(39 39 42);
}
</style>
