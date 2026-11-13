<template>
  <nav
    v-if="quickLinks.length || customWidgets.length"
    ref="quickLinksRef"
    class="quick-links"
    :class="[`quick-links--${quickLinkDisplayStyle}`, { 'quick-links--readonly': readOnly, 'quick-links--grid-dragging': !!draggingTopKey && quickLinkDisplayStyle === 'card', 'quick-links--glass': glassCards && quickLinkDisplayStyle === 'card' }]"
    :aria-label="t('quick.label')"
    @wheel="onPageWheel"
    @pointerdown.capture="rememberDragAnchor"
    @dragover.prevent="onTopContainerDragOver"
    @drop.prevent="onTopContainerDrop"
  >
    <div v-if="gridDrop" class="quick-grid-drop" :style="{ gridColumn: `${(gridDrop.col - 1) * 2 + 1 + (cardPages.columnOffsets.get(currentPage) ?? 0)} / span ${gridDrop.cols * 2}`, gridRow: `${gridDrop.row} / span ${gridDrop.rows}` }" />
    <template v-for="item in visibleTopItems" :key="item.key">
      <div
        v-if="item.kind === 'link'"
        class="quick-link-item quick-link-draggable quick-top-item"
        :class="[topItemClasses(item.key), `quick-card-size--${item.link.cardSize ?? 'small'}`]"
        :style="gridStyle(item.kind === 'link' ? item.link : item.group)"
        :data-drag-key="item.key"
        :draggable="!readOnly && quickLinkDisplayStyle !== 'card'"
        @dragstart="onTopDragStart(item.key, item.link, $event)"
        @dragover.prevent.stop="onTopItemDragOver(item.key, $event)"
        @drop.prevent.stop="onTopItemDrop(item.key)"
        @dragend="onTopNativeDragEnd"
        @contextmenu.prevent.stop="openContextMenu(item.link, $event)"
      >
        <QuickLinkChip
          :link="item.link"
          :icon-size="quickLinkDisplayStyle === 'card' ? 44 : 16"
          :show-label="quickLinkDisplayStyle !== 'card' || showCardLabels"
          :class="{ 'quick-link-chip--card': quickLinkDisplayStyle === 'card' }"
          draggable="false"
          @click="onLinkClick"
        />
      </div>

      <div
        v-else
        :data-quick-group-id="item.group.id"
        @contextmenu.prevent.stop="openCardMenu('group', item.group.id, item.group.label, $event)"
        class="quick-group-item quick-top-item"
        :class="[
          topItemClasses(item.key),
          `quick-card-size--${item.group.cardSize ?? 'small'}`,
          {
            'quick-group-item--open': expandedGroupId === item.group.id,
            'quick-group-item--accept': groupDropTargetId === item.group.id,
          },
        ]"
        :style="gridStyle(item.kind === 'link' ? item.link : item.group)"
        :data-drag-key="item.key"
        :draggable="!readOnly && quickLinkDisplayStyle !== 'card'"
        @dragstart="onTopDragStart(item.key, undefined, $event)"
        @dragover.prevent.stop="onTopItemDragOver(item.key, $event)"
        @drop.prevent.stop="onTopItemDrop(item.key)"
        @dragend="onTopNativeDragEnd"
      >
        <button
          type="button"
          class="quick-group-chip"
          :class="{ 'quick-group-chip--card': quickLinkDisplayStyle === 'card' }"
          draggable="false"
          :aria-expanded="expandedGroupId === item.group.id"
          @click.stop="toggleGroup(item.group.id, $event)"
        >
          <span v-if="quickLinkDisplayStyle !== 'card' || showCardLabels" class="quick-group-chip-label" :title="item.group.label">{{ item.group.label }}</span>
          <span v-if="groupDropTargetId === item.group.id" class="quick-group-drop-hint">
            <Icon icon="fluent:add-circle-16-filled" />
            {{ t('quick.dropIntoGroup') }}
          </span>
          <span v-else class="quick-group-icons" aria-hidden="true">
            <span v-for="link in item.group.links.slice(0, 3)" :key="link.id" class="quick-group-icon">
              <FaviconImg :url="link.url" :custom-src="link.iconUrl" :size="18" />
            </span>
          </span>
        </button>
      </div>
    </template>

    <article v-for="widget in visibleWidgets" :key="widget.id" class="quick-widget-card" :data-drag-key="`widget:${widget.id}`" @dragover.prevent.stop="onTopItemDragOver(`widget:${widget.id}`, $event)" @drop.prevent.stop="onTopItemDrop(`widget:${widget.id}`)" :style="gridStyle(widget)" :class="topItemClasses(`widget:${widget.id}`)" @contextmenu.prevent.stop="openCardMenu('widget', widget.id, widget.title || t('quick.widget'), $event)">
      <CustomWidgetFrame :glass="glassCards" :code="widget.code || ''" :title="widget.title || t('quick.widget')" :widget-id="widget.id" />
      <button v-if="widget.popupCode" class="widget-open" :aria-label="t('quick.openWidget', { title: widget.title || t('quick.widget') })" @click="openedWidget = widget" />
      <button v-if="!readOnly" class="widget-drag" type="button" draggable="false" :aria-label="t('quick.dragWidget')">⠿</button>
    </article>
    <Transition name="quick-menu">
      <section
        v-if="expandedGroup && quickLinkDisplayStyle !== 'card'"
        ref="groupPopoverRef"
        class="quick-group-popover"
        :style="{
          clipPath: groupPopoverClipPath,
          WebkitClipPath: groupPopoverClipPath,
        }"
        @pointerdown.stop
      >
        <div
          class="quick-group-popover-list"
          @dragover.prevent.stop
          @drop.prevent.stop="onInnerContainerDrop"
        >
          <div
            v-for="link in expandedGroup.links"
            :key="link.id"
            class="quick-group-link quick-link-draggable"
            :class="{
              'quick-group-link--dragging': draggingId === link.id,
              'quick-drag-gap-before': innerDropTarget?.id === link.id && innerDropTarget.side === 'before',
              'quick-drag-gap-after': innerDropTarget?.id === link.id && innerDropTarget.side === 'after',
            }"
            :draggable="!readOnly"
            @dragstart="onInnerDragStart(link, $event)"
            @dragover.prevent.stop="onInnerDragOver(link, $event)"
            @drop.prevent.stop="onInnerDrop(link)"
            @dragend="finishDrag"
            @contextmenu.prevent.stop="openContextMenu(link, $event)"
          >
            <QuickLinkChip
              :link="link"
              :show-label="quickLinkDisplayStyle !== 'card' || showCardLabels"
              :icon-size="quickLinkDisplayStyle === 'card' ? 56 : 16"
              :class="quickLinkDisplayStyle === 'card' ? 'quick-group-app' : undefined"
              draggable="false"
              @click="onLinkClick"
            />
          </div>
        </div>
      </section>
    </Transition>
  </nav>

  <div v-if="quickLinkDisplayStyle === 'card' && cardPages.count > 1" class="card-pagination" :aria-label="t('quick.pagination')">
    <button type="button" :disabled="currentPage === 0" :aria-label="t('quick.previousPage')" @click="changePage(-1)"><Icon icon="fluent:chevron-left-20-regular" /></button>
    <span aria-live="polite">{{ currentPage + 1 }} / {{ cardPages.count }}</span>
    <button type="button" :disabled="currentPage === cardPages.count - 1" :aria-label="t('quick.nextPage')" @click="changePage(1)"><Icon icon="fluent:chevron-right-20-regular" /></button>
  </div>
  <WidgetPopup v-if="openedWidget" :title="openedWidget.title || t('quick.widget')" :code="openedWidget.popupCode || ''" :widget-id="openedWidget.id" @close="openedWidget = null" />
  <Teleport to="body">
    <dialog
      v-if="expandedGroup && quickLinkDisplayStyle === 'card'"
      ref="groupDialogRef"
      class="quick-group-dialog"
      :aria-label="expandedGroup.label"
      @close="expandedGroupId = null"
      @pointerdown="onGroupDialogPointerDown"
      @click.self="expandedGroupId = null"
    >
      <header>
        <h2 :class="{ 'quick-group-dialog-title--hidden': !showCardLabels }">{{ expandedGroup.label }}</h2>
        <button type="button" class="quick-group-dialog-close" :aria-label="t('quick.close')" @click="expandedGroupId = null"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7 L17 17 M17 7 L7 17" /></svg></button>
      </header>
      <div class="quick-group-dialog-list" @dragover.prevent.stop @drop.prevent.stop="onInnerContainerDrop">
        <div
          v-for="link in expandedGroup.links"
          :key="link.id"
          class="quick-group-link quick-link-draggable"
          :class="{
            'quick-group-link--dragging': draggingId === link.id,
            'quick-drag-gap-before': innerDropTarget?.id === link.id && innerDropTarget.side === 'before',
            'quick-drag-gap-after': innerDropTarget?.id === link.id && innerDropTarget.side === 'after',
          }"
          :draggable="!readOnly"
          @dragstart="onInnerDragStart(link, $event)"
          @dragover.prevent.stop="onInnerDragOver(link, $event)"
          @drop.prevent.stop="onInnerDrop(link)"
          @dragend="finishDrag"
          @contextmenu.prevent.stop="openContextMenu(link, $event)"
        >
          <QuickLinkChip
            :link="link"
            :show-label="showCardLabels"
            :icon-size="56"
            class="quick-group-app"
            draggable="false"
            @click="onLinkClick"
          />
        </div>
      </div>
    </dialog>
  </Teleport>
  <IconEditor v-if="editingIcon" :key="editingIcon.id" :link="editingIcon" @close="editingIcon = null" />
  <Teleport :to="contextMenuTarget">
    <Transition name="quick-menu">
      <div
        v-if="contextMenu"
        class="quick-context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        role="menu"
        @pointerdown.stop
        @contextmenu.prevent
      >
        <div class="quick-context-title" :title="contextMenu.link.label">
          <FaviconImg v-if="contextKind === 'link'" :url="contextMenu.link.url" :custom-src="contextMenu.link.iconUrl" :size="16" />
          <span>{{ contextMenu.link.label }}</span>
        </div>
        <button v-if="contextKind === 'link'" type="button" role="menuitem" @click="visitLink">
          <Icon icon="fluent:open-20-regular" />
          <span>{{ t('quick.openNewTab') }}</span>
        </button>
        <div v-if="showLayoutMenu" class="card-layout-menu">
          <div class="card-layout-heading"><Icon icon="fluent:grid-20-regular" />{{ t('quick.layout') }}</div>
          <div class="card-layout-options" role="group" :aria-label="t('quick.layoutGrid')">
            <button v-for="preset in availablePresets" :key="preset.cols + ':' + preset.rows" type="button" :aria-pressed="selectedGrid.cols === preset.cols && selectedGrid.rows === preset.rows" @click="selectLayout(preset)">{{ preset.cols }}×{{ preset.rows }}</button>
          </div>
        </div>
        <button v-if="contextKind === 'link'" type="button" role="menuitem" @click="editIcon">
          <Icon icon="fluent:image-edit-20-regular" /><span>{{ t('quick.editIcon') }}</span>
        </button>
        <button v-if="contextKind === 'link'" type="button" role="menuitem" @click="shareLink">
          <Icon icon="fluent:share-20-regular" />
          <span>{{ t('quick.share') }}</span>
        </button>
        <div class="quick-context-divider" />
        <button type="button" class="quick-context-remove" role="menuitem" @click="removeContextItem">
          <Icon icon="fluent:delete-20-regular" />
          <span>{{ t('quick.delete') }}</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { paginateCards } from '@/utils/cardPages';
