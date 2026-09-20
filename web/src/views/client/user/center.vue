<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { addressApi, couponApi, userApi } from '@/api'
import type { Address, Coupon, Product } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney } from '@/utils/money'

const user = useUserStore()
const ui = useUiStore()

type Tab = 'profile' | 'address' | 'coupon' | 'favorite' | 'footprint'
const active = ref<Tab>('profile')

const menus: { key: Tab; label: string; icon: string }[] = [
  { key: 'profile', label: '个人资料', icon: '👤' },
  { key: 'address', label: '收货地址', icon: '📍' },
  { key: 'coupon', label: '我的优惠券', icon: '🎟️' },
  { key: 'favorite', label: '我的收藏', icon: '♥' },
  { key: 'footprint', label: '浏览足迹', icon: '🕓' },
]

const addresses = ref<Address[]>([])
const coupons = ref<Coupon[]>([])
const favorites = ref<Product[]>([])
const footprints = ref<Product[]>([])

const form = ref({
  nickname: user.user?.nickname ?? '',
  gender: 0,
  birthday: '',
  phone: user.user?.phone ?? '',
})

const couponTabs = ref<0 | 1 | 2>(0)
const shownCoupons = computed(() => coupons.value.filter((c) => c.status === couponTabs.value))

onMounted(async () => {
  const [a, c, fav, fp] = await Promise.all([
    addressApi.list(),
    couponApi.mine(),
    userApi.favorites(),
    userApi.footprints(),
  ])
  addresses.value = a
  coupons.value = c
  favorites.value = fav
  footprints.value = fp
})

async function saveProfile() {
  try {
    const updated = await userApi.updateProfile({
      nickname: form.value.nickname,
      gender: form.value.gender,
      birthday: form.value.birthday || undefined,
    })
    user.user = updated
    localStorage.setItem('xtx_user', JSON.stringify(updated))
    ui.toast('资料已保存')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '保存失败', 'error')
  }
}

function couponLabel(c: Coupon): string {
  return c.type === 1 ? `¥${c.amount}` : `${(c.discountRate * 10).toFixed(1)}折`
}
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="uc">
        <!-- Sidebar -->
        <aside class="uc__side">
          <div class="uc__profile card">
            <img :src="user.user?.avatar" class="uc__avatar" alt="头像" />
            <h2>{{ user.user?.nickname }}</h2>
            <span class="uc__level">{{ user.user?.levelName }}</span>
            <div class="uc__stats">
              <div><b>{{ user.user?.points }}</b><span>积分</span></div>
              <div><b>¥{{ formatMoney(user.user?.totalSpent ?? 0) }}</b><span>累计消费</span></div>
            </div>
          </div>

          <nav class="uc__menu card">
            <button
              v-for="m in menus"
              :key="m.key"
              :class="{ 'is-active': active === m.key }"
              @click="active = m.key"
            >
              <span class="uc__menu-icon">{{ m.icon }}</span>
              {{ m.label }}
            </button>
          </nav>
        </aside>

        <!-- Content -->
        <section class="uc__content card">
          <!-- Profile -->
          <template v-if="active === 'profile'">
            <h1 class="uc__title">个人资料</h1>
            <div class="uc-form">
              <div class="uc-form__avatar">
                <img :src="user.user?.avatar" alt="头像" />
                <button class="btn btn-secondary btn-sm" @click="ui.toast('头像上传（演示）', 'info')">更换头像</button>
              </div>
              <div class="field">
                <label>昵称</label>
                <input v-model="form.nickname" class="input" />
              </div>
              <div class="field">
                <label>手机号</label>
                <input v-model="form.phone" class="input" disabled />
              </div>
              <div class="field">
                <label>性别</label>
                <div class="uc-form__radio">
                  <label><input v-model="form.gender" type="radio" :value="0" /> 保密</label>
                  <label><input v-model="form.gender" type="radio" :value="1" /> 男</label>
                  <label><input v-model="form.gender" type="radio" :value="2" /> 女</label>
                </div>
              </div>
              <div class="field">
                <label>生日</label>
                <input v-model="form.birthday" type="date" class="input" />
              </div>
              <button class="btn btn-primary" @click="saveProfile">保存修改</button>
            </div>
          </template>

          <!-- Address -->
          <template v-else-if="active === 'address'">
            <div class="uc__head">
              <h1 class="uc__title">收货地址</h1>
              <button class="btn btn-secondary btn-sm" @click="ui.toast('新增地址（演示）', 'info')">＋ 新增地址</button>
            </div>
            <div class="uc-addr-grid">
              <div v-for="a in addresses" :key="a.id" class="uc-addr">
                <div class="uc-addr__head">
                  <b>{{ a.receiver }}</b>
                  <span class="muted">{{ a.phone }}</span>
                  <span v-if="a.isDefault" class="tag">默认</span>
                </div>
                <p class="muted">{{ a.province }}{{ a.city }}{{ a.district }}{{ a.detail }}</p>
                <div class="uc-addr__actions">
                  <button class="link" @click="ui.toast('编辑地址（演示）', 'info')">编辑</button>
                  <button class="link" @click="ui.toast('删除地址（演示）', 'info')">删除</button>
                </div>
              </div>
            </div>
          </template>

          <!-- Coupons -->
          <template v-else-if="active === 'coupon'">
            <h1 class="uc__title">我的优惠券</h1>
            <div class="uc__subtabs">
              <button :class="{ 'is-active': couponTabs === 0 }" @click="couponTabs = 0">未使用</button>
              <button :class="{ 'is-active': couponTabs === 1 }" @click="couponTabs = 1">已使用</button>
              <button :class="{ 'is-active': couponTabs === 2 }" @click="couponTabs = 2">已过期</button>
            </div>
            <div class="uc-coupons">
              <div v-for="c in shownCoupons" :key="c.id" class="uc-coupon" :class="{ 'is-used': c.status !== 0 }">
                <div class="uc-coupon__left">
                  <b>{{ couponLabel(c) }}</b>
                  <span>{{ c.type === 1 ? `满 ${c.minAmount} 可用` : '折扣券' }}</span>
                </div>
                <div class="uc-coupon__right">
                  <h3>{{ c.name }}</h3>
                  <p class="muted">{{ c.scopeText }}</p>
                  <p class="muted">{{ c.validText }}</p>
                </div>
                <button v-if="c.status === 0" class="btn btn-primary btn-sm" @click="ui.toast('去使用', 'info')">去使用</button>
              </div>
              <EmptyState v-if="!shownCoupons.length" icon="🎟️" title="暂无优惠券" />
            </div>
          </template>

          <!-- Favorite -->
          <template v-else-if="active === 'favorite'">
            <h1 class="uc__title">我的收藏</h1>
            <div v-if="favorites.length" class="grid-products">
              <ProductCard v-for="p in favorites" :key="p.id" :product="p" />
            </div>
            <EmptyState v-else icon="♥" title="还没有收藏商品" />
          </template>

          <!-- Footprint -->
          <template v-else>
            <h1 class="uc__title">浏览足迹</h1>
            <p class="muted uc__footprint-date">今天</p>
            <div v-if="footprints.length" class="grid-products">
              <ProductCard v-for="p in footprints" :key="p.id" :product="p" />
            </div>
            <EmptyState v-else icon="🕓" title="暂无浏览记录" />
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.uc {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 18px;
  align-items: start;
}
.uc__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: calc(var(--header-h) + var(--subnav-h) + 12px);
}
.uc__profile {
  padding: 24px;
  text-align: center;
}
.uc__avatar {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  margin: 0 auto 12px;
  border: 3px solid var(--amz-orange);
}
.uc__profile h2 {
  font-size: 18px;
  margin-bottom: 6px;
}
.uc__level {
  display: inline-block;
  background: linear-gradient(90deg, #ffe0a3, #febd69);
  color: #6b4300;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 100px;
}
.uc__stats {
  display: flex;
  margin-top: 16px;
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
}
.uc__stats div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.uc__stats b {
  font-size: 16px;
  color: var(--amz-price);
}
.uc__stats span {
  font-size: 12px;
  color: var(--text-secondary);
}
.uc__menu {
  padding: 8px;
  display: flex;
  flex-direction: column;
}
.uc__menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
}
.uc__menu button:hover {
  background: var(--bg-hover);
}
.uc__menu button.is-active {
  background: #fff4e5;
  color: #b45309;
  font-weight: 700;
}
.uc__menu-icon {
  font-size: 16px;
}

