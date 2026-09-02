<template>
  <div class="tutorial settings-page">
    <p class="lead">
      新标签页搜索框与 <kbd class="settings-kbd">Alt</kbd>+<kbd class="settings-kbd">S</kbd> 全局浮层共用同一套前缀命令。
    </p>

    <section class="block">
      <h3 class="block-title">命令</h3>
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
      <h3 class="block-title">快捷键</h3>
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
          登录或注册
          <a href="https://wallhaven.cc/login" target="_blank" rel="noopener noreferrer">Wallhaven</a>
          账户。
        </li>
        <li>
          打开
          <a href="https://wallhaven.cc/settings/account" target="_blank" rel="noopener noreferrer">账户设置</a>，
          在 API Key 区域生成或复制密钥。
        </li>
        <li>进入「背景 → 壁纸源」，选择 Wallhaven，点击设置图标后粘贴 API Key。</li>
        <li>需要成人内容时，先确保 Wallhaven 账户允许浏览 NSFW，再打开「允许 NSFW 内容」。</li>
      </ol>
    </section>

    <section class="block">
      <h3 class="block-title">提示</h3>
      <ul class="tips">
        <li v-for="tip in tips" :key="tip">{{ tip }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const commands = [
  { key: 'bd', arg: '关键词', desc: '百度搜索', ex: 'bd Vue' },
  { key: 'gg', arg: '关键词', desc: 'Google 搜索', ex: 'gg docs' },
  { key: 'cd', arg: '', desc: '切换默认引擎', ex: 'cd → ↑↓ → Enter' },
  { key: '*', arg: '关键词', desc: '搜索收藏夹', ex: '*GitHub' },
  { key: '!', arg: '关键词', desc: '强制使用默认引擎', ex: '!github' },
  { key: '/new', arg: '', desc: '打开新标签页', ex: '/new' },
  { key: '/tN', arg: '', desc: '切换到第 N 个标签页', ex: '/t1' },
  { key: '/t', arg: '关键词', desc: '搜索已打开标签页', ex: '/t deep' },
]

const shortcuts = [
  { keys: ['↑', '↓'], desc: '在列表中移动' },
  { keys: ['Enter'], desc: '确认选中项' },
  { keys: ['→'], desc: '用建议填充输入框' },
  { keys: ['Esc'], desc: '关闭下拉或浮层' },
]

const tips = [
  '直接输入内容时，使用当前默认搜索引擎。',
  '输入 ! 可强制走默认引擎，例如 !github 不会把 github 当成引擎缩写。',
  '/new、/t1、/t 关键词 可在新标签页与 Alt+S 浮层中使用；/t 列表支持 ↑↓ 与 Enter。',
  '引擎可在「搜索引擎」设置中添加或自定义。',
  '壁纸、时钟、颜色在对应设置页调整。',
]
</script>

<style scoped>
.tutorial {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 520px;
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
</style>
