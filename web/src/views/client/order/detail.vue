<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { orderApi } from '@/api'
import type { Order } from '@/api/types'
import { ORDER_STATUS_TEXT } from '@/constants/order'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'
import PriceTag from '@/components/PriceTag.vue'
import { formatMoney } from '@/utils/money'

const route = useRoute()
const ui = useUiStore()

const order = ref<Order | null>(null)
const loading = ref(true)

const steps = [
  { status: 10, label: '提交订单' },
  { status: 20, label: '付款成功' },
  { status: 30, label: '商品出库' },
  { status: 40, label: '交易完成' },
]

const stepIndex = computed(() => {
  const s = order.value?.status ?? 10
  if (s <= 10) return 0
  if (s === 20) return 1
  if (s === 30) return 2
  return 3
})

const isClosed = computed(() => order.value && [50, 60, 70].includes(order.value.status))

function act(label: string) {
  if (label === '去支付') {
    ui.toast('跳转支付（演示）', 'info')
    return
  }
  ui.toast(`${label}（演示）`, 'info')
}

onMounted(async () => {
  order.value = (await orderApi.detail(route.params.orderNo as string)) ?? null
  loading.value = false
})
</script>

<template>
  <div class="page">
    <div class="container">
      <div v-if="loading" class="od-loading">正在加载订单…</div>

      <EmptyState v-else-if="!order" icon="📦" title="订单不存在" desc="该订单可能已被删除">
        <router-link to="/orders" class="btn btn-primary">返回订单列表</router-link>
      </EmptyState>

      <template v-else>
        <div class="od-head card">
          <div class="od-head__left">
            <h1>{{ ORDER_STATUS_TEXT[order.status] }}</h1>
            <p class="muted">订单号：{{ order.orderNo }} · 下单时间：{{ order.createdAt }}</p>
          </div>
          <div class="od-head__actions">
            <button class="btn btn-primary btn-sm" @click="act(order.status === 10 ? '去支付' : '再次购买')">
              {{ order.status === 10 ? '去支付' : '再次购买' }}
            </button>
            <button class="btn btn-secondary btn-sm" @click="ui.toast('联系客服（演示）', 'info')">联系客服</button>
          </div>
        </div>

        <div v-if="!isClosed" class="od-steps card">
          <div v-for="(s, i) in steps" :key="s.status" class="od-step" :class="{ 'is-done': i <= stepIndex, 'is-current': i === stepIndex }">
            <span class="od-step__dot">{{ i <= stepIndex ? '✓' : i + 1 }}</span>
            <span class="od-step__label">{{ s.label }}</span>
            <span v-if="i < steps.length - 1" class="od-step__line" />
          </div>
        </div>

        <div class="od-grid">
          <div>
            <section class="card block">
              <h2 class="block__title">收货信息</h2>
              <p class="od-addr">
                <b>{{ order.receiverName }}</b>
                <span>{{ order.receiverPhone }}</span>
              </p>
              <p class="muted">{{ order.receiverAddress }}</p>
              <p v-if="order.remark" class="od-remark">买家备注：{{ order.remark }}</p>
            </section>

            <section class="card block">
              <h2 class="block__title">商品信息</h2>
              <ul class="od-items">
                <li v-for="it in order.items" :key="it.id">
                  <img :src="it.productImage" :alt="it.productName" />
                  <div class="od-items__info">
                    <router-link :to="`/product/${it.productId}`" class="od-items__name">{{ it.productName }}</router-link>
                    <p class="muted">{{ it.skuSpecText }}</p>
                  </div>
                  <span class="od-items__price">¥{{ formatMoney(it.price) }} × {{ it.quantity }}</span>
                  <b class="od-items__subtotal">¥{{ formatMoney(it.subtotal) }}</b>
                </li>
              </ul>
            </section>

            <section v-if="order.logistics" class="card block">
              <h2 class="block__title">物流轨迹</h2>
              <p class="od-logi">
                <b>{{ order.logistics.company }}</b>
                <span class="muted">运单号：{{ order.logistics.trackingNo }}</span>
              </p>
              <ul class="timeline">
                <li v-for="(t, i) in order.logistics.traces" :key="i" :class="{ 'is-latest': i === 0 }">
                  <span class="timeline__dot" />
                  <div>
                    <p>{{ t.text }}</p>
                    <span class="muted">{{ t.time }}</span>
                  </div>
                </li>
              </ul>
            </section>
          </div>

          <aside class="card block od-summary">
            <h2 class="block__title">金额明细</h2>
            <div class="od-summary__row"><span>商品总额</span><b>¥{{ formatMoney(order.totalAmount) }}</b></div>
            <div class="od-summary__row"><span>运费</span><b>{{ order.freightAmount === 0 ? '免运费' : `¥${formatMoney(order.freightAmount)}` }}</b></div>
            <div class="od-summary__row"><span>优惠抵扣</span><b class="is-minus">-¥{{ formatMoney(order.couponAmount) }}</b></div>
            <div class="od-summary__total">
              <span>实付金额</span>
              <PriceTag :amount="order.payAmount" size="lg" />
            </div>
            <p class="od-summary__pay muted">
              支付方式：{{ order.payType ? ['', '微信支付', '支付宝', '余额', '沙箱支付'][order.payType] : '未支付' }}
            </p>
            <p v-if="order.payTime" class="od-summary__pay muted">支付时间：{{ order.payTime }}</p>
          </aside>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.od-loading {
  text-align: center;
  padding: 100px;
  color: var(--text-secondary);
}
.od-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px;
  gap: 16px;
  flex-wrap: wrap;
}
.od-head__left h1 {
  font-size: 24px;
  color: var(--amz-success);
  margin-bottom: 6px;
}
.od-head__actions {
  display: flex;
  gap: 10px;
}

