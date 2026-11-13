import '@/composables/useAppearance';
import { createApp } from 'vue';
import OverlaySearch from './components/modes/OverlaySearch.vue';
import { initI18n } from '@/i18n';
import './style.css';
import './styles/settings.css';
import './styles/search-dropdown.css';
void initI18n().then(() => {
  createApp(OverlaySearch).mount('#app');
});
