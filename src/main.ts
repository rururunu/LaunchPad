import '@/composables/useAppearance';
import { createApp } from 'vue'
import './style.css'
import './styles/settings.css'
import './styles/search-dropdown.css'
import App from './App.vue'
import { initI18n } from '@/i18n'

import { useQuickLinks } from '@/composables/useQuickLinks'
import { useWallpaper } from '@/composables/useWallpaper'
import { hydrateFaviconCache } from '@/utils/iconCache'
import { warmClockFonts } from '@/utils/clockFonts'

async function bootstrap() {
  const links = useQuickLinks()
  const appearance = useWallpaper()
  await Promise.allSettled([
    initI18n(), appearance.loadState(), hydrateFaviconCache(),
    links.loadQuickLinks(), links.loadQuickLinkDisplayStyle(),
    links.loadQuickAccessWidgets(), links.loadShowCardLabels(),
  ])
  // Bound font waiting: an unreachable font host must never block the new tab.
  await Promise.race([
    warmClockFonts([appearance.clockFont.value, appearance.pageFont.value]),
    new Promise(resolve => setTimeout(resolve, 600)),
  ])
  const create = createApp(App)
  const globalSearchContainer = document.createElement('div')
  globalSearchContainer.id = 'global-search-container'
  document.body.appendChild(globalSearchContainer)
  create.mount('#app')
}
void bootstrap()
