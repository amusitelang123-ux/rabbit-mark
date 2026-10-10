import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 用户端应用配置：入口 web/index.html，端口 5173，产物 web/dist。
 * 后台管理端是独立应用，见 vite.admin.config.ts（端口 5174，产物 web/dist-admin）。
 * Element Plus / echarts 只在后台应用里使用，这里不再配置它们的按需引入。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 端口被占用时直接报错，而不是静默改用 5174（否则会把用户端当成后台跑在 5174 上）
    strictPort: true,
    open: true,
    proxy: {
      // 只代理真实接口前缀（/api/health、/api/client/v1、/api/admin），与 vite.admin.config.ts 保持一致
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
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
