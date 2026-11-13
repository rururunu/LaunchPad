<template>
  <div class="settings-page transfer-page">
    <input ref="fileInput" class="file-input" type="file" accept="application/json,.json" @change="selectFile" />

    <div class="transfer-shell">
      <button
        type="button"
        class="transfer-card transfer-card--export"
        :disabled="isExporting"
        @click="exportSettings"
      >
        <span class="transfer-card-icon">
          <Icon icon="fluent:arrow-download-24-regular" />
        </span>
        <span class="transfer-card-text">
          <strong>{{ isExporting ? t('transfer.exporting') : t('transfer.export') }}</strong>
          <span>{{ t('transfer.saveJson') }}</span>
        </span>
      </button>

      <button
        type="button"
        class="transfer-card transfer-card--import"
        :class="{ 'is-dragging': isDragging }"
        :disabled="isImporting"
        @click="fileInput?.click()"
        @dragenter.prevent="isDragging = true"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="selectDroppedFile"
      >
        <span class="transfer-card-icon">
          <Icon icon="fluent:arrow-upload-24-regular" />
        </span>
        <span class="transfer-card-text">
          <strong>{{ t('transfer.import') }}</strong>
          <span>{{ pendingConfig ? selectedFileName : t('transfer.chooseJson') }}</span>
        </span>
      </button>

      <div v-if="pendingConfig" class="upload-card">
        <div class="upload-file">
          <span class="upload-icon">
            <Icon icon="fluent:document-one-page-24-regular" />
          </span>
          <span class="upload-name">{{ selectedFileName }}</span>
        </div>
        <div class="upload-actions">
          <button type="button" class="settings-btn settings-btn--ghost transfer-btn" :disabled="isImporting" @click="clearSelection">
            {{ t('transfer.cancel') }}
          </button>
          <button type="button" class="settings-btn settings-btn--primary transfer-btn" :disabled="isImporting" @click="confirmImport">
            <Icon icon="fluent:checkmark-20-regular" />
            {{ isImporting ? t('transfer.importing') : t('transfer.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useNotification } from '@/composables/useNotification'
import { useI18n } from '@/i18n'
import {
  createConfigExport,
  importConfig,
  parseConfigFile,
  type ConfigFile,
} from '@/utils/configTransfer'

const { success, error } = useNotification()
const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const pendingConfig = ref<ConfigFile | null>(null)
const isExporting = ref(false)
const isImporting = ref(false)
const isDragging = ref(false)

const exportSettings = async () => {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const config = await createConfigExport()
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `LaunchPad-config-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    success(t('transfer.exportDone'), t('transfer.exportDoneDetail'))
  } catch (reason) {
    error(t('transfer.exportFailed'), reason instanceof Error ? reason.message : String(reason))
  } finally {
    isExporting.value = false
  }
}

const selectFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  await prepareImportFile(file)
}

const selectDroppedFile = async (event: DragEvent) => {
  isDragging.value = false
  await prepareImportFile(event.dataTransfer?.files?.[0])
}

const prepareImportFile = async (file: File | undefined) => {
  pendingConfig.value = null
  selectedFileName.value = ''
  if (!file) return

  try {
    const config = parseConfigFile(await file.text())
    pendingConfig.value = config
    selectedFileName.value = file.name
  } catch (reason) {
    error(t('transfer.cannotImport'), reason instanceof Error ? reason.message : String(reason))
    if (fileInput.value) fileInput.value.value = ''
  }
}

const clearSelection = () => {
  pendingConfig.value = null
  selectedFileName.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const confirmImport = async () => {
  if (!pendingConfig.value || isImporting.value) return
  isImporting.value = true
  try {
    await importConfig(pendingConfig.value)
    success(t('transfer.importDone'), t('transfer.importDoneDetail'))
    clearSelection()
  } catch (reason) {
    error(t('transfer.importFailed'), reason instanceof Error ? reason.message : String(reason))
  } finally {
    isImporting.value = false
  }
}
</script>

<style scoped>
.transfer-page {
  justify-content: flex-start;
  align-items: stretch;
}

.transfer-shell {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}

.transfer-card {
  min-width: 0;
  min-height: 64px;
  padding: 12px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 0;
  color: var(--ui-text);
  background: transparent;
  box-shadow: none;
  cursor: pointer;
}

.transfer-card + .transfer-card,
.transfer-shell .upload-card {
  box-shadow: inset 0 1px 0 rgba(60, 60, 67, 0.16);
}

.transfer-card:hover,
.transfer-card.is-dragging {
  background: rgba(0, 122, 255, 0.06);
}

.transfer-card:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.transfer-card--import {
  border-style: none;
}

.transfer-card-icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
}

.transfer-card--import .transfer-card-icon {
  color: #059669;
  background: rgba(5, 150, 105, 0.1);
}

.transfer-card-icon svg {
  width: 22px;
  height: 22px;
}

.transfer-card-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.transfer-card-text strong,
.transfer-card-text span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transfer-card-text strong {
  font-size: 14px;
  font-weight: 650;
}

.transfer-card-text span {
  color: var(--ui-text-muted);
  font-size: 11px;
}

.upload-card {
  grid-column: 1 / -1;
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  background: var(--ui-surface);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.07);
}

.upload-file {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.upload-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--ui-accent);
  background: var(--ui-accent-soft);
}

.upload-icon svg {
  width: 17px;
  height: 17px;
}

.upload-name {
  min-width: 0;
  overflow: hidden;
  color: var(--ui-text);
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.transfer-btn {
  min-width: 98px;
}

.file-input {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .transfer-shell { background: #2c2c2e; }
  .transfer-card + .transfer-card,
  .transfer-shell .upload-card { box-shadow: inset 0 1px 0 rgba(84, 84, 88, 0.65); }
  .transfer-card--import .transfer-card-icon {
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
  }
}

@media (max-width: 520px) {
  .transfer-shell {
    grid-template-columns: 1fr;
  }

  .upload-card,
  .upload-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .transfer-btn {
    width: 100%;
  }
}
</style>
