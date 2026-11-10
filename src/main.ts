import { createApp } from 'vue'
import './style.css'
import './styles/settings.css'
import './styles/search-dropdown.css'
import App from './App.vue'
import { initI18n } from '@/i18n'

void initI18n().then(() => {
  const create = createApp(App)
  const globalSearchContainer = document.createElement('div')
  globalSearchContainer.id = 'global-search-container'
  document.body.appendChild(globalSearchContainer)
  create.mount('#app')
})
