<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi, paymentApi } from '@/api'
import type { Order } from '@/api/types'
import { formatMoney } from '@/utils/money'

/**
 * 支付同步回跳页（U-32）：
 * 沙箱/模拟网关在本页回跳后主动轮询支付状态，避免只依赖异步回调。
 * 真实网关接入后，此页即支付完成后的 return_url 落地页。
 */
const route = useRoute()
const router = useRouter()

const payNo = computed(() => String(route.query.payNo ?? ''))
const orderNo = computed(() => String(route.query.orderNo ?? ''))

type ResultState = 'checking' | 'success' | 'pending'
const state = ref<ResultState>('checking')
const order = ref<Order | null>(null)

async function poll(times = 8, interval = 1200): Promise<boolean> {
  for (let i = 0; i < times; i++) {
    if (!payNo.value) return false
    try {
      const res = await paymentApi.status(payNo.value)
      if (res.payStatus === 1) return true
    } catch {
      // 网络抖动时继续重试，状态以最后一次为准
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  return false
}

onMounted(async () => {
  if (orderNo.value) {
    order.value = (await orderApi.detail(orderNo.value).catch(() => null)) ?? null
  }
  state.value = (await poll()) ? 'success' : 'pending'
  if (state.value === 'success' && orderNo.value) {
    order.value = (await orderApi.detail(orderNo.value).catch(() => order.value)) ?? order.value
  }
})
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="pay-result card">
        <div class="pay-result__icon" :class="`is-${state}`">
          {{ state === 'checking' ? '⏳' : state === 'success' ? '✓' : '…' }}
        </div>

        <h1 class="pay-result__title">
          {{ state === 'checking' ? '正在确认支付结果…' : state === 'success' ? '支付成功' : '支付结果确认中' }}
        </h1>

        <p v-if="state === 'success'" class="pay-result__desc">
          订单已支付成功，我们会尽快为你发货。
        </p>
        <p v-else-if="state === 'pending'" class="pay-result__desc">
          支付回调可能稍有延迟，请稍后在「我的订单」中查看最新状态；如已扣款请勿重复支付。
        </p>
        <p v-else class="pay-result__desc">正在向支付网关查询交易状态，请稍候。</p>

        <dl v-if="order" class="pay-result__meta">
          <div><dt>订单号</dt><dd>{{ order.orderNo }}</dd></div>
          <div><dt>应付金额</dt><dd class="amount">¥{{ formatMoney(order.payAmount) }}</dd></div>
          <div><dt>订单状态</dt><dd>{{ order.status === 10 ? '待付款' : '已付款' }}</dd></div>
        </dl>

        <div class="pay-result__actions">
          <button
            v-if="orderNo"
            class="btn btn-primary"
            @click="router.replace(`/order/${orderNo}`)"
          >
            查看订单
          </button>
          <button class="btn btn-secondary" @click="router.replace('/orders')">我的订单</button>
          <button class="btn btn-secondary" @click="router.replace('/')">继续购物</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pay-result {
  max-width: 560px;
  margin: 48px auto;
  padding: 40px 32px;
  text-align: center;
}
.pay-result__icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  font-weight: 800;
  background: var(--bg-subtle);
  color: var(--text-secondary);
}
.pay-result__icon.is-success {
  background: #e8f7ee;
  color: #1a7f4b;
}
.pay-result__icon.is-checking {
  background: #fff4e5;
  color: #b45309;
}
.pay-result__title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 10px;
}
.pay-result__desc {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}
.pay-result__meta {
  margin: 24px auto 8px;
  max-width: 380px;
  text-align: left;
  background: var(--bg-subtle);
  border-radius: 10px;
  padding: 14px 18px;
}
.pay-result__meta div {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 14px;
}
.pay-result__meta dt {
  color: var(--text-secondary);
}
.pay-result__meta dd {
  font-weight: 600;
}
.pay-result__meta .amount {
  color: var(--amz-price);
}
.pay-result__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
  flex-wrap: wrap;
}
</style>
