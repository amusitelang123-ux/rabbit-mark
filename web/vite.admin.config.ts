import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

/**
 * 后台管理端独立应用配置。
 *
 * - 入口：web/admin/index.html（root 即 web/admin，Vite 的 SPA 回退天然支持 /admin/** 深链接）
 * - 端口：5174（用户端见 vite.config.ts，端口 5173）
 * - 产物：web/dist-admin
 * - 启动：npm run dev:admin   构建：npm run build:admin
 */
export default defineConfig({
  root: fileURLToPath(new URL('./admin', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-admin', import.meta.url)),
  plugins: [
    vue(),
    // Element Plus 组件按需引入（样式由 admin/main.ts 统一引入全量 CSS）
    Components({
      dts: false,
      resolvers: [ElementPlusResolver({ importStyle: false })],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@admin': fileURLToPath(new URL('./admin', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    // 端口被占用时直接报错，而不是静默改用 5175…（避免把用户端的 dev server 误当成后台）
    strictPort: true,
    open: '/admin/login',
    proxy: {
      // 只代理真实接口前缀（/api/health、/api/client/v1、/api/admin）。
      // 不能直接用 '/api'：后台应用自身的模块目录 web/admin/api/ 在 dev 下的 URL 就是 /api/*，
      // 用 '/api' 作代理前缀会把它们转发给后端，导致模块请求 404、页面白屏。
      '^/api/(health|client|admin)': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist-admin', import.meta.url)),
    emptyOutDir: true,
    // element-plus / echarts 是后台专属 vendor chunk，按路由懒加载
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('element-plus') || id.includes('@element-plus')) return 'element-plus'
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          if (
            id.includes('/node_modules/@vue/') ||
            id.includes('/node_modules/vue/') ||
            id.includes('/node_modules/vue-router/') ||
            id.includes('/node_modules/pinia/')
          ) {
            return 'vue'
          }
          return undefined
        },
      },
    },
  },
})
