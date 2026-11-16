import '@/composables/useAppearance';
import { createApp } from 'vue'
import './style.css'
import './styles/settings.css'
import './styles/search-dropdown.css'
import App from './App.vue'
import { initI18n } from '@/i18n'

import { useQuickLinks } from '@/composables/useQuickLinks'
import { useWallpaper } from '@/composables/useWallpaper'

const app = createApp(App)
const globalSearchContainer = document.createElement('div')
globalSearchContainer.id = 'global-search-container'
document.body.appendChild(globalSearchContainer)
app.mount('#app')

// Storage, fonts and icons continue after the first paint. None of them may hold the new tab blank.
void initI18n()
void useWallpaper().loadState()
const links = useQuickLinks()
void links.loadQuickLinks()
void links.loadQuickLinkDisplayStyle()
void links.loadQuickAccessWidgets()
void links.loadShowCardLabels()
