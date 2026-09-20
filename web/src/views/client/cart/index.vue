<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import PriceTag from '@/components/PriceTag.vue'
import { formatMoney } from '@/utils/money'

const router = useRouter()
const cart = useCartStore()
const user = useUserStore()
const ui = useUiStore()

const freight = computed(() => (cart.selectedTotal >= 99 || cart.selectedTotal === 0 ? 0 : 8))
const payable = computed(() => cart.selectedTotal + freight.value)
const freeGap = computed(() => Math.max(0, 99 - cart.selectedTotal))

function removeItem(skuId: number) {
  cart.remove([skuId])
  ui.toast('已移除商品', 'info')
}

function batchRemove() {
  if (!cart.selectedItems.length) return
  cart.remove(cart.selectedItems.map((i) => i.skuId))
  ui.toast('已删除选中商品', 'info')
}

function checkout() {
  if (!cart.selectedItems.length) {
    ui.toast('请先选择要结算的商品', 'error')
    return
  }
  if (!user.isLoggedIn) {
    ui.toast('请先登录', 'info')
    router.push({ name: 'login', query: { redirect: '/checkout' } })
    return
  }
  router.push('/checkout')
}
</script>

<template>
  <div class="page">
    <div class="container">
      <template v-if="cart.items.length">
        <div class="cart-layout">
          <section class="cart-main card">
            <header class="cart-main__head">
              <h1>购物车</h1>
              <span class="muted">价格有效 · 库存充足</span>
            </header>

            <div class="cart-main__cols">
              <label class="ck">
                <input type="checkbox" :checked="cart.allSelected" @change="cart.toggleAll(($event.target as HTMLInputElement).checked)" />
                <span>全选</span>
              </label>
              <span>商品</span>
              <span>单价</span>
              <span>数量</span>
              <span>小计</span>
              <span />
            </div>

            <ul class="cart-list">
              <li v-for="it in cart.items" :key="it.skuId" class="cart-item" :class="{ 'is-invalid': it.invalid }">
                <label class="ck">
                  <input
                    type="checkbox"
                    :checked="it.selected"
                    :disabled="it.invalid"
                    @change="cart.toggle(it.skuId, ($event.target as HTMLInputElement).checked)"
                  />
                </label>

                <div class="cart-item__product">
                  <router-link :to="`/product/${it.productId}`">
                    <img :src="it.image" :alt="it.name" />
                  </router-link>
                  <div class="cart-item__info">
                    <router-link :to="`/product/${it.productId}`" class="cart-item__name">{{ it.name }}</router-link>
                    <p class="cart-item__spec muted">{{ it.specText }}</p>
                    <p class="cart-item__stock" :class="{ 'is-out': it.invalid }">
                      {{ it.invalid ? '商品已失效' : it.stock < 20 ? `仅剩 ${it.stock} 件` : '现货' }}
                    </p>
                    <div class="cart-item__mobile-actions">
                      <button @click="removeItem(it.skuId)">删除</button>
                    </div>
                  </div>
                </div>

                <div class="cart-item__price">
                  <PriceTag :amount="it.price" size="sm" />
                </div>

                <div class="cart-item__qty">
                  <QuantityStepper
                    :model-value="it.quantity"
                    :max="it.stock"
                    @update:model-value="(v) => cart.updateQuantity(it.skuId, v)"
                  />
                </div>

                <div class="cart-item__subtotal">
                  <b>¥{{ formatMoney(it.price * it.quantity) }}</b>
                </div>

                <button class="cart-item__del" @click="removeItem(it.skuId)">删除</button>
              </li>
            </ul>

            <footer class="cart-main__foot">
              <button class="link" @click="batchRemove">删除选中商品</button>
              <router-link to="/products" class="link">继续购物</router-link>
            </footer>
          </section>

          <aside class="cart-summary card">
            <div class="cart-summary__free">
              <template v-if="freeGap > 0">
                再买 <b>¥{{ formatMoney(freeGap) }}</b> 即可免运费
              </template>
              <template v-else>🎉 已享受免运费</template>
            </div>
            <div class="cart-summary__row">
              <span>已选商品（{{ cart.selectedCount }} 件）</span>
              <b>¥{{ formatMoney(cart.selectedTotal) }}</b>
            </div>
            <div class="cart-summary__row">
              <span>运费</span>
              <b>{{ freight === 0 ? '免运费' : `¥${formatMoney(freight)}` }}</b>
            </div>
            <div class="cart-summary__row cart-summary__row--total">
              <span>合计</span>
              <PriceTag :amount="payable" size="lg" />
            </div>
            <button class="btn btn-primary btn-block cart-summary__btn" :disabled="!cart.selectedItems.length" @click="checkout">
              去结算
            </button>
            <p class="cart-summary__tip muted">订单可享 7 天无理由退换 · 支持多种支付方式</p>
          </aside>
        </div>
      </template>

      <EmptyState v-else icon="🛒" title="购物车还是空的" desc="快去挑选心仪的好物吧">
        <router-link to="/" class="btn btn-primary">去逛逛</router-link>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.cart-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 18px;
  align-items: start;
}
.cart-main {
  padding: 22px;
}
.cart-main__head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}
.cart-main__head h1 {
  font-size: 26px;
}
.cart-main__head span {
  font-size: 13px;
}
.cart-main__cols,
.cart-item {
  display: grid;
  grid-template-columns: 40px 1fr 110px 140px 110px 60px;
  align-items: center;
  gap: 12px;
}
.cart-main__cols {
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
}
.ck {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.ck input {
  width: 17px;
  height: 17px;
  accent-color: var(--amz-link);
}
.cart-list {
  padding-top: 8px;
}
.cart-item {
  padding: 18px 0;
  border-bottom: 1px solid var(--border-light);
}
.cart-item:last-child {
  border-bottom: none;
}
.cart-item__product {
  display: flex;
  gap: 14px;
  min-width: 0;
}
.cart-item__product img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.cart-item__info {
  min-width: 0;
}
.cart-item__name {
  font-size: 15px;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cart-item__name:hover {
  color: var(--amz-link-hover);
}
.cart-item__spec {
  font-size: 12.5px;
  margin: 5px 0 4px;
}
.cart-item__stock {
  font-size: 12.5px;
  color: var(--amz-success);
}
.cart-item__stock.is-out {
  color: var(--amz-danger);
}
.cart-item__subtotal {
  font-size: 17px;
  color: var(--amz-price);
}
.cart-item__del {
  background: none;
  border: none;
  color: var(--amz-link);
  font-size: 13px;
}
.cart-item__del:hover {
  text-decoration: underline;
  color: var(--amz-link-hover);
}
.cart-item__mobile-actions {
  display: none;
}
.cart-item.is-invalid {
  opacity: 0.6;
}
.cart-main__foot {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.cart-main__foot button,
.cart-main__foot a {
  background: none;
  border: none;
  font-size: 14px;
}

.cart-summary {
  padding: 20px;
  position: sticky;
  top: calc(var(--header-h) + var(--subnav-h) + 12px);
}
.cart-summary__free {
  background: #e7f4e8;
  color: var(--amz-success);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 16px;
}
.cart-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}
.cart-summary__row--total {
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
  margin-top: 14px;
}
.cart-summary__row--total span {
  font-size: 16px;
  font-weight: 700;
}
.cart-summary__btn {
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  margin-top: 6px;
}
.cart-summary__tip {
  font-size: 12px;
  text-align: center;
  margin-top: 12px;
}

@media (max-width: 1000px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }
  .cart-summary {
    position: static;
  }
}
@media (max-width: 768px) {
  .cart-main {
    padding: 14px;
  }
  .cart-main__cols {
    display: none;
  }
  .cart-item {
    grid-template-columns: 30px 1fr;
    grid-template-areas:
      'ck product'
      '. qty'
      '. subtotal';
    row-gap: 10px;
    align-items: start;
  }
  .cart-item .ck {
    grid-area: ck;
  }
  .cart-item__product {
    grid-area: product;
  }
  .cart-item__price,
  .cart-item__del {
    display: none;
  }
  .cart-item__qty {
    grid-area: qty;
  }
  .cart-item__subtotal {
    grid-area: subtotal;
  }
  .cart-item__mobile-actions {
    display: block;
    margin-top: 6px;
  }
  .cart-item__mobile-actions button {
    background: none;
    border: none;
    color: var(--amz-link);
    font-size: 13px;
    padding: 0;
  }
}
</style>
