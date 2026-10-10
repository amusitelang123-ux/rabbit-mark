<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { seckillApi, cartApi } from '@/api'
import type { ActiveSeckill, SeckillItem } from '@/api/types'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney } from '@/utils/money'

const router = useRouter()
const cart = useCartStore()
const ui = useUiStore()
const user = useUserStore()

const loading = ref(true)
const activities = ref<ActiveSeckill[]>([])
const now = ref(Date.now())
const buyingId = ref<number | null>(null)
let timer: number | undefined

/** 所有活动按结束时间升序，取最近一场作为主会场 */
const primary = computed(() => activities.value[0] ?? null)

function countdown(target: number): string {
  const diff = Math.max(0, target - now.value)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function soldPercent(item: SeckillItem): number {
  const total = item.remaining + Math.round(item.remaining * 0.5)
  if (!total) return 0
  return Math.min(100, Math.round(((total - item.remaining) / total) * 100))
}

async function grab(item: SeckillItem) {
  if (buyingId.value) return
  if (!user.isLoggedIn) {
    ui.toast('请先登录后再抢购', 'info')
    router.push({ name: 'login', query: { redirect: '/seckill' } })
    return
  }
  if (item.remaining <= 0) {
    ui.toast('该商品已抢完', 'error')
    return
  }
  buyingId.value = item.id
  try {
    await cartApi.add({ productId: item.productId, skuId: item.skuId, quantity: 1 })
    await cart.load()
    ui.toast('已加入购物车，快去结算吧')
    router.push('/checkout')
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '抢购失败', 'error')
  } finally {
    buyingId.value = null
  }
}

onMounted(async () => {
  try {
    activities.value = await seckillApi.active()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '加载失败', 'error')
  } finally {
    loading.value = false
  }
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="sk-hero">
        <div>
          <h1>限时秒杀</h1>
          <p>超低价好物 · 每人限购 · 抢完即止</p>
        </div>
        <div v-if="primary" class="sk-hero__timer">
          <span class="sk-hero__label">距结束</span>
          <b>{{ countdown(primary.endTimestamp) }}</b>
        </div>
      </div>

      <div v-if="loading" class="sk-loading">正在加载秒杀商品…</div>

      <template v-else-if="activities.length">
        <section v-for="act in activities" :key="act.id" class="sk-block">
          <div class="sk-block__head">
            <h2>{{ act.name }}</h2>
            <span class="muted">{{ act.startTime }} ~ {{ act.endTime }}</span>
          </div>

          <div class="sk-grid">
            <article v-for="item in act.products" :key="item.id" class="sk-card">
              <router-link :to="`/product/${item.productId}`" class="sk-card__img">
                <img :src="item.productImage" :alt="item.productName" />
                <span v-if="item.remaining <= 0" class="sk-card__soldout">已抢完</span>
              </router-link>

              <div class="sk-card__body">
                <h3 class="sk-card__name">{{ item.productName }}</h3>
                <p class="sk-card__spec muted">{{ item.skuSpecText }}</p>

                <div class="sk-card__price">
                  <b>¥{{ formatMoney(item.seckillPrice) }}</b>
                  <s>¥{{ formatMoney(item.originalPrice) }}</s>
                </div>

                <div class="sk-card__progress">
                  <div class="sk-card__bar">
                    <i :style="{ width: `${soldPercent(item)}%` }" />
                  </div>
                  <span class="muted">仅剩 {{ item.remaining }} 件 · 限购 {{ item.limitPerUser }} 件</span>
                </div>

                <button
                  class="btn btn-buy btn-block"
                  :disabled="item.remaining <= 0 || buyingId === item.id"
                  @click="grab(item)"
                >
                  {{ item.remaining <= 0 ? '已抢完' : buyingId === item.id ? '处理中…' : '立即抢购' }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </template>

      <EmptyState v-else icon="⚡" title="当前没有进行中的秒杀" desc="敬请期待下一场活动" />
    </div>
  </div>
</template>

<style scoped>
.sk-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  background: linear-gradient(120deg, #7a1f1f, #c0392b);
  color: #fff;
  border-radius: 12px;
  padding: 30px 34px;
  margin-bottom: 22px;
}
.sk-hero h1 {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 8px;
}
.sk-hero p {
  color: #ffd9a0;
  font-size: 15px;
}
.sk-hero__timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 10px;
  padding: 12px 22px;
}
.sk-hero__label {
  font-size: 12px;
  color: #ffd9a0;
}
.sk-hero__timer b {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}
.sk-loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}
.sk-block {
  margin-bottom: 26px;
}
.sk-block__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.sk-block__head h2 {
  font-size: 19px;
  font-weight: 800;
}
.sk-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.sk-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.sk-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.sk-card__img {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  background: #f5f6f8;
}
.sk-card__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sk-card__soldout {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
.sk-card__body {
  padding: 12px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.sk-card__name {
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sk-card__spec {
  font-size: 12px;
}
.sk-card__price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
}
.sk-card__price b {
  font-size: 20px;
  font-weight: 900;
  color: var(--amz-price);
}
.sk-card__price s {
  font-size: 12.5px;
  color: var(--text-secondary);
}
.sk-card__progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
}
.sk-card__bar {
  height: 8px;
  border-radius: 999px;
  background: #ffe3d6;
  overflow: hidden;
}
.sk-card__bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff9d2e, #e03131);
}
.sk-card__body .btn {
  margin-top: auto;
}
.muted {
  color: var(--text-secondary);
}

@media (max-width: 1200px) {
  .sk-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .sk-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
