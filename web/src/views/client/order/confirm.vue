<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addressApi, couponApi, orderApi } from '@/api'
import type { Address, Coupon } from '@/api/types'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'
import PriceTag from '@/components/PriceTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import AddressFormModal from '@/components/AddressFormModal.vue'
import { addMoney, formatMoney } from '@/utils/money'

const router = useRouter()
const cart = useCartStore()
const ui = useUiStore()

const addresses = ref<Address[]>([])
const coupons = ref<Coupon[]>([])
const showAddressModal = ref(false)
const selectedAddressId = ref<number | null>(null)
const selectedCouponId = ref<number | null>(null)
const remark = ref('')
const invoice = ref<'none' | 'normal' | 'special'>('none')
const submitting = ref(false)

const items = computed(() => cart.selectedItems)
const goodsTotal = computed(() => cart.selectedTotal)
const freight = computed(() => (goodsTotal.value >= 99 || goodsTotal.value === 0 ? 0 : 8))
const usableCoupons = computed(() => coupons.value.filter((c) => goodsTotal.value >= c.minAmount))
const selectedCoupon = computed(() => usableCoupons.value.find((c) => c.id === selectedCouponId.value))
const couponAmount = computed(() => {
  if (!selectedCoupon.value) return 0
  if (selectedCoupon.value.type === 1) return Math.min(selectedCoupon.value.amount, goodsTotal.value)
  return goodsTotal.value * (1 - selectedCoupon.value.discountRate)
})
const payAmount = computed(() => addMoney(goodsTotal.value, freight.value) - couponAmount.value)

function couponLabel(c: Coupon): string {
  return c.type === 1 ? `满${c.minAmount}减${c.amount}` : `${(c.discountRate * 10).toFixed(1)}折`
}

function onAddressCreated(address: Address) {
  addresses.value.push(address)
  selectedAddressId.value = address.id
  ui.toast('收货地址添加成功')
}

async function submit() {
  if (!selectedAddressId.value) {
    ui.toast('请选择收货地址', 'error')
    return
  }
  if (!items.value.length) return
  submitting.value = true
  try {
    const order = await orderApi.create({
      addressId: selectedAddressId.value ?? undefined,
      couponId: selectedCouponId.value ?? undefined,
      remark: remark.value || undefined,
    })
    await cart.clearSelected()
    ui.toast(`下单成功，订单号 ${order.orderNo}`)
    router.push('/orders')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '提交订单失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const [addrs, cps] = await Promise.all([addressApi.list(), couponApi.center()])
  addresses.value = addrs
  coupons.value = cps
  selectedAddressId.value = addrs.find((a) => a.isDefault)?.id ?? addrs[0]?.id ?? null
})
</script>

<template>
  <div class="page">
    <div class="container">
      <EmptyState v-if="!items.length" icon="📦" title="没有待结算的商品" desc="请先在购物车中选择商品">
        <router-link to="/cart" class="btn btn-primary">返回购物车</router-link>
      </EmptyState>

      <div v-else class="checkout">
        <div class="checkout__main">
          <!-- Address -->
          <section class="card block">
            <h2 class="block__title">选择收货地址</h2>
            <div class="addr-grid">
              <button
                v-for="a in addresses"
                :key="a.id"
                class="addr"
                :class="{ 'is-active': selectedAddressId === a.id }"
                @click="selectedAddressId = a.id"
              >
                <div class="addr__head">
                  <b>{{ a.receiver }}</b>
                  <span class="muted">{{ a.phone }}</span>
                  <span v-if="a.isDefault" class="tag">默认</span>
                </div>
                <p class="addr__detail">{{ a.province }}{{ a.city }}{{ a.district }}{{ a.detail }}</p>
              </button>
              <button class="addr addr--add" @click="showAddressModal = true">＋ 新增地址</button>
            </div>
          </section>

          <!-- Items -->
          <section class="card block">
            <h2 class="block__title">商品清单</h2>
            <div class="items-head">
              <span>商品</span><span>单价</span><span>数量</span><span>小计</span>
            </div>
            <ul class="items">
              <li v-for="it in items" :key="it.skuId" class="items__row">
                <div class="items__product">
                  <img :src="it.image" :alt="it.name" />
                  <div>
                    <router-link :to="`/product/${it.productId}`" class="items__name">{{ it.name }}</router-link>
                    <p class="muted">{{ it.specText }}</p>
                  </div>
                </div>
                <span>¥{{ formatMoney(it.price) }}</span>
                <span>x{{ it.quantity }}</span>
                <b class="items__subtotal">¥{{ formatMoney(it.price * it.quantity) }}</b>
              </li>
            </ul>
          </section>

          <!-- Coupon -->
          <section class="card block">
            <h2 class="block__title">优惠券</h2>
            <div v-if="usableCoupons.length" class="coupons">
              <button
                class="coupon"
                :class="{ 'is-active': selectedCouponId === null }"
                @click="selectedCouponId = null"
              >
                <b>不使用优惠券</b>
              </button>
              <button
                v-for="c in usableCoupons"
                :key="c.id"
                class="coupon"
                :class="{ 'is-active': selectedCouponId === c.id }"
                @click="selectedCouponId = selectedCouponId === c.id ? null : c.id"
              >
                <b>{{ couponLabel(c) }}</b>
                <span>{{ c.name }}</span>
              </button>
            </div>
            <p v-else class="muted">暂无可用优惠券</p>
          </section>

          <!-- Extra -->
          <section class="card block">
            <h2 class="block__title">发票与备注</h2>
            <div class="field-row">
              <span>发票类型</span>
              <div class="invoice">
                <button :class="{ 'is-active': invoice === 'none' }" @click="invoice = 'none'">不开发票</button>
                <button :class="{ 'is-active': invoice === 'normal' }" @click="invoice = 'normal'">电子普票</button>
                <button :class="{ 'is-active': invoice === 'special' }" @click="invoice = 'special'">增值税专票</button>
              </div>
            </div>
            <div class="field-row">
              <span>订单备注</span>
              <input v-model="remark" class="input" placeholder="选填，如：请尽快发货" maxlength="100" />
            </div>
          </section>
        </div>

        <!-- Summary -->
        <aside class="summary card">
          <h2 class="block__title">订单摘要</h2>
          <div class="summary__row"><span>商品总额</span><b>¥{{ formatMoney(goodsTotal) }}</b></div>
          <div class="summary__row"><span>运费</span><b>{{ freight === 0 ? '免运费' : `¥${formatMoney(freight)}` }}</b></div>
          <div class="summary__row"><span>优惠抵扣</span><b class="is-minus">-¥{{ formatMoney(couponAmount) }}</b></div>
          <div class="summary__total">
            <span>应付金额</span>
            <PriceTag :amount="payAmount" size="lg" />
          </div>
          <button class="btn btn-buy btn-block summary__btn" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : '提交订单' }}
          </button>
          <ul class="summary__notes">
            <li>· 点击提交即表示同意《小兔鲜用户协议》</li>
            <li>· 提交后请在 30 分钟内完成支付</li>
          </ul>
        </aside>
      </div>
    </div>

    <AddressFormModal v-model="showAddressModal" @created="onAddressCreated" />
  </div>