import CustomWidgetFrame from '@/components/widgets/CustomWidgetFrame.vue';
import WidgetPopup from '@/components/widgets/WidgetPopup.vue';
import { removeWidgetData } from '@/utils/widgetData';
import type { QuickAccessWidgetInstance } from '@/composables/useQuickLinks';
import { Icon } from '@iconify/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Sortable, { type SortableEvent } from 'sortablejs';
import IconEditor from '@/components/ui/IconEditor.vue';
import FaviconImg from '@/components/ui/FaviconImg.vue';
import QuickLinkChip from '@/components/ui/QuickLinkChip.vue';
import { useNotification } from '@/composables/useNotification';
import { useI18n } from '@/i18n';
import { useQuickLinks } from '@/composables/useQuickLinks';
import type { QuickLink } from '@/composables/useQuickLinks';

const props = withDefaults(defineProps<{ readOnly?: boolean }>(), { readOnly: false });
const {
  quickLinks,
  quickLinkGroups,
  quickAccessWidgets,
  showCardLabels,
  glassCards,
  loadShowCardLabels,
  loadQuickLinks,
  saveQuickLinks,
  saveQuickLinkGroups,
  quickLinkDisplayStyle,
  loadQuickLinkDisplayStyle,
  saveQuickAccessWidgets,
  loadQuickAccessWidgets,
} = useQuickLinks();
const { success, error } = useNotification();
const { t } = useI18n();
type GridSize = { cols: number; rows: number };
type SizedCard = { minCols?: number; minRows?: number; maxCols?: number; maxRows?: number; id?: string; url?: string; gridSize?: GridSize; cardSize?: string; size?: string; type?: string };
const gridSize = (item: SizedCard): GridSize => {
  const preset = item.cardSize ?? item.size;
  const fallback = preset === 'large' ? { cols: 4, rows: 3 } : preset === 'medium' ? { cols: 2, rows: 2 } : item.type ? { cols: 2, rows: 2 } : { cols: 1, rows: 1 };
  return { cols: Math.max(item.minCols ?? 1, Math.min(item.maxCols ?? 12, Math.round(Number(item.gridSize?.cols) || fallback.cols))), rows: Math.max(item.minRows ?? 1, Math.min(item.maxRows ?? 6, Math.round(Number(item.gridSize?.rows) || fallback.rows))) };
};
const gridStyle = (item: SizedCard) => {
  if (quickLinkDisplayStyle.value !== 'card') return {};
  const key = `${item.type ? 'widget' : item.url ? 'link' : 'group'}:${item.id}`;
  const cell = cardPages.value.positions.get(key);
  return { '--card-cols': cell?.cols ?? gridSize(item).cols, '--card-rows': cell?.rows ?? gridSize(item).rows,
    gridColumn: cell ? `${(cell.col - 1) * 2 + 1 + (cardPages.value.columnOffsets.get(cell.page) ?? 0)} / span ${cell.cols * 2}` : undefined,
    gridRow: cell ? `${cell.row} / span ${cell.rows}` : undefined };
};
const previewGroup = (id: string, size: GridSize) => { const item = quickLinkGroups.value.find(item => item.id === id); if (item) item.gridSize = size; };
const previewWidget = (id: string, size: GridSize) => { const item = quickAccessWidgets.value.find(item => item.id === id); if (item) item.gridSize = size; };
const saveGridSize = async (kind: string, id: string, size: GridSize) => {
  try {
    if (kind === 'link') await saveQuickLinks(quickLinks.value.map(item => item.id === id ? { ...item, gridSize: size } : item));
    else if (kind === 'group') { previewGroup(id, size); await saveQuickLinkGroups(); }
    else { previewWidget(id, size); await saveQuickAccessWidgets(); }
  } catch { error(t('quick.sizeSaveFailed'), t('quick.retry')); }
};

watch(quickLinkDisplayStyle, () => { finishDrag(); });
const draggingId = ref<string | null>(null);
const draggingTopKey = ref<string | null>(null);
const topDropTarget = ref<{ key: string; side: 'before' | 'after' } | null>(null);
const innerDropTarget = ref<{ id: string; side: 'before' | 'after' } | null>(null);
const groupHoverId = ref<string | null>(null);
const groupDropTargetId = ref<string | null>(null);
let groupHoverTimer: number | null = null;
const suppressClick = ref(false);
const expandedGroupId = ref<string | null>(null);
const quickLinksRef = ref<HTMLElement | null>(null);
const groupPopoverRef = ref<HTMLElement | null>(null);
const groupArrowX = ref(28);
const groupPopoverClipPath = ref('none');
const groupDialogRef = ref<HTMLDialogElement | null>(null);
const editingIcon = ref<QuickLink | null>(null);
const editIcon = () => {
  if (!contextMenu.value || contextKind.value !== 'link') return;
  editingIcon.value = { ...contextMenu.value.link };
  closeContextMenu();
};
const contextKind = ref<'link' | 'group' | 'widget'>('link');
const contextMenu = ref<{ link: QuickLink; x: number; y: number } | null>(null);

const validGroupIds = computed(() => new Set(quickLinkGroups.value.map((group) => group.id)));
const ungroupedLinks = computed(() => quickLinks.value.filter(
  (link) => !link.groupId || !validGroupIds.value.has(link.groupId)
));
const populatedGroups = computed(() => quickLinkGroups.value
  .map((group) => ({
    ...group,
    links: quickLinks.value.filter((link) => link.groupId === group.id),
  }))
  .filter((group) => group.links.length));
