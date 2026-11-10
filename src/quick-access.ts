import { createApp, h } from 'vue';
import { initI18n } from '@/i18n';
import { useQuickLinks } from './composables/useQuickLinks';
import { storage } from './utils/storage';
import QuickLinks from './components/ui/QuickLinks.vue';
import './style.css';
import './styles/settings.css';
const state = useQuickLinks();
async function syncMode() {
  const mode = await storage.get('quickLinkDisplayStyle');
  state.quickLinkDisplayStyle.value = mode === 'card' ? 'card' : 'pill';
}
async function start() {
  await Promise.all([initI18n(), state.loadQuickLinks(), state.loadQuickLinkDisplayStyle(), state.loadShowCardLabels()]);
  createApp({ render: () => h(QuickLinks, { readOnly: true }) }).mount('#app');
}
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === window.parent && event.data?.source === 'lp-overlay' && event.data.type === 'sync-quick-access') void syncMode();
});
void start();
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') window.parent.postMessage({ source: 'lp-quick-access', type: 'close' }, location.origin);
});
document.addEventListener('click', event => {
  if ((event.target as HTMLElement).closest('a[href]')) window.parent.postMessage({ source: 'lp-quick-access', type: 'close' }, location.origin);
});
