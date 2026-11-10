<template>
  <div class="tutorial settings-page">
    <p class="lead">{{ t('guide.intro') }}</p>

    <section class="block">
      <h3 class="block-title">{{ t('guide.commands') }}</h3>
      <div class="rows">
        <div v-for="cmd in commands" :key="cmd.key" class="row">
          <div class="row-keys">
            <kbd class="settings-kbd">{{ cmd.key }}</kbd>
            <span class="row-arg">{{ cmd.arg }}</span>
          </div>
          <div class="row-body">
            <span class="row-desc">{{ cmd.desc }}</span>
            <span class="row-ex">{{ cmd.ex }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">{{ t('guide.shortcuts') }}</h3>
      <div class="rows">
        <div v-for="s in shortcuts" :key="s.keys.join('+')" class="row">
          <div class="row-keys row-keys--wide">
            <kbd v-for="k in s.keys" :key="k" class="settings-kbd">{{ k }}</kbd>
          </div>
          <span class="row-desc">{{ s.desc }}</span>
        </div>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">Wallhaven API Key</h3>
      <ol class="guide-steps">
        <li>
          {{ t('guide.wallhavenLogin') }}
          <a href="https://wallhaven.cc/login" target="_blank" rel="noopener noreferrer">Wallhaven</a>
          {{ t('guide.wallhavenAccount') }}
        </li>
        <li>
          {{ t('guide.wallhavenOpen') }}
          <a href="https://wallhaven.cc/settings/account" target="_blank" rel="noopener noreferrer">{{ t('guide.wallhavenSettings') }}</a>{{ t('guide.wallhavenCopy') }}
        </li>
        <li>{{ t('guide.wallhavenPaste') }}</li>
        <li>{{ t('guide.wallhavenNsfw') }}</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">{{ t('guide.tips') }}</h3>
      <ul class="tips">
        <li v-for="tip in tips" :key="tip">{{ tip }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const commands = computed(() => [
  { key: 'bd', arg: t('guide.keyword'), desc: t('guide.commandsList.bd'), ex: 'bd Vue' },
  { key: 'gg', arg: t('guide.keyword'), desc: t('guide.commandsList.gg'), ex: 'gg docs' },
  { key: 'cd', arg: '', desc: t('guide.commandsList.cd'), ex: 'cd → ↑↓ → Enter' },
  { key: '*', arg: t('guide.keyword'), desc: t('guide.commandsList.star'), ex: '*GitHub' },
  { key: '!', arg: t('guide.keyword'), desc: t('guide.commandsList.bang'), ex: '!github' },
  { key: '/new', arg: '', desc: t('guide.commandsList.new'), ex: '/new' },
  { key: '/tN', arg: '', desc: t('guide.commandsList.tabN'), ex: '/t1' },
  { key: '/t', arg: t('guide.keyword'), desc: t('guide.commandsList.tab'), ex: '/t deep' },
])

const shortcuts = computed(() => [
  { keys: ['↑', '↓'], desc: t('guide.keys.move') },
  { keys: ['Enter'], desc: t('guide.keys.confirm') },
  { keys: ['→'], desc: t('guide.keys.fill') },
  { keys: ['Esc'], desc: t('guide.keys.close') },
])

const tips = computed(() => [
  t('guide.tipDefault'),
  t('guide.tipBang'),
  t('guide.tipCommands'),
  t('guide.tipEngines'),
  t('guide.tipWallpaper'),
])
</script>

<style scoped>
.tutorial {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
}

.lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ui-text-muted);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.rows {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--ui-border);
}

.row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 11px 0;
  border-bottom: 1px solid var(--ui-border);
}

.row-keys {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-width: 96px;
}

.row-keys--wide {
  min-width: 96px;
  flex-wrap: wrap;
}

.row-arg {
  font-size: 11px;
  color: var(--ui-text-muted);
  opacity: 0.8;
}

.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-desc {
  font-size: 13px;
  color: var(--ui-text);
  line-height: 1.4;
}

.row-ex {
  overflow-wrap: anywhere;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--ui-text-muted);
}

.tips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guide-steps {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  color: var(--ui-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.guide-steps a {
  color: var(--ui-accent);
  text-decoration: none;
}

.guide-steps a:hover {
  text-decoration: underline;
}

.tips li {
  position: relative;
  padding-left: 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ui-text-secondary);
}

.tips li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ui-text-muted);
  opacity: 0.55;
}

@media (max-width: 420px) {
  .row { gap: 12px; }
  .row-keys { min-width: 76px; flex-wrap: wrap; }
}
</style>