const topLevelItems = computed(() => [
  ...ungroupedLinks.value.map((link, index) => ({
    kind: 'link' as const,
    key: `link:${link.id}`,
    link,
    position: link.position,
    fallbackIndex: index,
  })),
  ...populatedGroups.value.map((group, index) => ({
    kind: 'group' as const,
    key: `group:${group.id}`,
    group,
    position: group.position,
    fallbackIndex: ungroupedLinks.value.length + index,
  })),
].sort((a, b) => {
  if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
  if (a.position !== undefined) return -1;
  if (b.position !== undefined) return 1;
  return a.fallbackIndex - b.fallbackIndex;
}));
const expandedGroup = computed(() =>
  populatedGroups.value.find((group) => group.id === expandedGroupId.value) ?? null
);
watch(() => expandedGroup.value?.id, async (id) => {
  if (!id || quickLinkDisplayStyle.value !== 'card') return;
  await nextTick();
  const dialog = groupDialogRef.value;
  if (dialog && !dialog.open) dialog.showModal();
});
const onGroupDialogPointerDown = (event: PointerEvent) => {
  if (event.target === event.currentTarget) return;
  if (!(event.target instanceof Element && event.target.closest('.quick-context-menu'))) contextMenu.value = null;
  event.stopPropagation();
};
// 只读模式（Alt+S 浮层）不显示小组件：沙箱页不对网页开放，组件在那里无法运行。
const customWidgets = computed(() => props.readOnly ? [] : quickAccessWidgets.value.filter(w => w.type === 'custom' && typeof w.code === 'string'));
const openedWidget = ref<QuickAccessWidgetInstance | null>(null);
const desktopKeys = computed(() => {
  const cards = topLevelItems.value.map((item, index) => ({ key: item.key, position: item.position, fallback: index }));
  if (quickLinkDisplayStyle.value === 'card') cards.push(...customWidgets.value.map((w, index) => ({ key: `widget:${w.id}`, position: w.position, fallback: cards.length + index })));
  const order = cards.sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.fallback - b.fallback).map(item => item.key);
  return order;
});

const currentPage = ref(0);
const gridColumns = ref(window.innerWidth <= 480 ? 4 : window.innerWidth <= 900 ? 6 : 12);
const updateGridColumns = () => { gridColumns.value = window.innerWidth <= 480 ? 4 : window.innerWidth <= 900 ? 6 : 12; };
const cardPages = computed(() => {
  const sizes = new Map<string, GridSize>();
  topLevelItems.value.forEach(item => sizes.set(item.key, gridSize(item.kind === 'link' ? item.link : item.group)));
  customWidgets.value.forEach(item => sizes.set(`widget:${item.id}`, gridSize(item)));
  const placements = new Map([
    ...topLevelItems.value.map(item => [item.key, (item.kind === 'link' ? item.link : item.group).gridPlacement] as const),
    ...customWidgets.value.map(item => [`widget:${item.id}`, item.gridPlacement] as const),
  ]);
  return paginateCards(desktopKeys.value.map(key => ({ key, ...sizes.get(key)!, placement: placements.get(key) })), gridColumns.value);
});
const visibleWidgets = computed(() => quickLinkDisplayStyle.value === 'card' ? customWidgets.value.filter(w => cardPages.value.positions.get(`widget:${w.id}`)?.page === currentPage.value) : []);
const visibleTopItems = computed(() => quickLinkDisplayStyle.value === 'card' ? topLevelItems.value.filter(item => cardPages.value.positions.get(item.key)?.page === currentPage.value) : topLevelItems.value);
watch(() => cardPages.value.count, count => { currentPage.value = Math.min(currentPage.value, count - 1); });
const changePage = (direction: number) => {
  if (draggingTopKey.value || draggingId.value) return;
  currentPage.value = Math.max(0, Math.min(cardPages.value.count - 1, currentPage.value + direction));
  closeOverlays();
};
let wheelAmount = 0;
let lastWheel = 0;
let pageCooldown = 0;
const onPageWheel = (event: WheelEvent) => {
  if (quickLinkDisplayStyle.value !== 'card' || cardPages.value.count < 2 || event.ctrlKey) return;
  const target = event.target as HTMLElement;
  if (target.closest('textarea, input, select, [contenteditable=true], .quick-group-popover')) return;
  // Let scrollable widget content consume its own scroll gestures.
  for (let node: HTMLElement | null = target; node && node !== quickLinksRef.value; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) return;
  }
  event.preventDefault();
  const now = Date.now();
  if (now < pageCooldown) return;
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1);
  if (now - lastWheel > 180 || Math.sign(delta) !== Math.sign(wheelAmount)) wheelAmount = 0;
  lastWheel = now; wheelAmount += delta;
  if (Math.abs(wheelAmount) >= 60) { changePage(Math.sign(wheelAmount)); wheelAmount = 0; pageCooldown = now + 650; }
};

const updateGroupArrow = (element: HTMLElement) => {
  const navRect = quickLinksRef.value?.getBoundingClientRect();
  if (!navRect) return;
  const groupRect = element.getBoundingClientRect();
  groupArrowX.value = Math.min(
    Math.max(groupRect.left + groupRect.width / 2 - navRect.left, 24),
    navRect.width - 24
  );
};

const updateGroupPopoverShape = async () => {
  await nextTick();
  if (quickLinkDisplayStyle.value === 'card') return;
  const rect = groupPopoverRef.value?.getBoundingClientRect();
  if (!rect) return;
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const radius = 16;
  const bodyTop = 10;
  const arrowHalfWidth = 10;
  const arrowX = Math.round(Math.min(Math.max(groupArrowX.value, 24), width - 24));
  groupPopoverClipPath.value = `path('M ${radius} ${bodyTop} H ${arrowX - arrowHalfWidth} L ${arrowX} 0 L ${arrowX + arrowHalfWidth} ${bodyTop} H ${width - radius} Q ${width} ${bodyTop} ${width} ${bodyTop + radius} V ${height - radius} Q ${width} ${height} ${width - radius} ${height} H ${radius} Q 0 ${height} 0 ${height - radius} V ${bodyTop + radius} Q 0 ${bodyTop} ${radius} ${bodyTop} Z')`;
};

const updateGroupArrowById = async (groupId: string) => {
  await nextTick();
  const group = Array.from(
    quickLinksRef.value?.querySelectorAll<HTMLElement>('[data-quick-group-id]') ?? []
  ).find((element) => element.dataset.quickGroupId === groupId);
  if (group) updateGroupArrow(group);
  await updateGroupPopoverShape();
};

const toggleGroup = async (groupId: string, event: MouseEvent) => {
  if (suppressClick.value) return;
  closeContextMenu();
  updateGroupArrow(event.currentTarget as HTMLElement);
  const isOpening = expandedGroupId.value !== groupId;
  expandedGroupId.value = isOpening ? groupId : null;
  if (isOpening) await updateGroupPopoverShape();
};

const resetDrag = () => {
  cancelGroupHover();
  draggingId.value = null;
  draggingTopKey.value = null;
  topDropTarget.value = null;
  innerDropTarget.value = null;
};

const prepareDrag = (event: DragEvent | null, value: string) => {
  closeContextMenu();
  suppressClick.value = true;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', value);
  }
};

const onTopDragStart = (key: string, link: QuickLink | undefined, event: DragEvent) => {
  if (props.readOnly) { event.preventDefault(); return; }
  if (quickLinkDisplayStyle.value === 'card') { event.preventDefault(); return; }
  expandedGroupId.value = null;
  draggingTopKey.value = key;
  draggingId.value = link?.id ?? null;
  prepareDrag(event, key);
};

const onInnerDragStart = (link: QuickLink, event: DragEvent) => {
  if (props.readOnly) { event.preventDefault(); return; }
  draggingId.value = link.id;
  draggingTopKey.value = null;
  prepareDrag(event, `link:${link.id}`);
};

const onTopNativeDragEnd = () => {
  if (quickLinkDisplayStyle.value !== 'card') finishDrag();
};

const finishDrag = () => {
  resetDrag();
  window.setTimeout(() => {
    suppressClick.value = false;
  }, 0);
};

const onLinkClick = (event: MouseEvent) => {
  if (!suppressClick.value) return;
  event.preventDefault();
  event.stopPropagation();
};

const getDropSide = (event: DragEvent): 'before' | 'after' => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
};

const topItemClasses = (key: string) => ({
  'quick-top-item--dragging': draggingTopKey.value === key,
  'quick-drag-gap-before': topDropTarget.value?.key === key
    && topDropTarget.value.side === 'before'
    && !groupDropTargetId.value,
  'quick-drag-gap-after': topDropTarget.value?.key === key
    && topDropTarget.value.side === 'after'
    && !groupDropTargetId.value,
});

