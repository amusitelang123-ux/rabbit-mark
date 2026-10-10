import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'

// 用户端应用：只包含用户端页面与依赖。
// 后台管理端是独立应用（入口 web/admin/index.html，端口 5174，配置 vite.admin.config.ts），
// Element Plus / echarts 只在后台应用内引入，不再进入用户端产物。
createApp(App).use(createPinia()).use(router).mount('#app')
