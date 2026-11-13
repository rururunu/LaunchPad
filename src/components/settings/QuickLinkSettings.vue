<template>
  <div class="settings-page quick-link-settings">
    <section class="settings-section">
      <div class="settings-section-head quick-head">
        <div>
          <h3 class="settings-section-title">{{ t('links.title') }}</h3>
          <p class="settings-section-desc">{{ t('links.desc') }}</p>
        </div>
        <span class="quick-count">{{ t('links.count', { count: quickLinks.length }) }}</span>
      </div>

      <div class="quick-toolbar">
        <div v-if="isCreatingGroup" class="quick-create-group">
          <input
            ref="newGroupInput"
            v-model="newGroupName"
            class="settings-input"
            :aria-label="t('links.groupName')"
            :placeholder="t('links.groupName')"
            maxlength="24"
            @keydown.enter="createGroup"
            @keydown.esc="cancelCreateGroup"
          />
          <button type="button" class="quick-toolbar-icon" :title="t('links.create')" :aria-label="t('links.createGroup')" @click="createGroup">
            <Icon icon="fluent:checkmark-20-regular" />
          </button>
          <button type="button" class="quick-toolbar-icon" :title="t('links.cancel')" :aria-label="t('links.cancelCreate')" @click="cancelCreateGroup">
            <Icon icon="fluent:dismiss-20-regular" />
          </button>
        </div>
        <button v-else type="button" class="settings-btn settings-btn--ghost" @click="startCreateGroup">
          <Icon icon="fluent:folder-add-24-regular" />
          {{ t('links.newGroup') }}
        </button>
        <button type="button" class="settings-btn settings-btn--primary" @click="addLink">
          <Icon icon="fluent:add-24-regular" />
          {{ t('links.addSite') }}
        </button>
      </div>

      <div class="quick-display-row">
        <div class="quick-display-copy">
          <span class="quick-display-title">{{ t('links.display') }}</span>
          <span class="quick-display-desc">{{ t('links.displayDesc') }}</span>
        </div>
        <div class="quick-display-switch" role="group" :aria-label="t('links.displayLabel')">
          <button
            type="button"
            class="quick-display-option"
            :class="{ 'quick-display-option--active': quickLinkDisplayStyle === 'pill' }"
            :aria-pressed="quickLinkDisplayStyle === 'pill'"
            @click="selectDisplayStyle('pill')"
          >
            <span class="quick-mode-sample quick-mode-sample--pill" aria-hidden="true"><i /><i /><i /></span>
            {{ t('links.pill') }}
          </button>
          <button
            type="button"
            class="quick-display-option"
            :class="{ 'quick-display-option--active': quickLinkDisplayStyle === 'card' }"
            :aria-pressed="quickLinkDisplayStyle === 'card'"
            @click="selectDisplayStyle('card')"
          >
            <span class="quick-mode-sample quick-mode-sample--card" aria-hidden="true"><i /><i /><i /></span>
            {{ t('links.card') }}
          </button>
        </div>
      </div>

      <div v-if="quickLinkDisplayStyle === 'card'" class="quick-display-row">
        <div class="quick-display-copy">
          <span class="quick-display-title">{{ t('links.cardAlignment') }}</span>
          <span class="quick-display-desc">{{ t('links.hiddenCentered') }}</span>
        </div>
        <div class="quick-display-switch" role="group" :aria-label="t('links.cardAlignment')">
          <button v-for="alignment in (['top', 'center'] as const)" :key="alignment" type="button"
            class="quick-display-option" :class="{ 'quick-display-option--active': cardAlignment === alignment }"
            :aria-pressed="cardAlignment === alignment" @click="selectCardAlignment(alignment)">
            {{ t(alignment === 'top' ? 'links.alignTop' : 'links.alignCenter') }}
          </button>
        </div>
      </div>

      <div class="apple-group quick-label-group">
        <label class="apple-row">
          <span class="apple-row-label">{{ t('links.glassCards') }}</span>
          <input type="checkbox" role="switch" class="apple-switch" :checked="glassCards" @change="toggleGlassCards" />
        </label>
        <label class="apple-row">
          <span class="apple-row-label">{{ t('links.showNames') }}</span>
          <input type="checkbox" role="switch" class="apple-switch" :checked="showCardLabels" @change="toggleCardLabels" />
        </label>
      </div>

      <div class="quick-group-list">
        <section
          v-for="collection in linkCollections"
          :key="collection.key"
          class="quick-link-group"
          :class="{ 'quick-link-group--drag-over': dragOverGroupKey === collection.key }"
          @dragover.prevent="onGroupDragOver(collection.key)"
          @drop.prevent.stop="onDropOnGroup(collection.id)"
        >
          <header class="quick-link-group-head">
            <Icon :icon="collection.id ? 'fluent:folder-24-regular' : 'fluent:grid-24-regular'" />
            <input
              v-if="collection.group"
              v-model="collection.group.label"
              class="quick-group-name"
              :aria-label="t('links.groupName')"
              maxlength="24"
              @blur="saveGroupName(collection.group)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            <span v-else class="quick-group-label">{{ t('links.ungrouped') }}</span>
            <span class="quick-group-count">{{ collection.links.length }}</span>
            <AppleMenu
              v-if="collection.group && quickLinkDisplayStyle === 'card'"
              :model-value="collection.group.cardSize ?? 'small'"
              :groups="cardSizeGroups"
              :aria-label="t('links.groupSize')"
              @update:model-value="setGroupCardSize(collection.group, $event)"
            />
            <button
              v-if="collection.group"
              type="button"
              class="quick-toolbar-icon quick-group-delete"
              :title="t('links.deleteGroup')"
              :aria-label="t('links.deleteGroupNamed', { name: collection.group.label })"
              @click="removeGroup(collection.group.id)"
            >
              <Icon icon="fluent:delete-20-regular" />
            </button>
          </header>

          <div class="quick-editor-list">
            <article
              v-for="link in collection.links"
              :key="link.id"
              class="quick-editor-card"
              :class="{
                'quick-editor-card--open': editingId === link.id,
                'quick-editor-card--dragging': draggingId === link.id,
                'quick-editor-card--drag-over': dragOverId === link.id && draggingId !== link.id,
              }"
              :style="{ '--quick-popover-offset': `${popoverOffsets[link.id] ?? 0}px` }"
              @mouseenter="positionEditor(link.id, $event)"
              @focusin="positionEditor(link.id, $event)"
              @dragover.prevent.stop="onLinkDragOver(link)"
              @drop.prevent.stop="onDropOnLink(link)"
              @dragend="resetDrag"
            >
              <QuickLinkChip
                class="quick-editor-trigger"
                :link="link"
                :interactive="false"
                draggable="true"
                @click="toggleEdit(link.id, $event)"
                @dragstart="onDragStart(link, $event)"
              />
              <button
                type="button"
                class="quick-card-remove"
                :title="t('links.remove')"
                :aria-label="t('links.removeNamed', { name: link.label })"
                @pointerdown.stop
                @click.stop="removeLink(link.id)"
              >
                <Icon icon="fluent:dismiss-16-filled" />
              </button>
              <div class="quick-editor-popover" @click.stop>
                <div class="quick-editor-popover-head">
                  <span>{{ t('links.editLink') }}</span>
                  <button type="button" class="quick-editor-close" :title="t('links.collapse')" :aria-label="t('links.collapseEdit')" @click="editingId = null">
                    <Icon icon="fluent:dismiss-20-regular" />
                  </button>
                </div>
                <div class="quick-editor-fields">
                  <label class="quick-editor-field">
                    <span class="quick-editor-label">{{ t('links.name') }}</span>
                    <span class="quick-input-wrap">
                      <Icon icon="fluent:text-field-24-regular" class="quick-input-icon" />
                      <input
                        v-model="link.label"
                        class="settings-input quick-field-input"
                        :aria-label="t('links.linkName')"
                        :placeholder="t('links.siteName')"
                        @blur="saveChanges"
                        @keydown.enter="finishEditing"
                      />
                    </span>
                  </label>
                  <label class="quick-editor-field">
                    <span class="quick-editor-label">{{ t('links.url') }}</span>
                    <span class="quick-input-wrap">
                      <Icon icon="fluent:link-24-regular" class="quick-input-icon" />
                      <input
                        v-model="link.url"
                        class="settings-input quick-field-input quick-url-input"
                        :aria-label="t('links.linkUrl')"
                        placeholder="https://example.com"
                        spellcheck="false"
                        @blur="saveChanges"
                        @keydown.enter="finishEditing"
                      />
                    </span>
                  </label>
                </div>
                <div v-if="quickLinkDisplayStyle === 'card'" class="quick-card-size-control">
                  <span class="quick-editor-label">{{ t('links.cardSize') }}</span>
                  <div class="quick-size-switch" role="group" :aria-label="t('links.cardSize')">
                    <button
                      v-for="option in cardSizeOptions"
                      :key="option.value"
                      type="button"
                      :class="{ 'quick-size-switch--active': (link.cardSize ?? 'small') === option.value }"
                      @click="setLinkCardSize(link, option.value)"
                    >{{ option.label }}</button>
                  </div>
                </div>
                <div class="quick-editor-actions">
                  <button type="button" class="quick-icon-btn quick-icon-btn--danger" :title="t('links.remove')" :aria-label="t('links.remove')" @click="removeLink(link.id)">
                    <Icon icon="fluent:delete-24-regular" />
                  </button>
                  <button type="button" class="quick-editor-done" @click="finishEditing">
                    <Icon icon="fluent:checkmark-20-regular" />
                    {{ t('links.done') }}
                  </button>
                </div>
              </div>
            </article>
            <div v-if="!collection.links.length" class="quick-group-empty">
              {{ t('links.dropHere') }}
            </div>
          </div>
        </section>
      </div>
    </section>

    <CustomWidgetSettings />
    <hr class="settings-divider" />
    <section class="settings-section recommendation-section">
      <div class="settings-section-head">
        <h3 class="settings-section-title">{{ t('links.recommendations') }}</h3>
      </div>

      <div class="recommendation-browser">
        <div class="recommendation-tabs" role="tablist" :aria-label="t('links.categories')" aria-orientation="vertical">
          <button
            v-for="tab in recommendationTabs"
            :key="tab.id"
            type="button"
            role="tab"
            class="recommendation-tab"
            :class="{ 'recommendation-tab--active': activeRecommendationTab === tab.id }"
            :aria-selected="activeRecommendationTab === tab.id"
            @click="activeRecommendationTab = tab.id"
          >
            <Icon :icon="tab.icon" />
            <span class="recommendation-tab-label">{{ tab.label }}</span>
            <span class="recommendation-tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <div class="recommendation-pane" role="tabpanel">
          <div v-if="activeRecommendationTab === BOOKMARK_TAB" class="bookmark-tools">
            <Icon icon="fluent:search-20-regular" />
            <input
              v-model="bookmarkQuery"
              type="search"
              class="settings-input bookmark-search"
              :placeholder="t('links.searchBookmarks')"
              :aria-label="t('links.searchBookmarks')"
            />
          </div>

          <div class="recommendation-list">
            <QuickLinkChip
              v-for="link in visibleRecommendationLinks"
              :key="link.id"
              class="recommendation-chip"
              :class="{ 'recommendation-chip--added': isRecommendationAdded(link.url) }"
              :link="link"
              :interactive="false"
              :aria-disabled="isRecommendationAdded(link.url)"
              @click="addSuggestedLink(link)"
            />
            <div v-if="isLoadingBookmarks && activeRecommendationTab === BOOKMARK_TAB" class="recommendation-empty">
              {{ t('links.readingBookmarks') }}
            </div>
            <div v-else-if="!visibleRecommendationLinks.length" class="recommendation-empty">
              {{ activeRecommendationTab === BOOKMARK_TAB ? t('links.noBookmarks') : t('links.noRecommendations') }}
            </div>
          </div>
          <p v-if="hiddenBookmarkCount > 0" class="settings-hint">
            {{ t('links.moreResults', { count: hiddenBookmarkCount }) }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import CustomWidgetSettings from '@/components/widgets/CustomWidgetSettings.vue';
import { computed, nextTick, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import QuickLinkChip from '@/components/ui/QuickLinkChip.vue';
import AppleMenu from '@/components/ui/AppleMenu.vue';
import { useNotification } from '@/composables/useNotification';
import { useI18n } from '@/i18n';
import { useQuickLinks } from '@/composables/useQuickLinks';
import { storage } from '@/utils/storage';
import type { QuickLink, QuickLinkGroup, QuickLinkRecommendation } from '@/composables/useQuickLinks';
import type { QuickCardSize, QuickLinkDisplayStyle } from '@/composables/useQuickLinks';

const { error } = useNotification();
const { t } = useI18n();
const {
  quickLinks,
  quickLinkGroups,
  showCardLabels,
  loadShowCardLabels,
  saveShowCardLabels,
  recommendations,
  loadQuickLinks,
  loadRecommendations,
  saveQuickLinks,
  saveQuickLinkGroups,
  quickLinkDisplayStyle,
  glassCards,
  cardAlignment,
  saveCardAlignment,
  saveGlassCards,
  loadQuickLinkDisplayStyle,
  saveQuickLinkDisplayStyle,
} = useQuickLinks();
const editingId = ref<string | null>(null);
const draggingId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);
const dragOverGroupKey = ref<string | null>(null);
const popoverOffsets = ref<Record<string, number>>({});
const isCreatingGroup = ref(false);
const newGroupName = ref('');
const newGroupInput = ref<HTMLInputElement | null>(null);
const bookmarks = ref<QuickLink[]>([]);
const bookmarkQuery = ref('');
const isLoadingBookmarks = ref(false);
const BOOKMARK_TAB = 'bookmarks';
type RecommendationTabId = QuickLinkRecommendation['group'] | typeof BOOKMARK_TAB;
const activeRecommendationTab = ref<RecommendationTabId>('personal');
const cardSizeOptions = computed<Array<{ value: QuickCardSize; label: string }>>(() => [
  { value: 'small', label: t('links.small') },
  { value: 'medium', label: t('links.medium') },
  { value: 'large', label: t('links.large') },
]);
const cardSizeGroups = computed(() => [{
  options: cardSizeOptions.value.map((option) => ({ value: option.value, label: option.label })),
}]);

const RECOMMENDATION_GROUPS: QuickLinkRecommendation['group'][] = [
  'personal', 'trending', 'popular', 'cn', 'dev', 'ai', 'media',
];

const GROUP_ICONS: Record<QuickLinkRecommendation['group'], string> = {
  personal: 'fluent:person-star-20-regular',
  trending: 'fluent:arrow-trending-20-regular',
  popular: 'fluent:star-20-regular',
  cn: 'fluent:globe-asia-australia-20-regular',
  dev: 'fluent:code-20-regular',
  ai: 'fluent:brain-circuit-20-regular',
  media: 'fluent:video-clip-20-regular',
};

const recommendationGroups = computed(() =>
  RECOMMENDATION_GROUPS
    .map((id) => ({ id, label: t(`links.groups.${id}`), links: recommendations.value.filter((link) => link.group === id) }))
    .filter((group) => group.links.length)
);

const recommendationTabs = computed(() => [
  ...recommendationGroups.value.map((group) => ({
    id: group.id as RecommendationTabId,
    label: group.label,
    count: group.links.length,
    icon: GROUP_ICONS[group.id],
  })),
  {
    id: BOOKMARK_TAB as RecommendationTabId,
    label: t('links.groups.bookmarks'),
    count: bookmarks.value.length,
    icon: 'fluent:bookmark-multiple-20-regular',
  },
]);

const filteredBookmarks = computed(() => {
  const query = bookmarkQuery.value.trim().toLocaleLowerCase();
  if (!query) return bookmarks.value;
  return bookmarks.value.filter((bookmark) =>
    bookmark.label.toLocaleLowerCase().includes(query) || bookmark.url.toLocaleLowerCase().includes(query)
  );
});

const BOOKMARK_RENDER_LIMIT = 60;
const visibleRecommendationLinks = computed<QuickLink[]>(() => {
  if (activeRecommendationTab.value === BOOKMARK_TAB) {
    return filteredBookmarks.value.slice(0, BOOKMARK_RENDER_LIMIT);
  }
  return recommendations.value.filter((link) => link.group === activeRecommendationTab.value);
});

const hiddenBookmarkCount = computed(() =>
  activeRecommendationTab.value === BOOKMARK_TAB
    ? Math.max(0, filteredBookmarks.value.length - BOOKMARK_RENDER_LIMIT)
    : 0
);

const validGroupIds = computed(() => new Set(quickLinkGroups.value.map((group) => group.id)));
const linkCollections = computed(() => {
  const ungrouped = quickLinks.value.filter(
    (link) => !link.groupId || !validGroupIds.value.has(link.groupId)
  );
  return [
    { key: '__ungrouped__', id: undefined, group: undefined, links: ungrouped },
    ...quickLinkGroups.value.map((group) => ({
      key: group.id,
      id: group.id,
      group,
      links: quickLinks.value.filter((link) => link.groupId === group.id),
    })),
  ];
});

const startCreateGroup = async () => {
  isCreatingGroup.value = true;
  newGroupName.value = '';
  await nextTick();
  newGroupInput.value?.focus();
};

const selectDisplayStyle = async (style: QuickLinkDisplayStyle) => {
  try {
    await saveQuickLinkDisplayStyle(style);
  } catch (reason) {
    error(t('links.displaySaveFailed'), reason instanceof Error ? reason.message : String(reason));
  }
};

const setLinkCardSize = async (link: QuickLink, size: QuickCardSize) => {
  delete link.gridSize; link.cardSize = size; await saveQuickLinks(quickLinks.value);
};
const setGroupCardSize = async (group: QuickLinkGroup, size: QuickCardSize) => {
  delete group.gridSize;
  group.cardSize = size;
  await saveQuickLinkGroups(quickLinkGroups.value);
};
const selectCardAlignment = async (value: 'top' | 'center') => {
  try { await saveCardAlignment(value); }
  catch (reason) { error(t('links.displaySaveFailed'), String(reason)); }
};
const toggleGlassCards = async (event: Event) => {
  try {
    const enabled = (event.target as HTMLInputElement).checked;
    if (enabled) await saveQuickLinkDisplayStyle('card');
    await saveGlassCards(enabled);
  }
  catch (reason) { error(t('links.displaySaveFailed'), String(reason)); }
};
const toggleCardLabels = async (event: Event) => {
  await saveShowCardLabels((event.target as HTMLInputElement).checked);
};

const cancelCreateGroup = () => {
  isCreatingGroup.value = false;
  newGroupName.value = '';
};

const createGroup = async () => {
  const label = newGroupName.value.trim();
  if (!label) {
    newGroupInput.value?.focus();
    return;
  }
  const id = globalThis.crypto?.randomUUID?.() ?? `group-${Date.now()}`;
  await saveQuickLinkGroups([...quickLinkGroups.value, { id, label }]);
  cancelCreateGroup();
};

const saveGroupName = async (group: QuickLinkGroup) => {
  group.label = group.label.trim() || t('links.unnamedGroup');
  await saveQuickLinkGroups(quickLinkGroups.value);
};

const removeGroup = async (groupId: string) => {
  const nextLinks = quickLinks.value.map((link) => {
    if (link.groupId !== groupId) return { ...link };
    const ungroupedLink = { ...link };
    delete ungroupedLink.groupId;
    delete ungroupedLink.position;
    return ungroupedLink;
  });
  await Promise.all([
    saveQuickLinks(nextLinks),
    saveQuickLinkGroups(quickLinkGroups.value.filter((group) => group.id !== groupId)),
  ]);
};

const positionEditor = (id: string, event: Event) => {
  const eventElement = event.currentTarget as HTMLElement | null;
  const card = eventElement?.closest<HTMLElement>('.quick-editor-card');
  const popover = card?.querySelector<HTMLElement>('.quick-editor-popover');
  const settingsPage = card?.closest<HTMLElement>('.quick-link-settings');
  if (!card || !popover || !settingsPage) return;

  const cardRect = card.getBoundingClientRect();
  const pageRect = settingsPage.getBoundingClientRect();
  const popoverWidth = popover.getBoundingClientRect().width;
  const safeLeft = Math.max(pageRect.left + 12, 12);
  const safeRight = Math.min(pageRect.right - 12, window.innerWidth - 12);
  const left = Math.min(Math.max(cardRect.left, safeLeft), Math.max(safeLeft, safeRight - popoverWidth));
  popoverOffsets.value = { ...popoverOffsets.value, [id]: left - cardRect.left };
};

const toggleEdit = (id: string, event: Event) => {
  positionEditor(id, event);
  editingId.value = editingId.value === id ? null : id;
};

const normalizeUrl = (value: string) => {
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const parsed = new URL(candidate);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(t('links.urlProtocol'));
  return parsed.href;
};

const saveChanges = async () => {
  try {
    const normalized = quickLinks.value.map((link) => ({
      ...link,
      label: link.label.trim(),
      url: normalizeUrl(link.url),
    }));
    if (normalized.some((link) => !link.label)) throw new Error(t('links.nameRequired'));
    await saveQuickLinks(normalized);
    return true;
  } catch (e) {
    error(t('links.saveFailed'), e instanceof Error ? e.message : String(e));
    return false;
  }
};

const finishEditing = async () => {
  if (await saveChanges()) editingId.value = null;
};

const addLink = async () => {
  const id = globalThis.crypto?.randomUUID?.() ?? `quick-${Date.now()}`;
  await saveQuickLinks([
    ...quickLinks.value,
    {
      id,
      label: t('links.newSite'),
      url: 'https://example.com/',
    },
  ]);
  editingId.value = id;
};

const removeLink = async (id: string) => {
  if (editingId.value === id) editingId.value = null;
  await saveQuickLinks(quickLinks.value.filter((link) => link.id !== id));
};

const onDragStart = (link: QuickLink, event: DragEvent) => {
  editingId.value = null;
  draggingId.value = link.id;
  dragOverId.value = link.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', link.id);
  }
};

