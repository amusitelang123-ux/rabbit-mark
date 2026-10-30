import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAdminStore } from '@admin/stores/admin'

export interface AdminRouteMeta {
  title?: string
  icon?: string
  perm?: string
  hidden?: boolean
  public?: boolean
}

export interface AdminMenuItem {
  path: string
  title: string
  icon: string
  perm: string
}

/** 侧边栏菜单：仅用于渲染，实际可访问性由动态路由 + 后端接口权限双重控制 */
export const adminMenu: AdminMenuItem[] = [
  { path: '/admin/dashboard', title: '数据概览', icon: 'DataLine', perm: 'stats:view' },
  { path: '/admin/products', title: '商品管理', icon: 'Goods', perm: 'product:view' },
  { path: '/admin/inventory', title: '库存管理', icon: 'Box', perm: 'product:view' },
  { path: '/admin/categories', title: '分类管理', icon: 'Grid', perm: 'product:view' },
  { path: '/admin/comments', title: '评价管理', icon: 'ChatDotSquare', perm: 'comment:view' },
  { path: '/admin/users', title: '用户管理', icon: 'Avatar', perm: 'user:view' },
  { path: '/admin/levels', title: '会员等级', icon: 'Medal', perm: 'level:view' },
  { path: '/admin/orders', title: '订单管理', icon: 'List', perm: 'order:view' },
  { path: '/admin/refunds', title: '售后管理', icon: 'RefreshLeft', perm: 'refund:view' },
  { path: '/admin/feedbacks', title: '留言工单', icon: 'ChatLineSquare', perm: 'feedback:view' },
  { path: '/admin/ai', title: 'AI 客服', icon: 'MagicStick', perm: 'ai:view' },
  { path: '/admin/marketing', title: '营销管理', icon: 'Ticket', perm: 'marketing:view' },
  { path: '/admin/home-floors', title: '首页推荐位', icon: 'House', perm: 'marketing:view' },
  { path: '/admin/finance', title: '财务管理', icon: 'Money', perm: 'finance:view' },
  { path: '/admin/logistics', title: '物流配置', icon: 'Van', perm: 'logistics:view' },
  { path: '/admin/system/admins', title: '管理员', icon: 'User', perm: 'system:view' },
  { path: '/admin/system/roles', title: '角色权限', icon: 'Key', perm: 'system:view' },
  { path: '/admin/system/logs', title: '操作日志', icon: 'Document', perm: 'system:view' },
  { path: '/admin/system/settings', title: '系统配置', icon: 'Tools', perm: 'system:view' },
]

/**
 * 权限路由注册表（A-72）：
 * 登录后按 `/admin/me` 返回的权限码动态注册到 `/admin` 布局下，
 * 未授权页面不会出现在路由表中，直接访问落入 404/403。
 */
