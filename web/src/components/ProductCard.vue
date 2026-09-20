<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/api/types'
import PriceTag from './PriceTag.vue'
import StarRating from './StarRating.vue'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import { useMock } from '@/api'

const props = defineProps<{ product: Product }>()

const router = useRouter()
const cart = useCartStore()
const user = useUserStore()
const ui = useUiStore()

const isRange = computed(() => props.product.priceMin !== props.product.priceMax)

async function quickAdd() {
  const sku = props.product.skus[0]
  if (props.product.skus.length > 1) {
    router.push(`/product/${props.product.id}`)
    return
  }
  if (!sku || sku.stock <= 0) {
    ui.toast('该商品暂时缺货', 'error')
    return
  }
  if (!useMock && !user.isLoggedIn) {
    ui.toast('请先登录后再加购', 'info')
    router.push({ name: 'login', query: { redirect: `/product/${props.product.id}` } })
    return
  }
  try {
    await cart.add(props.product, sku)
    ui.toast('已加入购物车')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '加入购物车失败', 'error')
  }
}
</script>

<template>
  <article class="pcard">
    <router-link :to="`/product/${product.id}`" class="pcard__media">
      <img :src="product.mainImage" :alt="product.name" loading="lazy" />
      <span v-if="product.tags[0]" class="pcard__flag">{{ product.tags[0] }}</span>
    </router-link>

    <div class="pcard__body">
      <router-link :to="`/product/${product.id}`" class="pcard__title">{{ product.name }}</router-link>

      <div class="pcard__rating">
        <StarRating :score="product.avgScore" :count="product.commentCount" />
      </div>

      <div class="pcard__price">
        <PriceTag :amount="product.priceMin" />
        <span v-if="isRange" class="pcard__range">起</span>
      </div>

      <p class="pcard__subtitle">{{ product.subtitle }}</p>

      <div class="pcard__badges">
        <span class="badge-prime">小兔速达</span>
        <span class="pcard__sales">已售 {{ product.salesCount.toLocaleString() }}</span>
      </div>

      <button class="btn btn-primary btn-sm pcard__btn" :disabled="product.totalStock <= 0" @click="quickAdd">
        {{ product.totalStock <= 0 ? '暂时缺货' : '加入购物车' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.pcard {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
  border: 1px solid transparent;
}
.pcard:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
.pcard__media {
  position: relative;
  display: block;
  background: #fff;
  padding: 14px;
  height: 210px;
}
.pcard__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.pcard__flag {
  position: absolute;
  top: 10px;
  left: 10px;
  background: var(--amz-danger);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}
.pcard__body {
  padding: 0 14px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.pcard__title {
  font-size: 14px;
  color: var(--text);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}
.pcard__title:hover {
  color: var(--amz-link-hover);
}
.pcard__rating {
  margin: 6px 0 4px;
}
.pcard__price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.pcard__range {
  font-size: 12px;
  color: var(--text-secondary);
}
.pcard__subtitle {
  color: var(--text-secondary);
  font-size: 12.5px;
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 32px;
}
.pcard__badges {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 10px;
}
.badge-prime {
  color: var(--amz-prime);
  font-weight: 700;
  font-size: 12px;
}
.pcard__sales {
  color: var(--text-muted);
  font-size: 12px;
}
.pcard__btn {
  margin-top: auto;
}
</style>
