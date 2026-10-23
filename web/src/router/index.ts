import { createRouter, createWebHistory } from 'vue-router'

/** 用户端路由（后台管理端是独立应用，见 web/admin/router.ts） */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/ClientLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/client/home/index.vue'), meta: { title: '首页' } },
        { path: 'category/:id?', name: 'category', component: () => import('@/views/client/category/index.vue'), meta: { title: '商品分类' } },
        { path: 'products', name: 'products', component: () => import('@/views/client/product/list.vue'), meta: { title: '商品列表' } },
        { path: 'search', name: 'search', component: () => import('@/views/client/search/index.vue'), meta: { title: '搜索' } },
        { path: 'product/:id', name: 'product-detail', component: () => import('@/views/client/product/detail.vue'), meta: { title: '商品详情' } },
        { path: 'cart', name: 'cart', component: () => import('@/views/client/cart/index.vue'), meta: { title: '购物车' } },
        { path: 'checkout', name: 'checkout', component: () => import('@/views/client/order/confirm.vue'), meta: { title: '确认订单', auth: true } },
        { path: 'orders', name: 'orders', component: () => import('@/views/client/order/list.vue'), meta: { title: '我的订单', auth: true } },
        { path: 'order/:orderNo', name: 'order-detail', component: () => import('@/views/client/order/detail.vue'), meta: { title: '订单详情', auth: true } },
        { path: 'coupons', name: 'coupons', component: () => import('@/views/client/marketing/coupons.vue'), meta: { title: '领券中心' } },
        { path: 'seckill', name: 'seckill', component: () => import('@/views/client/seckill/index.vue'), meta: { title: '限时秒杀' } },
        { path: 'help', name: 'help', component: () => import('@/views/client/help/index.vue'), meta: { title: '帮助中心' } },
        { path: 'notices', name: 'notices', component: () => import('@/views/client/notice/list.vue'), meta: { title: '平台公告' } },
        { path: 'notices/:id', name: 'notice-detail', component: () => import('@/views/client/notice/detail.vue'), meta: { title: '公告详情' } },
        { path: 'user', name: 'user', component: () => import('@/views/client/user/center.vue'), meta: { title: '个人中心', auth: true } },
      ],
    },
    { path: '/login', name: 'login', component: () => import('@/views/client/auth/login.vue'), meta: { title: '登录', bare: true } },
    { path: '/register', name: 'register', component: () => import('@/views/client/auth/register.vue'), meta: { title: '注册', bare: true } },
    { path: '/forgot', name: 'forgot', component: () => import('@/views/client/auth/forgot.vue'), meta: { title: '找回密码', bare: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/** 用户端守卫：需要登录的页面（meta.auth）未登录时跳转登录页 */
router.beforeEach((to) => {
  const token = localStorage.getItem('xtx_access_token')
  if (to.meta.auth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - 小兔鲜` : '小兔鲜 - 正品好物 极速送达'
})

export default router