const onLinkDragOver = (link: QuickLink) => {
  if (!draggingId.value) return;
  dragOverId.value = link.id;
  dragOverGroupKey.value = link.groupId && validGroupIds.value.has(link.groupId)
    ? link.groupId
    : '__ungrouped__';
};

const onGroupDragOver = (groupKey: string) => {
  if (!draggingId.value) return;
  dragOverGroupKey.value = groupKey;
  dragOverId.value = null;
};

const resetDrag = () => {
  draggingId.value = null;
  dragOverId.value = null;
  dragOverGroupKey.value = null;
};

const moveLinkToGroup = (link: QuickLink, groupId?: string): QuickLink => {
  const next = { ...link };
  delete next.position;
  if (groupId) next.groupId = groupId;
  else delete next.groupId;
  return next;
};

const onDropOnLink = async (target: QuickLink) => {
  const sourceId = draggingId.value;
  if (!sourceId || sourceId === target.id) {
    resetDrag();
    return;
  }
  const next = quickLinks.value.map((link) => ({ ...link }));
  const sourceIndex = next.findIndex((link) => link.id === sourceId);
  const targetIndex = next.findIndex((link) => link.id === target.id);
  if (sourceIndex < 0 || targetIndex < 0) return resetDrag();
  const [source] = next.splice(sourceIndex, 1);
  const targetGroupId = target.groupId && validGroupIds.value.has(target.groupId)
    ? target.groupId
    : undefined;
  next.splice(targetIndex, 0, moveLinkToGroup(source, targetGroupId));
  resetDrag();
  await saveQuickLinks(next);
};

