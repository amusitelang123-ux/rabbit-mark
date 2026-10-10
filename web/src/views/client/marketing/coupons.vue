<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { couponApi } from '@/api'
import type { Coupon } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'

const ui = useUiStore()
const coupons = ref<Coupon[]>([])
const loading = ref(true)
const received = ref<Set<number>>(new Set())

function label(c: Coupon): string {
  return c.type === 1 ? `¥${c.amount}` : `${(c.discountRate * 10).toFixed(1)}折`
}

async function receive(c: Coupon) {
  if (received.value.has(c.id)) return
  try {
    await couponApi.receive(c.id)
    received.value = new Set([...received.value, c.id])
    ui.toast(`已领取「${c.name}」`)
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '领取失败', 'error')
  }
}

onMounted(async () => {
  coupons.value = await couponApi.center()
  loading.value = false
})
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="cp-hero">
        <h1>领券中心</h1>
        <p>每日更新好券 · 下单自动匹配最优优惠</p>
      </div>

      <div v-if="loading" class="cp-loading">正在加载优惠券…</div>

      <div v-else-if="coupons.length" class="cp-grid">
        <article v-for="c in coupons" :key="c.id" class="cp" :class="{ 'is-received': received.has(c.id) }">
          <div class="cp__value">
            <b>{{ label(c) }}</b>
            <span v-if="c.type === 1">满 {{ c.minAmount }} 元可用</span>
            <span v-else>折扣上限 200 元</span>
          </div>
          <div class="cp__body">
            <h3>{{ c.name }}</h3>
            <p class="muted">{{ c.scopeText }}</p>
            <p class="muted">{{ c.validText }}</p>
          </div>
          <div class="cp__action">
            <button class="btn btn-primary btn-sm" :disabled="received.has(c.id)" @click="receive(c)">
              {{ received.has(c.id) ? '已领取' : '立即领取' }}
            </button>
          </div>
        </article>
      </div>

      <EmptyState v-else icon="🎟️" title="暂无可领取的优惠券" desc="请稍后再来看看" />
    </div>
  </div>
</template>

<style scoped>
.cp-hero {
  background: linear-gradient(120deg, #232f3e, #37475a);
  color: #fff;
  border-radius: 12px;
  padding: 34px 36px;
  margin-bottom: 22px;
}
.cp-hero h1 {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 8px;
}
.cp-hero p {
  color: var(--amz-orange);
  font-size: 15px;
}
.cp-loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}
.cp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
.cp {
  display: grid;
  grid-template-columns: 170px 1fr auto;
  align-items: center;
  gap: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.cp:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.cp__value {
  background: linear-gradient(135deg, #ff9d2e, #febd69);
  color: #fff;
  height: 100%;
  padding: 26px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  position: relative;
}
.cp__value::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 0;
  bottom: 0;
  width: 16px;
  background: radial-gradient(circle at center, #fff 4px, transparent 4px) center/16px 16px;
}
.cp__value b {
  font-size: 32px;
  font-weight: 900;
}
.cp__value span {
  font-size: 12px;
  opacity: 0.95;
}
.cp__body h3 {
  font-size: 17px;
  margin-bottom: 6px;
}
.cp__body p {
  font-size: 12.5px;
}
.cp__action {
  padding-right: 22px;
}
.cp.is-received {
  opacity: 0.7;
}

@media (max-width: 900px) {
  .cp-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .cp {
    grid-template-columns: 120px 1fr;
  }
  .cp__action {
    grid-column: 1 / -1;
    padding: 0 18px 18px;
  }
}
</style>
