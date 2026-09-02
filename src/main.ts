import { createApp } from 'vue'
import './style.css'
import './styles/settings.css'
import './styles/search-dropdown.css'
import App from './App.vue'

const create = createApp(App)

// 创建全局搜索的挂载点
const globalSearchContainer = document.createElement('div')
globalSearchContainer.id = 'global-search-container'
document.body.appendChild(globalSearchContainer)

create.mount('#app')