</template>

<style scoped>
.checkout {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 18px;
  align-items: start;
}
.block {
  padding: 20px;
  margin-bottom: 16px;
}
.block__title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 16px;
}
.addr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.addr {
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  background: #fff;
  transition: all 0.15s;
}
.addr:hover {
  border-color: var(--amz-navy-3);
}
.addr.is-active {
  border-color: var(--amz-orange);
  box-shadow: 0 0 0 2px rgba(254, 189, 105, 0.5);
  background: #fffdf7;
}
.addr__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.addr__detail {
  font-size: 13px;
  color: var(--text-secondary);
}
.addr--add {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--amz-link);
  border-style: dashed;
  font-size: 14px;
}

.items-head,
.items__row {
  display: grid;
  grid-template-columns: 1fr 100px 70px 100px;
  align-items: center;
  gap: 12px;
}
.items-head {
  font-size: 13px;
  color: var(--text-secondary);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}
.items__row {
  padding: 14px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
}
.items__row:last-child {
  border-bottom: none;
}
.items__product {
  display: flex;
  gap: 12px;
  min-width: 0;
}
.items__product img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
}
.items__name {
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.items__name:hover {
  color: var(--amz-link-hover);
}
.items__subtotal {
  color: var(--amz-price);
}

.coupons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.coupon {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
  text-align: left;
}
.coupon:hover {
  border-color: var(--amz-navy-3);
}
.coupon.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
}
.coupon b {
  color: var(--amz-price);
  font-size: 15px;
}
.coupon span {
  font-size: 12px;
  color: var(--text-secondary);
}

.field-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}
.field-row > span {
  width: 70px;
  color: var(--text-secondary);
  font-size: 14px;
  flex-shrink: 0;
}
.invoice {
  display: flex;
  gap: 8px;
}
.invoice button {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
}
.invoice button.is-active {
  border-color: var(--amz-navy-2);
  background: var(--amz-navy-2);
  color: #fff;
}

.summary {
  padding: 20px;
  position: sticky;
  top: calc(var(--header-h) + var(--subnav-h) + 12px);
}
.summary__row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}
.summary__row .is-minus {
  color: var(--amz-success);
}
.summary__total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
  margin-top: 8px;
}
.summary__total span {
  font-size: 16px;
  font-weight: 700;
}
.summary__btn {
  margin-top: 16px;
  padding: 12px;
  font-weight: 700;
}
.summary__notes {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.9;
}

@media (max-width: 1000px) {
  .checkout {
    grid-template-columns: 1fr;
  }
  .summary {
    position: static;
  }
}
@media (max-width: 768px) {
  .addr-grid,
  .coupons {
    grid-template-columns: 1fr;
  }
  .items-head {
    display: none;
  }
  .items__row {
    grid-template-columns: 1fr auto;
    row-gap: 6px;
  }
  .items__product {
    grid-column: 1 / -1;
  }
}
</style>
