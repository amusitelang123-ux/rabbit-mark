<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoryApi, configApi } from '@/api'
import type { Category, PublicConfig } from '@/api/types'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useUiStore } from '@/stores/ui'
import { useAddressStore } from '@/stores/address'

const router = useRouter()
const route = useRoute()
const cart = useCartStore()
const user = useUserStore()
const app = useAppStore()
const ui = useUiStore()
const addressStore = useAddressStore()

const keyword = ref((route.query.keyword as string) ?? '')
const scope = ref('all')
const tops = ref<Category[]>([])
const childrenMap = ref<Record<number, Category[]>>({})
const showDept = ref(false)
const showAccount = ref(false)
const showSearchPanel = ref(false)
const siteConfig = ref<PublicConfig | null>(null)

const deliveryText = computed(() => {
  const a = addressStore.defaultAddress
  if (!a) return '请选择收货地址'
  return [a.city, a.district].filter(Boolean).join(' ') || a.province || '请选择收货地址'
})

async function loadDeliveryAddress() {
  if (!user.isLoggedIn) {
    addressStore.clear()
    return
  }
  try {
    await addressStore.load()
  } catch {
    addressStore.clear()
  }
}

onMounted(async () => {
  loadDeliveryAddress()
  // 站点信息来自后台「系统配置」
  configApi
    .public()
    .then((c) => {
      siteConfig.value = c
    })
    .catch(() => {
      siteConfig.value = null
    })
  const all = await categoryApi.tree()
  tops.value = all.filter((c) => c.level === 1)
  childrenMap.value = all.reduce<Record<number, Category[]>>((acc, c) => {
    if (c.level === 2) (acc[c.parentId] ??= []).push(c)
    return acc
  }, {})
})

watch(() => user.isLoggedIn, loadDeliveryAddress)

const cartLabel = computed(() => (cart.count > 0 ? `购物车 ${cart.count}` : '购物车'))

function onSearch() {
  const q = keyword.value.trim()
  if (!q) {
    ui.toast('请输入搜索关键词', 'info')
    return
  }
  app.pushHistory(q)
  showSearchPanel.value = false
  router.push({ path: '/search', query: { keyword: q } })
}

function goCategory(id: number) {
  router.push(`/category/${id}`)
}

function pickHistory(kw: string) {
  keyword.value = kw
  app.pushHistory(kw)
  showSearchPanel.value = false
  router.push({ path: '/search', query: { keyword: kw } })
}

function logout() {
  user.logout()
  showAccount.value = false
  ui.toast('已退出登录', 'info')
  router.push('/')
}
</script>