.od-steps {
  display: flex;
  align-items: center;
  padding: 26px 30px;
  margin-top: 16px;
}
.od-step {
  display: flex;
  align-items: center;
  flex: 1;
  color: var(--text-muted);
}
.od-step:last-child {
  flex: 0;
}
.od-step__dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.od-step.is-done .od-step__dot {
  background: var(--amz-success);
  border-color: var(--amz-success);
  color: #fff;
}
.od-step.is-current .od-step__dot {
  box-shadow: 0 0 0 4px rgba(0, 118, 0, 0.15);
}
.od-step__label {
  margin-left: 10px;
  font-size: 14px;
  white-space: nowrap;
}
.od-step.is-done .od-step__label {
  color: var(--text);
  font-weight: 600;
}
.od-step__line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 12px;
}
.od-step.is-done .od-step__line {
  background: var(--amz-success);
}

.od-grid {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 18px;
  margin-top: 16px;
  align-items: start;
}
.block {
  padding: 20px;
  margin-bottom: 16px;
}
.block__title {
  font-size: 17px;
  font-weight: 800;
  margin-bottom: 14px;
}
.od-addr {
  display: flex;
  gap: 14px;
  margin-bottom: 4px;
}
.od-remark {
  margin-top: 10px;
  background: #fff8ec;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #8a5a00;
}

.od-items li {
  display: grid;
  grid-template-columns: 64px 1fr 130px 100px;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}
.od-items li:last-child {
  border-bottom: none;
}
.od-items img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}
.od-items__name {
  font-size: 14px;
}
.od-items__name:hover {
  color: var(--amz-link-hover);
}
.od-items__price {
  font-size: 13px;
  color: var(--text-secondary);
}
.od-items__subtotal {
  color: var(--amz-price);
  text-align: right;
}

.od-logi {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}
.timeline {
  padding-left: 8px;
  border-left: 2px solid var(--border-light);
}
.timeline li {
  display: flex;
  gap: 14px;
  padding: 0 0 18px 18px;
  position: relative;
}
.timeline li:last-child {
  padding-bottom: 0;
}
.timeline__dot {
  position: absolute;
  left: -9px;
  top: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--border);
  border: 3px solid #fff;
}
.timeline li.is-latest .timeline__dot {
  background: var(--amz-orange);
  box-shadow: 0 0 0 3px rgba(254, 189, 105, 0.35);
}
.timeline li p {
  font-size: 14px;
}
.timeline li.is-latest p {
  font-weight: 700;
}
.timeline li span {
  font-size: 12px;
}

.od-summary {
  position: sticky;
  top: calc(var(--header-h) + var(--subnav-h) + 12px);
}
.od-summary__row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}
.od-summary__row .is-minus {
  color: var(--amz-success);
}
.od-summary__total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
  margin-top: 8px;
}
.od-summary__total span {
  font-size: 16px;
  font-weight: 700;
}
.od-summary__pay {
  font-size: 12px;
  margin-top: 10px;
}

@media (max-width: 1000px) {
  .od-grid {
    grid-template-columns: 1fr;
  }
  .od-summary {
    position: static;
  }
}
@media (max-width: 768px) {
  .od-steps {
    padding: 18px 14px;
  }
  .od-step__label {
    display: none;
  }
  .od-items li {
    grid-template-columns: 56px 1fr auto;
    row-gap: 4px;
  }
  .od-items__price {
    grid-column: 2 / -1;
  }
}
</style>