const onDropOnGroup = async (groupId?: string) => {
  const sourceId = draggingId.value;
  if (!sourceId) return;
  const source = quickLinks.value.find((link) => link.id === sourceId);
  if (!source) return resetDrag();
  const next = quickLinks.value.filter((link) => link.id !== sourceId).map((link) => ({ ...link }));
  next.push(moveLinkToGroup(source, groupId));
  resetDrag();
  await saveQuickLinks(next);
};

const isRecommendationAdded = (url: string) => quickLinks.value.some((link) => link.url === url);

const addSuggestedLink = async (link: Pick<QuickLink, 'label' | 'url'>) => {
  if (isRecommendationAdded(link.url)) return;
  await saveQuickLinks([
    ...quickLinks.value,
    {
      id: globalThis.crypto?.randomUUID?.() ?? `quick-${Date.now()}`,
      label: link.label,
      url: link.url,
    },
  ]);
};

const parseBookmarkNodes = (value: unknown): Array<{ id?: string; title?: string; url?: string }> => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadBookmarks = async () => {
  isLoadingBookmarks.value = true;
  try {
    const bookmarkApi = (globalThis as any).chrome?.bookmarks;
    const raw = bookmarkApi
      ? await bookmarkApi.search({})
      : await storage.get('cachedBookmarks');
    const byUrl = new Map<string, QuickLink>();
    parseBookmarkNodes(raw).forEach((bookmark, index) => {
      if (!bookmark.url) return;
      try {
        const url = new URL(bookmark.url);
        if (!['http:', 'https:'].includes(url.protocol) || byUrl.has(url.href)) return;
        byUrl.set(url.href, {
          id: `bookmark-${bookmark.id || index}`,
          label: bookmark.title?.trim() || url.hostname.replace(/^www\./, ''),
          url: url.href,
        });
      } catch {
        // Ignore browser-internal and malformed bookmark URLs.
      }
    });
    bookmarks.value = [...byUrl.values()];
  } catch (reason) {
    bookmarks.value = [];
    error(t('links.bookmarksFailed'), reason instanceof Error ? reason.message : String(reason));
  } finally {
    isLoadingBookmarks.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadQuickLinks(), loadQuickLinkDisplayStyle(), loadShowCardLabels(), loadRecommendations(), loadBookmarks()]);
  if (!recommendationTabs.value.some((tab) => tab.id === activeRecommendationTab.value)) {
    activeRecommendationTab.value = recommendationTabs.value[0]?.id ?? BOOKMARK_TAB;
  }
});
</script>

