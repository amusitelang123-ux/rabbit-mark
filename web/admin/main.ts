import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Element Plus 全量样式只在后台应用引入；用户端入口（web/src/main.ts）不再加载
import 'element-plus/dist/index.css'
import '@/styles/global.css'
import App from './App.vue'
import router from './router'

createApp(App).use(createPinia()).use(router).mount('#app')
