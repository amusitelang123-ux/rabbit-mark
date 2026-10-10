<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { orderApi, refundApi } from '@/api'
import type { Order } from '@/api/types'
import { ORDER_STATUS_TEXT } from '@/constants/order'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'
import PriceTag from '@/components/PriceTag.vue'
import PayDialog from './components/PayDialog.vue'
import { formatMoney } from '@/utils/money'

const route = useRoute()
const ui = useUiStore()

const order = ref<Order | null>(null)
const loading = ref(true)
const payVisible = ref(false)

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

async function reload() {
  order.value = (await orderApi.detail(route.params.orderNo as string)) ?? null
}

function pay() {
  payVisible.value = true
}

async function cancelOrder() {
  if (!order.value) return
  try {
    await orderApi.cancel(order.value.orderNo)
    ui.toast('订单已取消', 'success')
    await reload()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '操作失败', 'error')
  }
}

async function confirmOrder() {
  if (!order.value) return
  try {
    await orderApi.confirm(order.value.orderNo)
    ui.toast('已确认收货', 'success')
    await reload()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '操作失败', 'error')
  }
}

function remindShip() {
  ui.toast('已提醒商家尽快发货', 'success')
}

const refundVisible = ref(false)
const refundType = ref(1)
const refundReason = ref('')
const refundSubmitting = ref(false)
const canRefund = computed(() => order.value && [20, 30, 40].includes(order.value.status))

function openRefund() {
  refundType.value = 1
  refundReason.value = ''
  refundVisible.value = true
}

async function submitRefund() {
  if (!order.value) return
  if (!refundReason.value.trim()) {
    ui.toast('请填写售后原因', 'error')
    return
  }
  refundSubmitting.value = true
  try {
    await refundApi.apply({
      orderNo: order.value.orderNo,
      type: refundType.value,
      reason: refundReason.value.trim(),
    })
    ui.toast('售后申请已提交，请等待审核')
    refundVisible.value = false
    await reload()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '提交失败', 'error')
  } finally {
    refundSubmitting.value = false
  }
}

onMounted(async () => {
  await reload()
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
            <template v-if="order.status === 10">
              <button class="btn btn-secondary btn-sm" @click="cancelOrder">取消订单</button>
              <button class="btn btn-primary btn-sm" @click="pay">去支付</button>
            </template>
            <button v-else-if="order.status === 20" class="btn btn-secondary btn-sm" @click="remindShip">提醒发货</button>
            <button v-else-if="order.status === 30" class="btn btn-primary btn-sm" @click="confirmOrder">确认收货</button>
            <button v-else class="btn btn-primary btn-sm" @click="ui.toast('再次购买（演示）', 'info')">再次购买</button>
            <button v-if="canRefund" class="btn btn-secondary btn-sm" @click="openRefund">申请售后</button>
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
                    <p class="muted">
                      <span v-if="it.seckill" class="od-seckill-tag">秒杀</span>
                      {{ it.skuSpecText }}
                    </p>
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

            <section class="card block">
              <h2 class="block__title">订单进度</h2>
              <ul class="od-logs">
                <li v-for="log in order.logs" :key="log.id">
                  <span class="od-logs__dot" />
                  <div>
                    <p class="od-logs__action">{{ log.actionText }}</p>
                    <p class="muted">{{ log.createdAt }}<span v-if="log.remark"> · {{ log.remark }}</span></p>
                  </div>
                </li>
              </ul>
              <p v-if="!order.logs.length" class="muted">暂无进度记录</p>
            </section>
          </div>

          <aside class="card block od-summary">
            <h2 class="block__title">金额明细</h2>
            <div class="od-summary__row"><span>商品总额</span><b>¥{{ formatMoney(order.totalAmount) }}</b></div>
            <div class="od-summary__row"><span>运费</span><b>{{ order.freightAmount === 0 ? '免运费' : `¥${formatMoney(order.freightAmount)}` }}</b></div>
            <div v-if="order.seckillAmount > 0" class="od-summary__row">
              <span>秒杀优惠</span><b class="is-minus">-¥{{ formatMoney(order.seckillAmount) }}</b>
            </div>
            <div class="od-summary__row"><span>优惠券抵扣</span><b class="is-minus">-¥{{ formatMoney(order.couponAmount) }}</b></div>
            <div v-if="order.promotionAmount > 0" class="od-summary__row">
              <span>满减优惠</span><b class="is-minus">-¥{{ formatMoney(order.promotionAmount) }}</b>
            </div>
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

        <PayDialog v-model="payVisible" :order-no="order.orderNo" :amount="order.payAmount" @paid="reload" />

        <div v-if="refundVisible" class="rf-mask" @click.self="refundVisible = false">
          <div class="rf-modal card">
            <h2 class="rf-title">申请售后</h2>
            <p class="muted">订单号：{{ order.orderNo }} · 实付 ¥{{ formatMoney(order.payAmount) }}</p>

            <p class="rf-label">售后类型</p>
            <div class="rf-types">
              <button
                v-for="t in [{ v: 1, l: '仅退款' }, { v: 2, l: '退货退款' }, { v: 3, l: '换货' }]"
                :key="t.v"
                class="rf-type"
                :class="{ 'is-active': refundType === t.v }"
                @click="refundType = t.v"
              >
                {{ t.l }}
              </button>
            </div>

            <p class="rf-label">售后原因</p>
            <textarea v-model="refundReason" class="rf-textarea" rows="3" placeholder="请描述遇到的问题" />

            <div class="rf-actions">
              <button class="btn btn-secondary" @click="refundVisible = false">取消</button>
              <button class="btn btn-primary" :disabled="refundSubmitting" @click="submitRefund">
                {{ refundSubmitting ? '提交中…' : '提交申请' }}
              </button>
            </div>
          </div>
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
.od-seckill-tag {
  display: inline-block;
  background: #c0392b;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  padding: 3px 5px;
  border-radius: 4px;
  margin-right: 4px;
  vertical-align: middle;
}
.od-logs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.od-logs li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.od-logs__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--amz-orange);
  margin-top: 6px;
  flex-shrink: 0;
}
.od-logs__action {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
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

.rf-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}
.rf-modal {
  width: 100%;
  max-width: 440px;
  padding: 22px;
}
.rf-title {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 6px;
}
.rf-label {
  font-size: 14px;
  font-weight: 700;
  margin: 16px 0 8px;
}
.rf-types {
  display: flex;
  gap: 10px;
}
.rf-type {
  flex: 1;
  padding: 9px 0;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
}
.rf-type.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
  color: var(--amz-price);
  font-weight: 700;
}
.rf-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}
.rf-textarea:focus {
  border-color: var(--amz-orange);
}
.rf-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>
