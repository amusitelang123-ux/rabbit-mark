<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { orderApi } from '@/api'
import type { Order } from '@/api/types'
import { ORDER_STATUS_TEXT, ORDER_TABS } from '@/constants/order'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'
import PriceTag from '@/components/PriceTag.vue'
import PayDialog from './components/PayDialog.vue'

const router = useRouter()
const ui = useUiStore()

const orders = ref<Order[]>([])
const loading = ref(true)
const active = ref<number | 'all'>('all')
const payVisible = ref(false)
const payOrder = ref<Order | null>(null)

const tabs = ORDER_TABS

const filtered = computed(() =>
  active.value === 'all' ? orders.value : orders.value.filter((o) => o.status === active.value),
)

function statusClass(status: number): string {
  if (status === 10) return 'is-warn'
  if (status === 40 || status === 70) return 'is-muted'
  return 'is-primary'
}

async function load() {
  loading.value = true
  orders.value = await orderApi.list()
  loading.value = false
}

function act(order: Order, action: string) {
  if (action === '去支付') {
    payOrder.value = order
    payVisible.value = true
    return
  }
  if (action === '查看详情') {
    router.push(`/order/${order.orderNo}`)
    return
  }
  if (action === '取消订单') {
    void runOrderOp(() => orderApi.cancel(order.orderNo), '订单已取消')
    return
  }
  if (action === '确认收货') {
    void runOrderOp(() => orderApi.confirm(order.orderNo), '已确认收货')
    return
  }
  if (action === '提醒发货') {
    ui.toast('已提醒商家尽快发货', 'success')
    return
  }
  ui.toast(`${action}（演示）`, 'info')
}

async function runOrderOp(op: () => Promise<unknown>, successMsg: string) {
  try {
    await op()
    ui.toast(successMsg, 'success')
    await load()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '操作失败', 'error')
  }
}

function onPaid() {
  load()
}

function actionsFor(status: number): string[] {
  switch (status) {
    case 10:
      return ['取消订单', '去支付', '查看详情']
    case 20:
      return ['提醒发货', '查看详情']
    case 30:
      return ['查看物流', '确认收货', '查看详情']
    case 40:
      return ['评价晒单', '再次购买', '查看详情']
    default:
      return ['再次购买', '删除订单']
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="orders card">
        <header class="orders__head">
          <h1>我的订单</h1>
        </header>

        <div class="orders__tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            :class="{ 'is-active': active === t.key }"
            @click="active = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="loading" class="orders__loading">正在加载订单…</div>

        <template v-else-if="filtered.length">
          <article v-for="o in filtered" :key="o.orderNo" class="order">
            <header class="order__head">
              <div class="order__meta">
                <span>{{ o.createdAt }}</span>
                <span>订单号：{{ o.orderNo }}</span>
                <span class="muted">收件人：{{ o.receiverName }}</span>
              </div>
              <span class="order__status" :class="statusClass(o.status)">{{ ORDER_STATUS_TEXT[o.status] }}</span>
            </header>

            <div class="order__body">
              <ul class="order__items">
                <li v-for="it in o.items" :key="it.id">
                  <img :src="it.productImage" :alt="it.productName" />
                  <div>
                    <p class="order__item-name">{{ it.productName }}</p>
                    <p class="muted">{{ it.skuSpecText }} × {{ it.quantity }}</p>
                  </div>
                </li>
              </ul>

              <div class="order__amount">
                <p class="muted">共 {{ o.items.reduce((s, i) => s + i.quantity, 0) }} 件商品</p>
                <PriceTag :amount="o.payAmount" />
              </div>

              <div class="order__actions">
                <button
                  v-for="a in actionsFor(o.status)"
                  :key="a"
                  class="btn btn-sm"
                  :class="a === '去支付' ? 'btn-primary' : 'btn-secondary'"
                  @click="act(o, a)"
                >
                  {{ a }}
                </button>
              </div>
            </div>
          </article>
        </template>

        <EmptyState v-else icon="📦" title="暂无相关订单" desc="快去挑选好物，开启第一单吧">
          <router-link to="/" class="btn btn-primary">去逛逛</router-link>
        </EmptyState>
      </div>

      <PayDialog
        v-model="payVisible"
        :order-no="payOrder?.orderNo ?? ''"
        :amount="payOrder?.payAmount ?? 0"
        @paid="onPaid"
      />
    </div>
  </div>
</template>

<style scoped>
.orders {
  padding: 22px;
}
.orders__head h1 {
  font-size: 26px;
  margin-bottom: 16px;
}
.orders__tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto;
}
.orders__tabs button {
  border: none;
  background: none;
  padding: 12px 18px;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}
.orders__tabs button:hover {
  color: var(--text);
}
.orders__tabs button.is-active {
  color: var(--text);
  font-weight: 700;
  border-bottom-color: var(--amz-orange);
}
.orders__loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
}

.order {
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-top: 18px;
  overflow: hidden;
}
.order__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--bg-subtle);
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
}
.order__meta {
  display: flex;
  gap: 22px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}
.order__status {
  font-weight: 700;
  font-size: 14px;
}
.order__status.is-warn {
  color: var(--amz-price);
}
.order__status.is-primary {
  color: var(--amz-success);
}
.order__status.is-muted {
  color: var(--text-secondary);
}
.order__body {
  display: grid;
  grid-template-columns: 1fr 170px 180px;
  gap: 18px;
  padding: 18px;
  align-items: center;
}
.order__items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.order__items li {
  display: flex;
  gap: 12px;
  align-items: center;
}
.order__items img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.order__item-name {
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.order__amount {
  text-align: right;
  border-left: 1px solid var(--border-light);
  padding-left: 18px;
}
.order__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.order__actions .btn {
  border-radius: 100px;
}

@media (max-width: 900px) {
  .order__body {
    grid-template-columns: 1fr;
  }
  .order__amount {
    text-align: left;
    border-left: none;
    padding-left: 0;
  }
  .order__actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