function cancelGroupHover() {
  if (groupHoverTimer !== null) window.clearTimeout(groupHoverTimer);
  groupHoverTimer = null;
  groupHoverId.value = null;
  groupDropTargetId.value = null;
}

const isLinkHoveringGroup = (key: string) =>
  Boolean(draggingTopKey.value?.startsWith('link:') && key.startsWith('group:'));

const startGroupHover = (key: string) => {
  if (!isLinkHoveringGroup(key)) return cancelGroupHover();
  const groupId = key.slice('group:'.length);
  if (groupHoverId.value === groupId) return;
  cancelGroupHover();
  groupHoverId.value = groupId;
  groupHoverTimer = window.setTimeout(() => {
    if (groupHoverId.value === groupId && draggingTopKey.value?.startsWith('link:')) {
      groupDropTargetId.value = groupId;
    }
  }, 700);
};

const getDraggingGroupedLink = () => {
  const link = quickLinks.value.find((item) => item.id === draggingId.value);
  return link?.groupId ? link : null;
};

const onTopItemDragOver = (key: string, event: DragEvent) => {
  if (quickLinkDisplayStyle.value === 'card') return;
  if (!draggingTopKey.value && !getDraggingGroupedLink()) return;
  if (draggingTopKey.value === key) return;
  topDropTarget.value = { key, side: getDropSide(event) };
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const inCenter = event.clientX > bounds.left + bounds.width * .25 && event.clientX < bounds.right - bounds.width * .25;
  if (draggingTopKey.value && key.startsWith('group:') && inCenter) startGroupHover(key);
  else cancelGroupHover();
};

const saveTopLevelOrder = async (keys: string[]) => {
  const positions = new Map(keys.map((key, index) => [key, index]));
  const nextLinks = quickLinks.value.map((link) => ({
    ...link,
    ...(positions.has(`link:${link.id}`) ? { position: positions.get(`link:${link.id}`) } : {}),
  }));
  const nextGroups = quickLinkGroups.value.map((group) => ({
    ...group,
    ...(positions.has(`group:${group.id}`) ? { position: positions.get(`group:${group.id}`) } : {}),
  }));
  await Promise.all([saveQuickLinks(nextLinks), saveQuickLinkGroups(nextGroups),
    saveQuickAccessWidgets(quickAccessWidgets.value.map(widget => ({ ...widget, position: positions.get(`widget:${widget.id}`) ?? widget.position }))),
  ]);
};

let dragAnchor = { x: 0, y: 0 };
let gridDragCancelled = false;
let gridDragGeneration = 0;
const rememberDragAnchor = (event: PointerEvent) => {
  const item = (event.target as Element).closest<HTMLElement>('[data-drag-key]');
  if (!item || item.parentElement !== quickLinksRef.value) return;
  const rect = item.getBoundingClientRect();
  dragAnchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
};
const gridDrop = ref<{ col: number; row: number; cols: number; rows: number } | null>(null);
let cardSortable: Sortable | null = null;
const trackGridDrop = (event: MouseEvent | TouchEvent | PointerEvent) => {
  const key = draggingTopKey.value;
  const nav = quickLinksRef.value;
  const cell = key && cardPages.value.positions.get(key);
  if (!nav || !cell || gridDragCancelled) return;
  const point = 'touches' in event ? event.touches[0] : event;
  if (!point) return;
  const rect = nav.getBoundingClientRect();
  const css = getComputedStyle(nav);
  const gap = parseFloat(css.columnGap) || 0;
  const stepX = (rect.width + gap) / gridColumns.value;
  const stepY = parseFloat(css.gridAutoRows) + (parseFloat(css.rowGap) || 0);
  const offset = (cardPages.value.columnOffsets.get(currentPage.value) ?? 0) * stepX / 2;
  if (point.clientX < rect.left || point.clientX > rect.right || point.clientY < rect.top || point.clientY > rect.top + 7 * stepY) { gridDrop.value = null; return; }
  gridDrop.value = {
    col: Math.max(1, Math.min(gridColumns.value - cell.cols + 1, Math.round((point.clientX - dragAnchor.x - rect.left - offset) / stepX) + 1)),
    row: Math.max(1, Math.min(8 - cell.rows, Math.round((point.clientY - dragAnchor.y - rect.top) / stepY) + 1)),
    cols: cell.cols, rows: cell.rows,
  };
};
const mountCardSortable = () => {
  cardSortable?.destroy();
  cardSortable = null;
  if (props.readOnly || quickLinkDisplayStyle.value !== 'card' || !quickLinksRef.value) return;
  cardSortable = Sortable.create(quickLinksRef.value, {
    draggable: '[data-drag-key]', sort: false, forceFallback: true,
    animation: 220, delay: 180, delayOnTouchOnly: true, touchStartThreshold: 6,
    fallbackTolerance: 5, fallbackOnBody: false,
    ghostClass: 'quick-sortable-ghost', chosenClass: 'quick-sortable-chosen', dragClass: 'quick-sortable-drag',
    filter: 'input, textarea, select, iframe, .widget-open', preventOnFilter: false,
    onStart: (event: SortableEvent) => {
      gridDragGeneration++;
      gridDragCancelled = false;
      draggingTopKey.value = event.item.dataset.dragKey ?? null;
      suppressClick.value = true;
      closeContextMenu();
      const cell = draggingTopKey.value && cardPages.value.positions.get(draggingTopKey.value);
      gridDrop.value = cell ? { col: cell.col, row: cell.row, cols: cell.cols, rows: cell.rows } : null;
      document.addEventListener('pointermove', trackGridDrop, true);
      document.addEventListener('mousemove', trackGridDrop, true);
      document.addEventListener('touchmove', trackGridDrop, { passive: true, capture: true });
    },
    onEnd: async () => {
      const generation = gridDragGeneration;
      document.removeEventListener('pointermove', trackGridDrop, true);
      document.removeEventListener('mousemove', trackGridDrop, true);
      document.removeEventListener('touchmove', trackGridDrop, true);
      const key = draggingTopKey.value;
      const drop = gridDragCancelled ? null : gridDrop.value;
      gridDrop.value = null;
      resetDrag();
      if (key && drop) {
        const placements = new Map([...cardPages.value.positions].map(([id, cell]) => [id, { page: cell.page, col: cell.col, row: cell.row, columns: gridColumns.value }]));
        // Let intersecting cards auto-pack, keeping every other card in its existing cell.
        for (const [id, cell] of cardPages.value.positions) {
          if (id !== key && cell.page === currentPage.value && cell.col < drop.col + drop.cols && cell.col + cell.cols > drop.col && cell.row < drop.row + drop.rows && cell.row + cell.rows > drop.row) placements.delete(id);
        }
        placements.set(key, { page: currentPage.value, col: drop.col, row: drop.row, columns: gridColumns.value });
        try {
          await Promise.all([
            saveQuickLinks(quickLinks.value.map(item => ({ ...item, gridPlacement: placements.get(`link:${item.id}`) }))),
            saveQuickLinkGroups(quickLinkGroups.value.map(item => ({ ...item, gridPlacement: placements.get(`group:${item.id}`) }))),
            saveQuickAccessWidgets(quickAccessWidgets.value.map(item => ({ ...item, gridPlacement: placements.get(`widget:${item.id}`) }))),
          ]);
        } catch { error(t('quick.orderSaveFailed'), t('quick.retryLater')); }
      }
      window.setTimeout(() => {
        if (generation === gridDragGeneration) suppressClick.value = false;
      }, 100);
    },
  });
};

const moveTopItem = async (targetKey: string, side: 'before' | 'after') => {
  const sourceKey = draggingTopKey.value;
  if (!sourceKey) return;
  const keys = desktopKeys.value.slice();
  const sourceIndex = keys.indexOf(sourceKey);
  if (sourceIndex < 0) return resetDrag();
  keys.splice(sourceIndex, 1);
  const targetIndex = keys.indexOf(targetKey);
  if (targetKey === '__end__') keys.push(sourceKey);
  else if (targetIndex < 0) return resetDrag();
  else keys.splice(targetIndex + (side === 'after' ? 1 : 0), 0, sourceKey);
  resetDrag();
  try {
    await saveTopLevelOrder(keys);
  } catch {
    error(t('quick.orderSaveFailed'), t('quick.retryLater'));
  }
};

const onTopItemDrop = async (key: string) => {
  if (quickLinkDisplayStyle.value === 'card') return;
  if (key === `group:${groupDropTargetId.value}` && draggingId.value) {
    await moveLinkIntoGroup(groupDropTargetId.value);
    return;
  }
  const target = topDropTarget.value;
  if (getDraggingGroupedLink()) {
    await moveGroupedLinkOut(key, target?.key === key ? target.side : 'before');
    return;
  }
  await moveTopItem(key, target?.key === key ? target.side : 'before');
};