export const adminRouteRegistry: RouteRecordRaw[] = [
  {
    path: 'dashboard',
    name: 'admin-dashboard',
    component: () => import('@admin/views/dashboard/index.vue'),
    meta: { title: '数据概览', icon: 'DataLine', perm: 'stats:view' },
  },
  {
    path: 'products',
    name: 'admin-products',
    component: () => import('@admin/views/product/list.vue'),
    meta: { title: '商品管理', icon: 'Goods', perm: 'product:view' },
  },
  {
    path: 'products/new',
    name: 'admin-product-new',
    component: () => import('@admin/views/product/edit.vue'),
    meta: { title: '新增商品', hidden: true, perm: 'product:create' },
  },
  {
    path: 'products/:id/edit',
    name: 'admin-product-edit',
    component: () => import('@admin/views/product/edit.vue'),
    meta: { title: '编辑商品', hidden: true, perm: 'product:update' },
  },
  {
    path: 'comments',
    name: 'admin-comments',
    component: () => import('@admin/views/comment/list.vue'),
    meta: { title: '评价管理', icon: 'ChatDotSquare', perm: 'comment:view' },
  },
  {
    path: 'inventory',
    name: 'admin-inventory',
    component: () => import('@admin/views/inventory/index.vue'),
    meta: { title: '库存管理', icon: 'Box', perm: 'product:view' },
  },
  {
    path: 'categories',
    name: 'admin-categories',
    component: () => import('@admin/views/category/index.vue'),
    meta: { title: '分类管理', icon: 'Grid', perm: 'product:view' },
  },
  {
    path: 'users',
    name: 'admin-users',
    component: () => import('@admin/views/user/list.vue'),
    meta: { title: '用户管理', icon: 'Avatar', perm: 'user:view' },
  },
  {
    path: 'levels',
    name: 'admin-levels',
    component: () => import('@admin/views/level/index.vue'),
    meta: { title: '会员等级', icon: 'Medal', perm: 'level:view' },
  },
  {
    path: 'orders',
    name: 'admin-orders',
    component: () => import('@admin/views/order/list.vue'),
    meta: { title: '订单管理', icon: 'List', perm: 'order:view' },
  },
  {
    path: 'orders/:orderNo',
    name: 'admin-order-detail',
    component: () => import('@admin/views/order/detail.vue'),
    meta: { title: '订单详情', hidden: true, perm: 'order:view' },
  },
  {
    path: 'refunds',
    name: 'admin-refunds',
    component: () => import('@admin/views/refund/list.vue'),
    meta: { title: '售后管理', icon: 'RefreshLeft', perm: 'refund:view' },
  },
  {
    path: 'marketing',
    name: 'admin-marketing',
    component: () => import('@admin/views/marketing/index.vue'),
    meta: { title: '营销管理', icon: 'Ticket', perm: 'marketing:view' },
  },
  {
    path: 'home-floors',
    name: 'admin-home-floors',
    component: () => import('@admin/views/home/floor.vue'),
    meta: { title: '首页推荐位', icon: 'House', perm: 'marketing:view' },
  },
  {
    path: 'logistics',
    name: 'admin-logistics',
    component: () => import('@admin/views/logistics/index.vue'),
    meta: { title: '物流配置', icon: 'Van', perm: 'logistics:view' },
  },
  {
    path: 'finance',
    name: 'admin-finance',
    component: () => import('@admin/views/finance/index.vue'),
    meta: { title: '财务管理', icon: 'Money', perm: 'finance:view' },
  },
  {
    path: 'system/admins',
    name: 'admin-system-admins',
    component: () => import('@admin/views/system/admin.vue'),
    meta: { title: '管理员', icon: 'User', perm: 'system:view' },
  },
  {
    path: 'system/roles',
    name: 'admin-system-roles',
    component: () => import('@admin/views/system/role.vue'),
    meta: { title: '角色权限', icon: 'Key', perm: 'system:view' },
  },
  {
    path: 'feedbacks',
    name: 'admin-feedbacks',
    component: () => import('@admin/views/feedback/list.vue'),
    meta: { title: '留言工单', icon: 'ChatLineSquare', perm: 'feedback:view' },
  },
  {
    path: 'ai',
    name: 'admin-ai',
    component: () => import('@admin/views/ai/index.vue'),
    meta: { title: 'AI 客服', icon: 'MagicStick', perm: 'ai:view' },
  },
  {
    path: 'system/logs',
    name: 'admin-system-logs',
    component: () => import('@admin/views/system/log.vue'),
    meta: { title: '操作日志', icon: 'Document', perm: 'system:view' },
  },
  {
    path: 'system/settings',
    name: 'admin-system-settings',
    component: () => import('@admin/views/system/setting.vue'),
    meta: { title: '系统配置', icon: 'Tools', perm: 'system:view' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@admin/views/login/index.vue'),
      meta: { title: '后台登录', public: true },
    },
    {
      path: '/admin',
      name: 'admin-root',
      component: () => import('./AdminLayout.vue'),
      redirect: '/admin/dashboard',
      children: [
        {
          path: '403',
          name: 'admin-403',
          component: () => import('@admin/views/error/403.vue'),
          meta: { title: '无权限', hidden: true },
        },
      ],
    },
    { path: '/', redirect: '/admin/dashboard' },
    {
      path: '/:pathMatch(.*)*',
      name: 'admin-not-found',
      component: () => import('@admin/views/error/404.vue'),
      meta: { title: '页面不存在' },
    },
  ],
})

let routesInstalled = false
const installedRouteNames: string[] = []

/** 按权限动态注册后台路由（幂等） */
export function installAdminRoutes(hasPerm: (code?: string) => boolean): void {
  if (routesInstalled) return
  for (const record of adminRouteRegistry) {
    const perm = (record.meta as AdminRouteMeta | undefined)?.perm
    if (perm && !hasPerm(perm)) continue
    router.addRoute('admin-root', record)
    installedRouteNames.push(String(record.name))
  }
  routesInstalled = true
}

/** 退出登录/切换账号时移除动态路由，避免残留上一个账号的页面 */
export function clearAdminRoutes(): void {
  for (const name of installedRouteNames) {
    if (router.hasRoute(name)) router.removeRoute(name)
  }
  installedRouteNames.length = 0
  routesInstalled = false
}

router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const admin = useAdminStore()
  if (!admin.token) return { path: '/admin/login', query: { redirect: to.fullPath } }

  if (!admin.loaded) {
    try {
      await admin.loadProfile()
    } catch {
      clearAdminRoutes()
      admin.logout()
      return { path: '/admin/login', query: { redirect: to.fullPath } }
    }
  }

  // 首次进入：注册当前账号有权限的路由，然后重新解析目标地址
  if (!routesInstalled) {
    installAdminRoutes((code) => admin.hasPerm(code))
    // 没有概览权限的账号，登录后默认跳到第一个有权访问的菜单
    if (
      (to.path === '/admin/dashboard' || to.path === '/admin') &&
      !admin.hasPerm('stats:view')
    ) {
      const fallback = adminMenu.find((item) => admin.hasPerm(item.perm))?.path ?? '/admin/403'
      return { path: fallback, replace: true }
    }
    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  }

  const perm = to.meta.perm as string | undefined
  if (perm && !admin.hasPerm(perm)) return { path: '/admin/403' }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - 小兔鲜后台` : '小兔鲜 · 管理后台'
})

export default router
