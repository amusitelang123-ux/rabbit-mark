<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { adminMenu, clearAdminRoutes } from './router'
import { useAdminStore } from '@admin/stores/admin'
import { resolveAdminIcon } from '@admin/utils/adminIcons'

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

const menus = computed(() => adminMenu.filter((m) => admin.hasPerm(m.perm)))
const activePath = computed(() => route.path)
const currentTitle = computed(() => (route.meta.title as string) ?? '')
const displayName = computed(() => admin.profile?.realName || admin.profile?.username || '管理员')

async function onCommand(command: string) {
  if (command !== 'logout') return
  try {
    await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
    clearAdminRoutes()
    admin.logout()
    router.replace('/admin/login')
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-aside">
      <div class="admin-logo">
        <span class="admin-logo__mark">兔</span>
        <span class="admin-logo__text">小兔鲜 · 管理后台</span>
      </div>
      <el-menu :default-active="activePath" router class="admin-menu">
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="resolveAdminIcon(m.icon)" /></el-icon>
          <span>{{ m.title }}</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <div class="admin-body">
      <header class="admin-header">
        <span class="admin-header__title">{{ currentTitle }}</span>
        <el-dropdown @command="onCommand">
          <span class="admin-header__user">
            {{ displayName }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <main class="admin-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  background: #f5f6f8;
}
.admin-aside {
  width: 210px;
  flex-shrink: 0;
  background: #1f2733;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.admin-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}
.admin-logo__mark {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #fe7c00;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.admin-menu {
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #c3cad6;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.08);
  --el-menu-active-color: #ffb066;
}
.admin-menu :deep(.el-menu-item.is-active) {
  background: rgba(254, 124, 0, 0.16);
}
.admin-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.admin-header {
  height: 56px;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
}
.admin-header__title {
  font-size: 16px;
  font-weight: 500;
  color: #1f2733;
}
.admin-header__user {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #4a5260;
  font-size: 14px;
}
.admin-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