const onTopContainerDragOver = (event: DragEvent) => {
  if (quickLinkDisplayStyle.value === 'card') return;
  // Keep the last item-level target while the pointer is over the visual insertion gap.
  if (event.target === event.currentTarget && groupHoverId.value) cancelGroupHover();
  if ((draggingTopKey.value || getDraggingGroupedLink()) && event.target === event.currentTarget) {
    topDropTarget.value = { key: '__end__', side: 'after' };
  }
};

const onTopContainerDrop = async () => {
  if (quickLinkDisplayStyle.value === 'card') return;
  const target = topDropTarget.value;
  if (!target) return;
  if (getDraggingGroupedLink()) {
    await moveGroupedLinkOut(target.key, target.side);
  } else if (draggingTopKey.value) {
    await moveTopItem(target.key, target.side);
  }
};

const moveGroupedLinkOut = async (targetKey: string, side: 'before' | 'after') => {
  const source = getDraggingGroupedLink();
  if (!source) return resetDrag();

  const sourceKey = `link:${source.id}`;
  const keys = desktopKeys.value.slice();
  if (targetKey === '__end__') {
    keys.push(sourceKey);
  } else {
    const targetIndex = keys.indexOf(targetKey);
    if (targetIndex < 0) return resetDrag();
    keys.splice(targetIndex + (side === 'after' ? 1 : 0), 0, sourceKey);
  }

  const positions = new Map(keys.map((key, index) => [key, index]));
  const nextLinks = quickLinks.value.map((link) => {
    const next = { ...link };
    if (next.id === source.id) delete next.groupId;
    const position = positions.get(`link:${next.id}`);
    if (position !== undefined) next.position = position;
    return next;
  });
  const nextGroups = quickLinkGroups.value.map((group) => ({
    ...group,
    position: positions.get(`group:${group.id}`) ?? group.position,
  }));

  resetDrag();
  try {
    await Promise.all([saveQuickLinks(nextLinks), saveQuickLinkGroups(nextGroups),
    saveQuickAccessWidgets(quickAccessWidgets.value.map(widget => ({ ...widget, position: positions.get(`widget:${widget.id}`) ?? widget.position }))),
  ]);
  } catch {
    error(t('quick.leaveGroupFailed'), t('quick.retryLater'));
  }
};

const moveLinkIntoGroup = async (groupId: string) => {
  const sourceId = draggingId.value;
  if (!sourceId) return resetDrag();
  const source = quickLinks.value.find((link) => link.id === sourceId);
  if (!source || source.groupId) return resetDrag();
  const moved = { ...source, groupId };
  delete moved.position;
  const next = quickLinks.value.filter((link) => link.id !== sourceId).map((link) => ({ ...link }));
  next.push(moved);
  resetDrag();
  try {
    await saveQuickLinks(next);
    expandedGroupId.value = groupId;
    await updateGroupArrowById(groupId);
  } catch {
    error(t('quick.joinGroupFailed'), t('quick.retryLater'));
  }
};

const onInnerDragOver = (target: QuickLink, event: DragEvent) => {
  const source = quickLinks.value.find((link) => link.id === draggingId.value);
  if (!source?.groupId || source.groupId !== target.groupId || source.id === target.id) return;
  innerDropTarget.value = { id: target.id, side: getDropSide(event) };
};

const onInnerDrop = async (target: QuickLink) => {
  const source = quickLinks.value.find((link) => link.id === draggingId.value);
  const drop = innerDropTarget.value;
  if (!source?.groupId || source.groupId !== target.groupId || !drop) return resetDrag();

  const groupLinks = quickLinks.value.filter((link) => link.groupId === source.groupId);
  const sourceIndex = groupLinks.findIndex((link) => link.id === source.id);
  if (sourceIndex < 0) return resetDrag();
  const [moved] = groupLinks.splice(sourceIndex, 1);
  const targetIndex = groupLinks.findIndex((link) => link.id === target.id);
  groupLinks.splice(targetIndex + (drop.side === 'after' ? 1 : 0), 0, moved);

  const queue = [...groupLinks];
  const next = quickLinks.value.map((link) =>
    link.groupId === source.groupId ? { ...queue.shift()! } : { ...link }
  );
  resetDrag();
  try {
    await saveQuickLinks(next);
  } catch {
    error(t('quick.orderSaveFailed'), t('quick.retryLater'));
  }
};

const onInnerContainerDrop = async () => {
  const targetId = innerDropTarget.value?.id;
  if (!targetId) return resetDrag();
  const target = quickLinks.value.find((link) => link.id === targetId);
  if (!target) return resetDrag();
  await onInnerDrop(target);
};

const layoutPresets: GridSize[] = [{ cols: 1, rows: 1 }, { cols: 2, rows: 1 }, { cols: 1, rows: 2 }, { cols: 2, rows: 2 }, { cols: 4, rows: 2 }];
const availablePresets = computed(() => {
  if (contextKind.value !== 'widget') return layoutPresets;
  const w = customWidgets.value.find(w => w.id === contextMenu.value?.link.id);
  if (!w) return [];
  const options: GridSize[] = [];
  for (let rows = w.minRows ?? 1; rows <= (w.maxRows ?? 6); rows++) for (let cols = w.minCols ?? 1; cols <= (w.maxCols ?? 12); cols++) options.push({ cols, rows });
  return options;
});
const selectedGrid = computed(() => {
  const id = contextMenu.value?.link.id;
  const items = contextKind.value === 'link' ? quickLinks.value : contextKind.value === 'group' ? quickLinkGroups.value : quickAccessWidgets.value;
  return gridSize(items.find(item => item.id === id) ?? {});
});
const openCardMenu = (kind: 'group' | 'widget', id: string, label: string, event: MouseEvent) => {
  openContextMenu({ id, label, url: '' }, event);
  contextKind.value = kind;
};
const selectLayout = async (size: GridSize) => {
  if (!contextMenu.value) return;
  const { id } = contextMenu.value.link;
  await saveGridSize(contextKind.value, id, size);
  contextMenu.value = null;
};
const showLayoutMenu = computed(() => quickLinkDisplayStyle.value === 'card' && !(contextKind.value === 'link' && contextMenu.value?.link.groupId));
const contextMenuTarget = computed(() => (
  quickLinkDisplayStyle.value === 'card' && contextMenu.value?.link.groupId && groupDialogRef.value?.open
    ? groupDialogRef.value
    : 'body'
));
const openContextMenu = (link: QuickLink, event: MouseEvent) => {
  if (props.readOnly) return;
  contextKind.value = 'link';
  const menuWidth = 188;
  const insideFolder = quickLinkDisplayStyle.value === 'card' && !!link.groupId;
  const menuHeight = quickLinkDisplayStyle.value === 'card' && !insideFolder ? 350 : 220;
  if (!insideFolder) expandedGroupId.value = null;
  contextMenu.value = {
    link,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
  };
};

const closeContextMenu = () => {
  contextMenu.value = null;
};

const closeOverlays = (event?: Event) => {
  closeContextMenu();
  const target = event?.target;
  if (target instanceof Element && target.closest('[data-quick-group-id]')) return;
  expandedGroupId.value = null;
};

const visitLink = () => {
  if (!contextMenu.value) return;
  window.open(contextMenu.value.link.url, '_blank', 'noopener,noreferrer');
  closeContextMenu();
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error(t('quick.copyFailed'));
  }
};

const shareLink = async () => {
  if (!contextMenu.value) return;
  const link = contextMenu.value.link;
  try {
    await copyToClipboard(link.url);
    success(t('quick.linkCopied'), link.label);
  } catch {
    error(t('quick.copyFailed'), t('quick.clipboardDenied'));
  }
  closeContextMenu();
};

const removeContextItem = async () => {
  if (!contextMenu.value) return;
  const { id, label } = contextMenu.value.link;
  const kind = contextKind.value;
  const link = contextMenu.value.link;
  closeContextMenu();
  if (kind === 'link') { await removeLinkById(link); return; }
  try {
    if (kind === 'group') {
      // Deleting a folder keeps its shortcuts on the desktop.
      const links = quickLinks.value.map(item => {
        if (item.groupId !== id) return { ...item };
        const next = { ...item };
        delete next.groupId;
        delete next.position;
        return next;
      });
      await saveQuickLinks(links);
      await saveQuickLinkGroups(quickLinkGroups.value.filter(item => item.id !== id));
    } else {
      await saveQuickAccessWidgets(quickAccessWidgets.value.filter(item => item.id !== id));
      await removeWidgetData(id);
    }
    success(t('quick.deleted'), label);
  } catch { error(t('quick.deleteFailed'), t('quick.retryLater')); }
};