<template>
  <header class="hdr">
    <!-- Top row -->
    <div class="hdr__top">
      <div class="container hdr__top-inner">
        <router-link to="/" class="hdr__logo" :aria-label="`${siteConfig?.siteName || '小兔鲜'}首页`">
          <img v-if="siteConfig?.logo" :src="siteConfig.logo" class="hdr__logo-img" alt="" />
          <span v-else class="hdr__logo-mark">🐰</span>
          <span class="hdr__logo-text">{{ siteConfig?.siteName || '小兔鲜' }}</span>
        </router-link>

        <button class="hdr__deliver" type="button" @click="router.push(user.isLoggedIn ? '/user' : '/login')">
          <span class="hdr__deliver-pin">📍</span>
          <span class="hdr__deliver-copy">
            <small>送至</small>
            <b>{{ deliveryText }}</b>
          </span>
        </button>

        <form class="hdr__search" @submit.prevent="onSearch">
          <select v-model="scope" class="hdr__search-scope" aria-label="搜索范围">
            <option value="all">全部</option>
            <option v-for="c in tops" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
          </select>
          <div class="hdr__search-field">
            <input
              v-model="keyword"
              type="text"
              placeholder="搜索商品、品牌、分类"
              @focus="showSearchPanel = true"
              @blur="showSearchPanel = false"
            />
            <div v-if="showSearchPanel && (app.searchHistory.length || app.hotKeywords.length)" class="hdr__suggest">
              <div v-if="app.searchHistory.length" class="hdr__suggest-block">
                <div class="hdr__suggest-head">
                  <span>搜索历史</span>
                  <button type="button" @mousedown.prevent="app.clearHistory()">清除</button>
                </div>
                <div class="hdr__chips">
                  <button
                    v-for="h in app.searchHistory"
                    :key="h"
                    type="button"
                    class="hdr__chip"
                    @mousedown.prevent="pickHistory(h)"
                  >
                    {{ h }}
                  </button>
                </div>
              </div>
              <div class="hdr__suggest-block">
                <div class="hdr__suggest-head"><span>热门搜索</span></div>
                <div class="hdr__chips">
                  <button
                    v-for="h in app.hotKeywords"
                    :key="h"
                    type="button"
                    class="hdr__chip hdr__chip--hot"
                    @mousedown.prevent="pickHistory(h)"
                  >
                    {{ h }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button class="hdr__search-btn" type="submit" aria-label="搜索">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#131921" stroke-width="2.4">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
          </button>
        </form>

        <div class="hdr__actions">
          <div
            class="hdr__account"
            @mouseenter="showAccount = true"
            @mouseleave="showAccount = false"
          >
            <button class="hdr__action" type="button">
              <small>{{ user.isLoggedIn ? `你好，${user.user?.nickname}` : '你好，请登录' }}</small>
              <b>账户与列表 ▾</b>
            </button>
            <transition name="fade">
              <div v-if="showAccount" class="hdr__menu">
                <template v-if="user.isLoggedIn">
                  <router-link to="/user" class="hdr__menu-link">个人中心</router-link>
                  <router-link to="/orders" class="hdr__menu-link">我的订单</router-link>
                  <router-link to="/coupons" class="hdr__menu-link">我的优惠券</router-link>
                  <button class="hdr__menu-link hdr__menu-link--btn" type="button" @click="logout">退出登录</button>
                </template>
                <template v-else>
                  <router-link to="/login" class="hdr__menu-cta">登录</router-link>
                  <p class="hdr__menu-hint">
                    新客户？
                    <router-link to="/register" class="link">免费注册</router-link>
                  </p>
                </template>
              </div>
            </transition>
          </div>

          <router-link to="/orders" class="hdr__action hdr__action--link">
            <small>退货</small>
            <b>与订单</b>
          </router-link>

          <router-link to="/cart" class="hdr__cart">
            <span class="hdr__cart-wrap">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.6">
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" />
                <circle cx="10" cy="20" r="1.4" fill="#fff" />
                <circle cx="18" cy="20" r="1.4" fill="#fff" />
              </svg>
              <span class="hdr__cart-badge">{{ cart.count }}</span>
            </span>
            <b class="hdr__cart-label">{{ cartLabel }}</b>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Sub nav -->
    <nav class="hdr__sub">
      <div class="container hdr__sub-inner">
        <div class="hdr__dept" @mouseenter="showDept = true" @mouseleave="showDept = false">
          <button class="hdr__dept-btn" type="button">☰ 全部商品分类</button>
          <transition name="fade">
            <div v-if="showDept" class="hdr__dept-panel">
              <div v-for="c in tops" :key="c.id" class="hdr__dept-col">
                <button class="hdr__dept-title" type="button" @click="goCategory(c.id)">
                  <span>{{ c.icon }}</span> {{ c.name }}
                </button>
                <div class="hdr__dept-links">
                  <button
                    v-for="child in childrenMap[c.id] || []"
                    :key="child.id"
                    type="button"
                    @click="goCategory(child.id)"
                  >
                    {{ child.name }}
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <router-link
          v-for="c in tops.slice(0, 6)"
          :key="c.id"
          :to="`/category/${c.id}`"
          class="hdr__sub-link"
        >
          {{ c.name }}
        </router-link>

        <router-link to="/seckill" class="hdr__sub-link">限时秒杀</router-link>
        <router-link to="/coupons" class="hdr__sub-link">领券中心</router-link>
        <router-link to="/notices" class="hdr__sub-link">平台公告</router-link>
        <router-link to="/help" class="hdr__sub-link">帮助中心</router-link>

        <span class="hdr__sub-promo">新人首单立减 ¥88</span>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.hdr {
  position: sticky;
  top: 0;
  z-index: 900;
}

/* ---- top row ---- */
.hdr__top {
  background: var(--amz-navy);
  color: #fff;
}
.hdr__top-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  height: var(--header-h);
}
.hdr__logo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
}
.hdr__logo:hover {
  border-color: #fff;
}
.hdr__logo-mark {
  font-size: 24px;
}
.hdr__logo-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  border-radius: 6px;
}
.hdr__logo-text {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #fff 0%, var(--amz-orange) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hdr__deliver {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #fff;
  padding: 4px 8px;
  text-align: left;
}
.hdr__deliver:hover {
  border-color: #fff;
}
.hdr__deliver-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  font-size: 12px;
}
.hdr__deliver-copy small {
  color: #ccc;
}
.hdr__deliver-copy b {
  font-size: 13px;
}