.uc__content {
  padding: 24px;
  min-height: 500px;
}
.uc__title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 20px;
}
.uc__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.uc__head .uc__title {
  margin-bottom: 0;
}
.uc__subtabs {
  display: flex;
  gap: 6px;
  margin: -6px 0 18px;
}
.uc__subtabs button {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 100px;
  padding: 6px 16px;
  font-size: 13px;
}
.uc__subtabs button.is-active {
  background: var(--amz-navy-2);
  border-color: var(--amz-navy-2);
  color: #fff;
}
.uc__footprint-date {
  margin-bottom: 12px;
  font-weight: 700;
}

.uc-form {
  max-width: 420px;
}
.uc-form__avatar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.uc-form__avatar img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}
.uc-form__radio {
  display: flex;
  gap: 20px;
  font-size: 14px;
}
.uc-form__radio label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.uc-addr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.uc-addr {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}
.uc-addr__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.uc-addr__actions {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}
.uc-addr__actions button {
  background: none;
  border: none;
  font-size: 13px;
}

.uc-coupons {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.uc-coupon {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  align-items: center;
  gap: 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.uc-coupon__left {
  background: linear-gradient(135deg, #ff9d2e, #febd69);
  color: #fff;
  padding: 20px 16px;
  text-align: center;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.uc-coupon__left b {
  font-size: 26px;
}
.uc-coupon__left span {
  font-size: 12px;
  opacity: 0.95;
}
.uc-coupon__right {
  padding: 12px 0;
}
.uc-coupon__right h3 {
  font-size: 16px;
  margin-bottom: 4px;
}
.uc-coupon__right p {
  font-size: 12.5px;
}
.uc-coupon.is-used {
  filter: grayscale(1);
  opacity: 0.75;
}
.uc-coupon > button {
  margin-right: 18px;
}

@media (max-width: 900px) {
  .uc {
    grid-template-columns: 1fr;
  }
  .uc__side {
    position: static;
  }
  .uc-addr-grid {
    grid-template-columns: 1fr;
  }
  .uc-coupon {
    grid-template-columns: 120px 1fr;
  }
  .uc-coupon > button {
    display: none;
  }
}
</style>