const removeLinkById = async (link: QuickLink) => {
  try {
    await saveQuickLinks(quickLinks.value.filter((item) => item.id !== link.id));
    if (link.groupId && !quickLinks.value.some((item) => item.groupId === link.groupId)) {
      expandedGroupId.value = null;
    }
    success(t('quick.removed'), link.label);
  } catch {
    error(t('quick.removeFailed'), t('quick.retryLater'));
  }
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    gridDragCancelled = true;
    gridDrop.value = null;
    closeOverlays();
  }
};

watch(
  () => expandedGroup.value?.links.length,
  () => {
    if (expandedGroup.value) void updateGroupPopoverShape();
  }
);

onMounted(() => {
  void nextTick(mountCardSortable);
  loadQuickLinks();
  loadQuickAccessWidgets();
  loadShowCardLabels();
  loadQuickLinkDisplayStyle();
  window.addEventListener('pointerdown', closeOverlays);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', closeOverlays);
  window.addEventListener('resize', updateGridColumns);
  window.addEventListener('scroll', closeOverlays, true);
});

onBeforeUnmount(() => {
  cardSortable?.destroy();
  cardSortable = null;
  document.removeEventListener('pointermove', trackGridDrop, true);
      document.removeEventListener('mousemove', trackGridDrop, true);
  document.removeEventListener('touchmove', trackGridDrop, true);
  cancelGroupHover();
  window.removeEventListener('pointerdown', closeOverlays);
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', closeOverlays);
  window.removeEventListener('resize', updateGridColumns);
  window.removeEventListener('scroll', closeOverlays, true);
});

watch([quickLinkDisplayStyle, () => props.readOnly, () => visibleTopItems.value.length, () => visibleWidgets.value.length], async () => {
  await nextTick();
  mountCardSortable();
});
</script>

<style scoped>
.quick-links {
  width: min(560px, calc(100vw - 32px));
  margin: 14px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  border-radius: 8px;
  transition: box-shadow 0.15s ease;
}

.quick-links--card {
  width: min(1080px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 160px));
  grid-auto-flow: row;
  justify-content: center;
  align-items: stretch;
  gap: 14px;
}

.quick-links--card .quick-card-size--small { grid-column: span 1; min-height: 132px; }
.quick-links--card .quick-card-size--medium { grid-column: span 2; min-height: 178px; }
.quick-links--card .quick-card-size--large { grid-column: span 3; min-height: 224px; }

.quick-links--card .quick-link-item,
.quick-links--card .quick-group-item {
  position: relative;
  width: 100%;
  max-width: none;
  min-width: 128px;
  resize: none;
  overflow: hidden;
}