.hdr__search {
  flex: 1;
  display: flex;
  min-width: 200px;
  height: 40px;
  border-radius: 6px;
  overflow: visible;
  position: relative;
}
.hdr__search-scope {
  border: none;
  background: #f3f3f3;
  color: #555;
  padding: 0 8px;
  border-radius: 6px 0 0 6px;
  font-size: 13px;
  outline: none;
  border-right: 1px solid #cdcdcd;
  cursor: pointer;
}
.hdr__search-field {
  flex: 1;
  position: relative;
  background: #fff;
}
.hdr__search-field input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 0 14px;
  font-size: 15px;
  color: var(--text);
}
.hdr__search-btn {
  width: 46px;
  border: none;
  background: var(--amz-orange);
  border-radius: 0 6px 6px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.hdr__search-btn:hover {
  background: var(--amz-orange-hover);
}
.hdr__suggest {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 6px;
  box-shadow: var(--shadow-pop);
  padding: 14px 16px;
  z-index: 50;
  color: var(--text);
}
.hdr__suggest-block + .hdr__suggest-block {
  margin-top: 12px;
}
.hdr__suggest-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.hdr__suggest-head button {
  background: none;
  border: none;
  color: var(--amz-link);
  font-size: 12px;
}
.hdr__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hdr__chip {
  background: #f0f2f2;
  border: none;
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--text);
}
.hdr__chip--hot {
  background: #fff4e5;
  color: #b45309;
}
.hdr__chip:hover {
  background: #e3e6e6;
}

.hdr__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.hdr__action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #fff;
  padding: 6px 8px;
  white-space: nowrap;
}
.hdr__action small {
  font-size: 12px;
  color: #ddd;
}
.hdr__action b {
  font-size: 13px;
}
.hdr__action:hover,
.hdr__account:hover .hdr__action {
  border-color: #fff;
}
.hdr__account {
  position: relative;
}
.hdr__menu {
  position: absolute;
  right: 0;
  top: 100%;
  width: 210px;
  background: #fff;
  color: var(--text);
  border-radius: 6px;
  box-shadow: var(--shadow-pop);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 60;
}
.hdr__menu-link {
  font-size: 14px;
  color: var(--text);
}
.hdr__menu-link:hover {
  color: var(--amz-link-hover);
}
.hdr__menu-link--btn {
  background: none;
  border: none;
  text-align: left;
  padding: 0;
}
.hdr__menu-cta {
  display: block;
  text-align: center;
  background: var(--amz-button);
  border: 1px solid var(--amz-button-border);
  border-radius: 100px;
  padding: 7px;
  font-weight: 600;
}
.hdr__menu-cta:hover {
  background: var(--amz-button-hover);
}
.hdr__menu-hint {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.hdr__cart {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #fff;
}
.hdr__cart:hover {
  border-color: #fff;
}
.hdr__cart-wrap {
  position: relative;
}
.hdr__cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: var(--amz-button);
  color: var(--amz-navy);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hdr__cart-label {
  font-size: 13px;
  padding-bottom: 2px;
}

/* ---- sub nav ---- */
.hdr__sub {
  background: var(--amz-navy-2);
  color: #fff;
}
.hdr__sub-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--subnav-h);
}
.hdr__dept {
  position: relative;
  height: 100%;
}
.hdr__dept-btn {
  height: 100%;
  background: var(--amz-navy-3);
  border: none;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 0 16px;
}
.hdr__dept:hover .hdr__dept-btn {
  background: #485769;
}
.hdr__dept-panel {
  position: absolute;
  top: 100%;
  left: 0;
  width: min(920px, 92vw);
  background: #fff;
  color: var(--text);
  border-radius: 0 0 8px 8px;
  box-shadow: var(--shadow-pop);
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  z-index: 80;
}
.hdr__dept-title {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-weight: 700;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 8px;
  padding: 0;
}
.hdr__dept-title:hover {
  color: var(--amz-link-hover);
}
.hdr__dept-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}
.hdr__dept-links button {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.hdr__dept-links button:hover {
  color: var(--amz-link-hover);
  text-decoration: underline;
}
.hdr__sub-link {
  padding: 0 10px;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #fff;
  border: 1px solid transparent;
}
.hdr__sub-link:hover {
  border-color: #fff;
  border-radius: 3px;
}
.hdr__sub-promo {
  margin-left: auto;
  color: var(--amz-orange);
  font-weight: 700;
  font-size: 13px;
}

@media (max-width: 980px) {
  .hdr__deliver,
  .hdr__action--link {
    display: none;
  }
}
@media (max-width: 768px) {
  .hdr__top-inner {
    height: auto;
    flex-wrap: wrap;
    padding: 10px 0;
    gap: 10px;
  }
  .hdr__search {
    order: 3;
    width: 100%;
    flex-basis: 100%;
  }
  .hdr__logo-text {
    font-size: 19px;
  }
  .hdr__cart-label,
  .hdr__action small {
    display: none;
  }
  .hdr__sub-link {
    display: none;
  }
  .hdr__sub-promo {
    font-size: 12px;
  }
  .hdr__dept-panel {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