<style scoped>
.quick-link-settings {
  min-width: 0;
  overflow-x: hidden;
}

.quick-head {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quick-count {
  color: var(--ui-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.quick-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.quick-display-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 44px;
  padding: 10px 16px;
  border: 0;
  border-radius: 10px;
  background: #fff;
}

.quick-display-copy { display: flex; flex-direction: column; gap: 3px; }
.quick-display-title { color: #1d1d1f; font-size: 15px; font-weight: 400; }

@media (prefers-color-scheme: dark) {
  .quick-display-row { background: #2c2c2e; }
  .quick-display-title { color: #f5f5f7; }
}
.quick-display-desc { color: var(--ui-text-muted); font-size: 11px; }

.quick-display-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--ui-border);
  border-radius: 9px;
  background: var(--ui-surface-soft);
}

.quick-display-option {
  min-width: 82px;
  height: 32px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--ui-text-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.quick-display-option:hover { color: var(--ui-text); }
.quick-display-option--active {
  color: var(--ui-accent);
  border-color: var(--ui-border);
  background: var(--ui-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.quick-widgets-section {
  padding: 12px 14px;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
  background: var(--ui-surface);
}

.quick-widgets-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.quick-widgets-heading > div { display: flex; flex-direction: column; gap: 3px; }
.quick-label-group { margin-top: 8px; }
.quick-widget-catalog, .quick-widget-list { display: flex; flex-wrap: wrap; gap: 7px; }
.quick-widget-add {
  min-height: 30px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--ui-border);
  border-radius: 7px;
  color: var(--ui-text-secondary);
  background: var(--ui-surface-soft);
  cursor: pointer;
  font-size: 11px;
}
.quick-widget-add:hover { color: var(--ui-accent); border-color: var(--ui-accent); background: var(--ui-accent-soft); }
.quick-widget-list { margin-top: 10px; flex-direction: column; gap: 4px; }
.quick-widget-row { min-height: 34px; display: flex; align-items: center; gap: 3px; padding: 2px 4px 2px 8px; border: 1px solid var(--ui-border); border-radius: 7px; background: var(--ui-surface-soft); }
.quick-widget-row-copy { min-width: 0; display: flex; align-items: center; gap: 7px; flex: 1; color: var(--ui-text-secondary); font-size: 12px; }
.quick-widget-size { width: 62px; height: 28px; padding-inline: 6px; }
.quick-widget-remove:hover { color: #dc2626; background: rgba(220, 38, 38, 0.08); }
.quick-card-size-control { padding: 0 12px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.quick-size-switch { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--ui-border); border-radius: 7px; background: var(--ui-surface-soft); }
.quick-size-switch button { min-width: 28px; height: 25px; padding: 0 7px; border: 0; border-radius: 5px; color: var(--ui-text-muted); background: transparent; cursor: pointer; font-size: 11px; }
.quick-size-switch button:hover { color: var(--ui-text); }
.quick-size-switch button.quick-size-switch--active { color: var(--ui-accent); background: var(--ui-surface); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
.quick-group-head > .quick-size-switch { margin-left: auto; }

.quick-mode-sample { width: 22px; height: 16px; display: flex; align-items: center; justify-content: center; gap: 2px; }
.quick-mode-sample i { display: block; width: 5px; height: 9px; background: currentColor; opacity: 0.55; }
.quick-mode-sample--pill i { width: 7px; height: 5px; border-radius: 999px; }
.quick-mode-sample--card i { width: 6px; height: 8px; border-radius: 2px; }

.quick-create-group {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.quick-create-group .settings-input {
  width: min(190px, calc(100vw - 210px));
}

.quick-toolbar-icon {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 6px;
  color: var(--ui-text-muted);
  background: transparent;
  cursor: pointer;
  font-size: 16px;
}

.quick-toolbar-icon:hover,
.quick-toolbar-icon:focus-visible {
  color: var(--ui-text);
  background: var(--ui-surface-soft);
}

.quick-group-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-link-group {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-surface-soft);
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.quick-link-group--drag-over {
  border-color: var(--ui-accent);
  background: var(--ui-accent-soft);
  box-shadow: inset 0 0 0 1px var(--ui-accent);
}

.quick-link-group-head {
  min-height: 28px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ui-text-muted);
}

.quick-link-group-head > svg {
  flex-shrink: 0;
  font-size: 16px;
}

.quick-group-name {
  min-width: 0;
  height: 28px;
  padding: 0 4px;
  flex: 1;
  border: 1px solid transparent;
  border-radius: 5px;
  outline: none;
  color: var(--ui-text-secondary);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
}

.quick-group-name:hover {
  border-color: var(--ui-border-strong);
}

.quick-group-name:focus {
  border-color: var(--ui-accent);
  background: var(--ui-surface);
}

.quick-group-label {
  min-width: 0;
  flex: 1;
  color: var(--ui-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.quick-group-count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.quick-group-delete:hover,
.quick-group-delete:focus-visible {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}

.quick-editor-list {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  overflow: visible;
}

.quick-group-empty {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--ui-border-strong);
  border-radius: 7px;
  color: var(--ui-text-muted);
  font-size: 11px;
}

.quick-editor-card {
  position: relative;
  max-width: 100%;
  flex-shrink: 0;
}

.quick-editor-card:hover,
.quick-editor-card:focus-within,
.quick-editor-card--open {
  z-index: 10;
}

.quick-editor-trigger {
  max-width: min(180px, 100%);
  cursor: grab;
}

.quick-editor-trigger:active {
  cursor: grabbing;
}

.quick-card-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 12;
  width: 20px;
  height: 20px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  color: #fff;
  background: #dc2626;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.24);
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.8);
  transition: opacity 0.12s ease, transform 0.12s ease, background 0.12s ease;
}

.quick-editor-card:hover .quick-card-remove,
.quick-card-remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.quick-card-remove:hover,
.quick-card-remove:focus-visible {
  background: #b91c1c;
}

.quick-editor-card--dragging {
  opacity: 0.42;
}

.quick-editor-card--dragging .quick-editor-popover {
  display: none;
}

.quick-editor-card--drag-over :deep(.quick-link-chip) {
  border-color: var(--ui-accent);
  box-shadow: 0 0 0 2px var(--ui-accent-soft);
  transform: translateY(-2px);
}

.quick-editor-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: var(--quick-popover-offset, 0px);
  width: min(340px, calc(100vw - 48px));
  max-width: calc(100% + 300px);
  box-sizing: border-box;
  padding: 0;
  border: 1px solid var(--ui-border-strong);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-5px);
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
}

.quick-editor-popover::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 100%;
  left: 0;
  height: 8px;
}

.quick-editor-card:hover .quick-editor-popover,
.quick-editor-card:focus-within .quick-editor-popover,
.quick-editor-card--open .quick-editor-popover {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.quick-editor-popover-head {
  height: 42px;
  padding: 0 10px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--ui-border);
  color: var(--ui-text);
  font-size: 12px;
  font-weight: 600;
}

.quick-editor-close {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  color: var(--ui-text-muted);
  background: transparent;
  cursor: pointer;
  font-size: 15px;
}

.quick-editor-close:hover {
  color: var(--ui-text);
  background: var(--ui-surface-soft);
}

.quick-editor-fields {
  min-width: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-editor-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.quick-editor-label {
  color: var(--ui-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.quick-input-wrap {
  position: relative;
  display: block;
}

.quick-input-icon {
  position: absolute;
  top: 50%;
  left: 10px;
  z-index: 1;
  color: var(--ui-text-muted);
  font-size: 15px;
  pointer-events: none;
  transform: translateY(-50%);
}

.quick-field-input {
  padding-left: 34px;
}

.quick-url-input {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
}

.quick-editor-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  justify-content: space-between;
  min-height: 46px;
  margin-top: 0;
  padding: 7px 10px;
  border-top: 1px solid var(--ui-border);
  background: var(--ui-surface-soft);
}

.quick-icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  color: var(--ui-text-muted);
  background: transparent;
  cursor: pointer;
  font-size: 15px;
}

.quick-icon-btn:hover:not(:disabled) {
  color: var(--ui-accent);
  background: var(--ui-accent-soft);
}

.quick-icon-btn--danger:hover:not(:disabled) {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}

.quick-icon-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.quick-editor-done {
  height: 32px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 7px;
  color: #fff;
  background: var(--ui-accent);
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.24);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.quick-editor-done:hover {
  background: var(--ui-accent-hover);
}

.recommendation-section {
  gap: 12px;
}

.recommendation-browser {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.recommendation-tabs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 12px;
  border-right: 1px solid var(--ui-border);
}

.recommendation-tab {
  position: relative;
  width: 100%;
  height: 36px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 6px;
  color: var(--ui-text-muted);
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  text-align: left;
  transition: color 0.15s ease, background 0.15s ease;
}

.recommendation-tab:hover {
  color: var(--ui-text-secondary);
  background: var(--ui-surface-soft);
}

.recommendation-tab--active {
  color: var(--ui-accent);
  background: var(--ui-accent-soft);
}

.recommendation-tab--active::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--ui-accent);
}

.recommendation-tab > svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.recommendation-tab-label {
  min-width: 0;
  overflow: hidden;
  flex: 1;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-tab-count {
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 5px;
  color: var(--ui-text-muted);
  background: rgba(127, 127, 127, 0.08);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.recommendation-tab--active .recommendation-tab-count {
  color: var(--ui-accent);
  background: rgba(37, 99, 235, 0.1);
}

.recommendation-pane {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 2px;
}

.bookmark-tools {
  position: relative;
  width: 100%;
}

.bookmark-tools > svg {
  position: absolute;
  top: 50%;
  left: 10px;
  z-index: 1;
  width: 15px;
  height: 15px;
  color: var(--ui-text-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

.bookmark-search {
  padding-left: 32px;
}

.recommendation-list {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.recommendation-chip {
  max-width: 100%;
  cursor: pointer;
}

.recommendation-chip--added,
.recommendation-chip:disabled {
  opacity: 0.45;
  cursor: default;
}

.recommendation-empty {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--ui-border-strong);
  border-radius: 7px;
  color: var(--ui-text-muted);
  font-size: 11px;
}

.quick-empty {
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--ui-border-strong);
  border-radius: 8px;
  color: var(--ui-text-muted);
  font-size: 12px;
}

@media (max-width: 520px) {
  .quick-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .quick-toolbar > .settings-btn {
    align-self: flex-start;
  }

  .quick-display-row { align-items: flex-start; flex-direction: column; }

  .quick-create-group .settings-input {
    width: 100%;
  }

  .quick-editor-list {
    gap: 8px;
  }

  .quick-editor-popover {
    width: min(300px, calc(100vw - 32px));
  }

  .quick-editor-trigger {
    max-width: 140px;
  }

  .recommendation-browser {
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 10px;
  }

  .recommendation-tabs {
    padding-right: 8px;
  }

  .recommendation-tab {
    padding-inline: 6px;
    gap: 5px;
  }
}

@media (prefers-color-scheme: dark) {
  .quick-editor-popover {
    background: rgba(39, 39, 42, 0.98);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  }
}
</style>