.quick-links--card :deep(.quick-link-chip--card) {
  width: 100%;
  max-width: none;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 18px;
  border-color: rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.quick-links--card .quick-link-item:has(.quick-link-chip--card) :deep(.quick-link-chip--card),
.quick-links--card .quick-group-item:has(.quick-group-chip--card) .quick-group-chip--card {
  height: 100% !important;
}

.quick-links--card .quick-card-size--small :deep(.quick-link-chip--card) { height: 132px; }
.quick-links--card .quick-card-size--medium :deep(.quick-link-chip--card) { height: 178px; }
.quick-links--card .quick-card-size--large :deep(.quick-link-chip--card) { height: 224px; }

.quick-widget-card {
  position: relative;
  min-width: 0;
  resize: none;
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
}

.quick-links--card :deep(a.quick-link-chip--card:hover) {
  transform: translateY(-2px);
  border-color: rgba(15, 23, 42, 0.22);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

@media (prefers-color-scheme: dark) {
  .quick-links--card :deep(.quick-link-chip--card),
  .quick-links--card .quick-group-chip--card {
    border-color: rgba(255, 255, 255, 0.14);
    color: #f5f5f7;
    background: rgba(30, 30, 32, 0.84);
    box-shadow: 0 5px 18px rgba(0, 0, 0, 0.24);
  }

  .quick-links--card :deep(a.quick-link-chip--card:hover),
  .quick-links--card .quick-group-item--open .quick-group-chip--card {
    border-color: rgba(255, 255, 255, 0.24);
    background: rgba(48, 48, 52, 0.94);
  }

  .quick-widget-card {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(30, 30, 32, 0.88);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24);
  }
}

.quick-group-item {
  position: relative;
  max-width: 220px;
}

.quick-top-item,
.quick-group-link {
  transition: margin 0.14s ease, opacity 0.14s ease;
}

.quick-top-item--dragging,
.quick-group-link--dragging {
  opacity: 0.42;
}

.quick-drag-gap-before {
  margin-left: 32px;
}

.quick-drag-gap-after {
  margin-right: 32px;
}

.quick-group-chip {
  height: 38px;
  max-width: 220px;
  padding: 0 8px 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-radius: 999px;
  color: #374151;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  font-size: 13px;
  font-weight: 550;
  transition: transform 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.quick-links--card .quick-group-chip--card {
  width: 100%;
  max-width: none;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column-reverse;
  justify-content: center;
  gap: 9px;
  padding: 10px 8px;
  border-radius: 18px;
  border-color: rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

.quick-links--card .quick-card-size--small .quick-group-chip--card { min-height: 132px; }
.quick-links--card .quick-card-size--medium .quick-group-chip--card { min-height: 178px; }
.quick-links--card .quick-card-size--large .quick-group-chip--card { min-height: 224px; }

.quick-group-chip:hover,
.quick-group-item--open .quick-group-chip {
  border-color: rgba(15, 23, 42, 0.34);
  background: rgba(255, 255, 255, 0.94);
  transform: translateY(-1px);
}

.quick-group-item--drag-over .quick-group-chip {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}

.quick-group-item--accept .quick-group-chip {
  border-color: #2563eb;
  background: rgba(239, 246, 255, 0.9);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

.quick-group-chip-label {
  min-width: 0;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-links--card .quick-group-chip-label {
  max-width: 100%;
  flex-shrink: 0;
}

.quick-group-icons {
  height: 26px;
  display: flex;
  align-items: center;
  padding-left: 6px;
  flex-shrink: 0;
}

.quick-group-drop-hint {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  color: #2563eb;
  font-size: 10px;
  font-weight: 650;
  white-space: nowrap;
}

.quick-group-drop-hint svg {
  font-size: 14px;
}

.quick-group-icon {
  width: 24px;
  height: 24px;
  margin-left: -7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
}

.quick-group-popover {
  position: relative;
  width: 100%;
  margin-top: 4px;
  padding: 22px 12px 12px;
  flex-basis: 100%;
  box-sizing: border-box;
  border: 0;
  border-radius: 0;
  color: #374151;
  background: rgba(255, 255, 255, 0.58);
  filter: drop-shadow(0 1px 1px rgba(15, 23, 42, 0.12)) drop-shadow(0 12px 24px rgba(15, 23, 42, 0.14));
  backdrop-filter: blur(20px) saturate(1.28);
  -webkit-backdrop-filter: blur(20px) saturate(1.28);
}

.quick-group-dialog {
  position: fixed;
  inset: 0;
  width: min(760px, calc(100vw - 48px));
  max-width: calc(100vw - 48px);
  max-height: min(80dvh, 720px);
  margin: auto;
  padding: 12px 28px 28px;
  border: 0;
  border-radius: 28px;
  overflow: auto;
  color: #1d1d1f;
  background: rgba(245, 245, 247, 0.97);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
}

.quick-group-dialog::backdrop {
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.quick-group-dialog header {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  min-height: 44px;
  margin-bottom: 12px;
}

.quick-group-dialog h2 {
  grid-column: 2;
  margin: 0;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}

.quick-group-dialog-title--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.quick-group-dialog-close {
  grid-column: 3;
  justify-self: end;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.quick-group-dialog-close svg {
  width: 16px;
  height: 16px;
  display: block;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  fill: none;
}

.quick-group-dialog-close:hover {
  background: rgba(60, 60, 67, 0.08);
}

.quick-group-dialog-list {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px 12px;
}

.quick-group-dialog .quick-group-link {
  width: 96px;
  max-width: 96px;
  min-width: 96px;
  flex: 0 0 96px;
}

.quick-group-dialog :deep(.quick-group-app) {
  width: 96px;
  max-width: 96px;
  height: auto;
  padding: 0;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  color: #3a3a3c;
  font-size: 11px;
  font-weight: 400;
  text-align: center;
}

.quick-group-dialog :deep(a.quick-group-app:hover) {
  transform: none;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.quick-group-dialog :deep(.quick-group-app .favicon-img-root) {
  width: 56px !important;
  height: 56px !important;
  max-width: none;
  max-height: none;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 16px rgba(15, 23, 42, 0.1);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.quick-group-dialog :deep(a.quick-group-app:hover .favicon-img-root) {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08), 0 10px 20px rgba(15, 23, 42, 0.16);
}

.quick-group-dialog :deep(.quick-group-app .favicon-img),
.quick-group-dialog :deep(.quick-group-app .favicon-fallback) {
  width: 56px !important;
  height: 56px !important;
  border-radius: 16px !important;
  object-fit: contain;
}

.quick-group-dialog :deep(.quick-group-app .quick-link-label) {
  display: -webkit-box;
  width: 100%;
  max-height: 2.5em;
  overflow: hidden;
  white-space: normal;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.25;
  font-size: 11px;
  font-weight: 450;
  color: #3a3a3c;
}

@media (prefers-color-scheme: dark) {
  .quick-group-dialog {
    color: #f5f5f7;
    background: rgba(44, 44, 46, 0.97);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  }

  .quick-group-dialog-close:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .quick-group-dialog :deep(.quick-group-app),
  .quick-group-dialog :deep(.quick-group-app .quick-link-label) {
    color: #f5f5f7;
  }

  .quick-group-dialog :deep(.quick-group-app .favicon-img-root) {
    background: #2c2c2e;
  }
}

.quick-group-popover-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-group-link {
  position: relative;
  max-width: 180px;
}

.quick-group-link-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 2;
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

.quick-group-link:hover .quick-group-link-remove,
.quick-group-link-remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.quick-group-link-remove:hover,
.quick-group-link-remove:focus-visible {
  background: #b91c1c;
}

.quick-link-draggable {
  cursor: grab;
}

.quick-link-item {
  position: relative;
  max-width: 180px;
}

.quick-link-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 2;
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

.quick-link-item:hover .quick-link-remove,
.quick-link-remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.quick-link-remove:hover,
.quick-link-remove:focus-visible {
  background: #b91c1c;
}

.quick-link-draggable:active {
  cursor: grabbing;
}

.quick-link-draggable--dragging {
  opacity: 0.42;
}

.quick-link-draggable--drag-over {
  transform: translateY(-2px);
}

.quick-link-draggable--drag-over :deep(.quick-link-chip) {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.16);
}

.quick-context-menu {
  position: fixed;
  z-index: 1200;
  width: 188px;
  padding: 6px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  color: #374151;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.quick-context-title {
  height: 34px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
}

.quick-context-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-context-menu button {
  width: 100%;
  height: 34px;
  padding: 0 9px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}

.quick-context-menu button:hover {
  background: rgba(15, 23, 42, 0.06);
}

.quick-context-menu button svg {
  flex-shrink: 0;
  font-size: 17px;
}

.quick-context-divider {
  height: 1px;
  margin: 5px 4px;
  background: rgba(15, 23, 42, 0.08);
}

.quick-context-menu .quick-context-remove {
  color: #dc2626;
}

.quick-context-menu .quick-context-remove:hover {
  background: rgba(220, 38, 38, 0.08);
}

.quick-menu-enter-active,
.quick-menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.quick-menu-enter-from,
.quick-menu-leave-to {
  opacity: 0;
  transform: translateY(-3px) scale(0.98);
}

@media (max-width: 760px) {
  .quick-links--card {
    grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
    justify-content: center;
    gap: 10px;
  }

  .quick-links--card .quick-card-size--small { min-height: 124px; }
  .quick-links--card .quick-card-size--medium { grid-column: span 2; min-height: 160px; }
  .quick-links--card .quick-card-size--large { grid-column: span 4; min-height: 180px; }

  .quick-links--card .quick-card-size--small :deep(.quick-link-chip--card) { height: 124px; }
  .quick-links--card .quick-card-size--medium :deep(.quick-link-chip--card) { height: 160px; }
  .quick-links--card .quick-card-size--large :deep(.quick-link-chip--card) { height: 180px; }

  .quick-links--card .quick-card-size--small .quick-group-chip--card { min-height: 124px; }
  .quick-links--card .quick-card-size--medium .quick-group-chip--card { min-height: 160px; }
  .quick-links--card .quick-card-size--large .quick-group-chip--card { min-height: 180px; }
}

@media (max-width: 480px) {
  .quick-links {
    justify-content: flex-start;
  }

  .quick-links--card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: center;
    gap: 10px;
  }

  .quick-links--card .quick-card-size--small { min-height: 116px; }
  .quick-links--card .quick-card-size--medium,
  .quick-links--card .quick-card-size--large { grid-column: span 2; min-height: 156px; }

  .quick-links--card .quick-card-size--small :deep(.quick-link-chip--card) { height: 116px; border-radius: 15px; }
  .quick-links--card .quick-card-size--medium :deep(.quick-link-chip--card),
  .quick-links--card .quick-card-size--large :deep(.quick-link-chip--card) { height: 156px; border-radius: 15px; }

  .quick-links--card .quick-card-size--small .quick-group-chip--card { min-height: 116px; border-radius: 15px; }
  .quick-links--card .quick-card-size--medium .quick-group-chip--card,
  .quick-links--card .quick-card-size--large .quick-group-chip--card { min-height: 156px; border-radius: 15px; }

  :deep(.quick-link-chip:not(.quick-link-chip--card)) {
    flex-shrink: 0;
    max-width: min(180px, calc(100vw - 92px));
  }
}

@media (prefers-color-scheme: dark) {
  .quick-group-chip {
    color: #e5e7eb;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(24, 24, 27, 0.68);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  }

  .quick-group-chip:hover,
  .quick-group-item--open .quick-group-chip {
    border-color: rgba(255, 255, 255, 0.38);
    background: rgba(39, 39, 42, 0.86);
  }

  .quick-group-item--accept .quick-group-chip {
    border-color: #60a5fa;
    background: rgba(30, 58, 138, 0.48);
  }

  .quick-group-drop-hint {
    color: #93c5fd;
  }

  .quick-group-icon {
    border-color: rgba(63, 63, 70, 0.96);
    background: #27272a;
  }

  .quick-group-popover {
    color: #e5e7eb;
    background: rgba(24, 24, 27, 0.62);
    filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.08)) drop-shadow(0 14px 28px rgba(0, 0, 0, 0.36));
  }

  .quick-context-menu {
    color: #e5e7eb;
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(39, 39, 42, 0.98);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.42);
  }

  .quick-context-title {
    color: #a1a1aa;
  }

  .quick-context-menu button:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  .quick-context-divider {
    background: rgba(255, 255, 255, 0.08);
  }
}

/* Integer grid spans are shared by shortcuts, folders and widgets. */
.quick-links--card {
  --grid-columns: 12;
  /* Half-column tracks center sparse pages without changing card dimensions. */
  grid-template-columns: repeat(calc(var(--grid-columns) * 2), minmax(0, 1fr));
  grid-auto-rows: 80px;
  gap: 14px;
  align-items: stretch;
}
.quick-links--card > .quick-top-item,
.quick-links--card > .quick-widget-card {
  grid-column: span min(var(--card-cols, 1), var(--grid-columns));
  grid-row: span var(--card-rows, 1);
  min-width: 0;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}
.quick-links--card > .quick-top-item :deep(.quick-link-chip--card),
.quick-links--card > .quick-top-item .quick-group-chip--card { min-height: 0; height: 100%; }
.quick-links--card > .quick-widget-card > :first-child { min-height: 0; height: 100%; overflow: hidden; }
@media (max-width: 900px) { .quick-links--card { --grid-columns: 6; grid-auto-rows: 76px; } }
@media (max-width: 480px) { .quick-links--card { --grid-columns: 4; grid-auto-rows: 68px; gap: 10px; } }


.quick-links--card .quick-link-draggable { cursor: pointer; }
.quick-links--card :deep(.quick-link-chip--card) { border-radius: 14px; }

.quick-links--card :deep(.quick-link-chip--card),
.quick-links--card :deep(a.quick-link-chip--card:hover) {
  background: var(--logo-surface, #fff);
  color: var(--logo-text, #1d1d1f);
  border-color: transparent;
  backdrop-filter: none;
}
.quick-links--card :deep(.quick-link-chip--card .favicon-img-root) { width: 70% !important; height: 70% !important; max-width: 160px; max-height: 160px; min-height: 0; }
.quick-links--card :deep(.quick-link-chip--card .favicon-img) { width: 100%; height: 100%; object-fit: contain; border-radius: 0 !important; }

.card-layout-menu { padding: 8px 10px; }
.card-layout-heading { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; font-size: 13px; }
.card-layout-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.quick-context-menu .card-layout-options button { display: block; padding: 6px 8px; text-align: center; border-radius: 999px; background: rgba(128,128,128,.14); font-size: 12px; }
.quick-context-menu .card-layout-options button[aria-pressed="true"] { background: #007aff; color: white; }

/* Apple Store store-home.css: rf-productnav-card-content / rf-ccard-content.
   https://www.apple.com/store — values retrieved 2026-11-09.
   Hover contrast is increased for photographic wallpapers; no positional motion. */
.quick-links--card {
  --card-shadow: 2px 4px 12px #00000014;
  --card-hover-shadow: 0 0 0 1px #ffffff59, 0 4px 10px #00000033, 0 14px 28px #00000052;
}
.quick-links--card > .quick-top-item { overflow: visible; border-radius: 18px; }
.quick-links--card > .quick-top-item:hover { z-index: 2; }
.quick-links--card :deep(.quick-link-chip--card),
.quick-links--card .quick-top-item .quick-group-chip--card {
  border-radius: 18px;
  box-shadow: var(--card-shadow);
  transition: box-shadow .18s cubic-bezier(0,0,.5,1);
}
.quick-links--card > .quick-widget-card { border-radius: 28px; box-shadow: var(--card-shadow); transition: box-shadow .3s cubic-bezier(0,0,.5,1); }
.quick-links--card :deep(a.quick-link-chip--card:hover),
.quick-links--card .quick-top-item .quick-group-chip--card:hover,
.quick-links--card > .quick-widget-card:hover { transform: none; box-shadow: var(--card-hover-shadow); }
@media (prefers-color-scheme: dark) {
  .quick-links--card {
    --card-hover-shadow: 0 0 0 1px #ffffff73, 0 4px 12px #00000066, 0 16px 32px #00000080;
  }
}
/* Size from the card's shorter dimension, with space reserved for its label. */
.quick-links--card :deep(.quick-link-chip--card) { container-type: size; }
.quick-links--card :deep(.quick-link-chip--card .favicon-img-root) {
  width: min(64cqw, 68cqh, 144px) !important;
  height: min(64cqw, 68cqh, 144px) !important;
  max-width: var(--icon-native-width, 44px);
  max-height: var(--icon-native-height, 44px);
}
.quick-links--card :deep(.quick-link-chip--card:has(.quick-link-label) .favicon-img-root) {
  width: min(64cqw, calc(100cqh - 28px), 128px) !important;
  height: min(64cqw, calc(100cqh - 28px), 128px) !important;
}
@media (prefers-reduced-motion: reduce) {
  .quick-links--card :deep(.quick-link-chip--card), .quick-links--card .quick-group-chip--card, .quick-links--card > .quick-widget-card { transition: none; }
}

/* Keep reading order identical to the stored desktop order. */
.quick-links--card > .quick-top-item,
.quick-links--card > .quick-widget-card { position: relative; cursor: grab; }
.quick-links--card > .quick-top-item,
.quick-links--card > .quick-widget-card { touch-action: none; user-select: none; }
.quick-links--card > .quick-top-item,
.quick-links--card > .quick-widget-card { transition: grid-column .18s cubic-bezier(.2,.8,.2,1), grid-row .18s cubic-bezier(.2,.8,.2,1), opacity .18s ease, filter .18s ease; }
.quick-links--card > .quick-top-item:active,
.quick-links--card > .quick-widget-card:active { cursor: grabbing; }
.quick-links--card > .quick-top-item--dragging { opacity: .35; transform: none; }
.quick-links--card > .quick-drag-gap-before,
.quick-links--card > .quick-drag-gap-after { transform: none; outline: 2px solid #007aff; outline-offset: 4px; }
.quick-links--card > .quick-drag-gap-before::before,
.quick-links--card > .quick-drag-gap-after::after { content: ''; position: absolute; top: 6px; bottom: 6px; width: 3px; border-radius: 3px; background: #007aff; pointer-events: none; }
.quick-links--card > .quick-drag-gap-before::before { left: -8px; }
.quick-links--card > .quick-drag-gap-after::after { right: -8px; }

.quick-sortable-ghost { opacity: .32; filter: saturate(.75); outline: 1px dashed rgba(0, 122, 255, .5); outline-offset: 2px; }
.quick-sortable-chosen { z-index: 4; cursor: grabbing !important; }
.quick-sortable-drag { opacity: 1 !important; cursor: grabbing !important; filter: drop-shadow(0 18px 28px rgba(0,0,0,.24)); }

.card-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 20px auto; width: fit-content; padding: 6px; border: 1px solid #ffffff40; border-radius: 999px; background: rgba(245,245,247,.92); color: #1d1d1f; box-shadow: 2px 4px 12px #00000014; font-size: 13px; font-variant-numeric: tabular-nums; }
.card-pagination button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; }
.card-pagination button:hover:not(:disabled) { background: #0000000a; }
.card-pagination button:disabled { opacity: .3; cursor: default; }
.card-pagination button:focus-visible { outline: 2px solid #007aff; }
.quick-links--readonly > .quick-top-item, .quick-links--readonly > .quick-top-item:active { cursor: pointer; }

.widget-open { position: absolute; inset: 0; border: 0; background: transparent; cursor: pointer; }
.widget-drag {
  position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 8px;
  display: grid; place-items: center; font-size: 14px; line-height: 1;
  background: rgba(255, 255, 255, 0.72); color: #3c3c43; cursor: grab;
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  opacity: 0; transform: scale(0.9); pointer-events: none;
  transition: opacity .18s ease, transform .18s ease;
}
.quick-widget-card:hover > .widget-drag,
.quick-widget-card:focus-within > .widget-drag,
.quick-widget-card > .widget-drag:focus-visible { opacity: 1; transform: scale(1); pointer-events: auto; }
.widget-drag:active { cursor: grabbing; }
.widget-drag:focus-visible { outline: 2px solid #007aff; outline-offset: 1px; }
@media (hover: none) { .widget-drag { opacity: 0.85; transform: none; pointer-events: auto; } }
@media (prefers-color-scheme: dark) {
  .widget-drag { background: rgba(60, 60, 67, 0.72); color: #f3f4f6; }
}
@media (prefers-reduced-motion: reduce) { .widget-drag { transition: none; } }
.card-layout-options { max-height: 220px; overflow-y: auto; }
/* Keep each brand tint while allowing the wallpaper to show through. */
.quick-links--glass.quick-links--card :deep(.quick-link-chip--card),
.quick-links--glass.quick-links--card :deep(a.quick-link-chip--card:hover) {
  background: color-mix(in srgb, var(--logo-surface, #fff) 65%, transparent);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border: 1px solid rgba(255,255,255,.32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.24), 0 6px 22px rgba(0,0,0,.12);
}
.quick-links--glass.quick-links--card .quick-group-chip--card,
.quick-links--glass.quick-links--card > .quick-widget-card {
  background: rgba(255,255,255,.65);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border: 1px solid rgba(255,255,255,.38);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 6px 22px rgba(0,0,0,.12);
}
@media (prefers-color-scheme: dark) {
  .quick-links--card .quick-group-chip--card,
  .quick-links--card .quick-group-chip--card:hover,
  .quick-links--card .quick-group-item--open .quick-group-chip--card {
    border-color: rgba(255, 255, 255, 0.14);
    color: #f5f5f7;
    background: #2c2c2e;
  }
  .quick-links--card > .quick-widget-card { background: #2c2c2e; }
  .quick-links--glass.quick-links--card .quick-group-chip--card,
  .quick-links--glass.quick-links--card > .quick-widget-card { background: rgba(28,28,30,.65); }
  .quick-links--glass.quick-links--card :deep(.quick-link-chip--card),
  .quick-links--glass.quick-links--card :deep(a.quick-link-chip--card:hover) {
    background: color-mix(in srgb, var(--logo-surface, #2c2c2e) 30%, rgba(28, 28, 30, 0.62));
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 6px 22px rgba(0, 0, 0, 0.28);
  }
  .quick-links--glass.quick-links--card .quick-group-chip--card,
  .quick-links--glass.quick-links--card > .quick-widget-card {
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 6px 22px rgba(0, 0, 0, 0.28);
  }
}
</style>

<style scoped>
.quick-links--grid-dragging :deep(iframe) { pointer-events: none !important; }
.widget-drag { touch-action: none; user-select: none; }
.quick-grid-drop { pointer-events: none; z-index: 5; border: 2px solid #64a8ff; border-radius: 18px; background: #007aff26; box-shadow: 0 0 0 4px #007aff12; }
</style>
