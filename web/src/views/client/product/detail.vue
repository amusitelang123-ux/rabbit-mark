<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productApi, userApi } from '@/api'
import type { CommentItem, Product } from '@/api/types'
import PriceTag from '@/components/PriceTag.vue'
import StarRating from '@/components/StarRating.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import ProductCard from '@/components/ProductCard.vue'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'


const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const ui = useUiStore()
const user = useUserStore()

const product = ref<Product | null>(null)
const comments = ref<CommentItem[]>([])
const recommend = ref<Product[]>([])
const loading = ref(true)

/** 图集预览图：鼠标悬停/键盘聚焦缩略图时临时展示，离开图集后清空并回到主图 */
const previewImage = ref('')
const selectedSpec = ref<Record<string, string>>({})
const quantity = ref(1)
const activeTab = ref<'detail' | 'spec' | 'review'>('detail')
const favorited = ref(false)

const specGroups = computed(() => {
  if (!product.value) return []
  const groups: { name: string; values: string[] }[] = []
  product.value.skus.forEach((s) => {
    Object.entries(s.spec).forEach(([name, value]) => {
      let g = groups.find((x) => x.name === name)
      if (!g) {
        g = { name, values: [] }
        groups.push(g)
      }
      if (!g.values.includes(value)) g.values.push(value)
    })
  })
  return groups
})

const selectedSku = computed(() => {
  if (!product.value) return undefined
  return product.value.skus.find((s) =>
    Object.entries(selectedSpec.value).every(([k, v]) => s.spec[k] === v),
  )
})

const displayPrice = computed(() => selectedSku.value?.price ?? product.value?.priceMin ?? 0)
const displayMarket = computed(() => selectedSku.value?.marketPrice ?? 0)
const displayStock = computed(() => selectedSku.value?.stock ?? product.value?.totalStock ?? 0)
const displayImage = computed(
  () => previewImage.value || product.value?.mainImage || selectedSku.value?.image || '',
)
const isComplete = computed(() => specGroups.value.every((g) => selectedSpec.value[g.name]))

const ratingDist = computed(() => {
  const dist = [0, 0, 0, 0, 0]
  comments.value.forEach((c) => (dist[5 - c.score] += 1))
  const total = comments.value.length || 1
  return dist.map((n, i) => ({ star: 5 - i, count: n, percent: Math.round((n / total) * 100) }))
})
const goodRate = computed(() => {
  if (!comments.value.length) return 100
  return Math.round((comments.value.filter((c) => c.score >= 4).length / comments.value.length) * 100)
})

function isValueAvailable(groupName: string, value: string): boolean {
  if (!product.value) return false
  const candidate = { ...selectedSpec.value, [groupName]: value }
  return product.value.skus.some(
    (s) => s.stock > 0 && Object.entries(candidate).every(([k, v]) => s.spec[k] === v),
  )
}

function pickSpec(groupName: string, value: string) {
  if (selectedSpec.value[groupName] === value) {
    const next = { ...selectedSpec.value }
    delete next[groupName]
    selectedSpec.value = next
  } else {
    selectedSpec.value = { ...selectedSpec.value, [groupName]: value }
  }
  quantity.value = 1
}

async function addToCart(silent = false): Promise<boolean> {
  if (!product.value) return false
  if (specGroups.value.length && !isComplete.value) {
    ui.toast('请先选择完整规格', 'error')
    return false
  }
  if (!selectedSku.value || selectedSku.value.stock <= 0) {
    ui.toast('该规格暂时缺货', 'error')
    return false
  }
  if (!user.isLoggedIn) {
    ui.toast('请先登录后再加购', 'info')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return false
  }
  await cart.add(product.value, selectedSku.value, quantity.value)
  if (!silent) ui.toast('已加入购物车')
  return true
}

async function buyNow() {
  if (await addToCart(true)) router.push('/checkout')
}

async function toggleFavorite() {
  if (!product.value) return
  if (!user.isLoggedIn) {
    ui.toast('请先登录后再收藏', 'info')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    const res = await userApi.toggleFavorite(product.value.id)
    favorited.value = res.favorited
    ui.toast(res.favorited ? '已加入收藏' : '已取消收藏')
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '操作失败', 'error')
  }
}

async function load(id: number) {
  loading.value = true
  const [p, c, r] = await Promise.all([
    productApi.detail(id),
    productApi.comments(id),
    productApi.recommend(id, 4),
  ])
  product.value = p ?? null
  comments.value = c
  recommend.value = r
  if (p) {
    previewImage.value = ''
    const first = p.skus[0]
    selectedSpec.value = first ? { ...first.spec } : {}
  }
  loading.value = false
}

onMounted(() => load(Number(route.params.id)))
watch(
  () => route.params.id,
  (id) => id && load(Number(id)),
)
</script>

<template>
  <div class="page">
    <div class="container">
      <div v-if="loading" class="pd-loading">正在加载商品详情…</div>

      <template v-else-if="product">
        <!-- Breadcrumb -->
        <nav class="crumb">
          <router-link to="/">首页</router-link>
          <span>/</span>
          <router-link :to="`/category/${product.topCategoryId}`">
            {{ product.topCategoryName }}
          </router-link>
          <span>/</span>
          <router-link :to="`/category/${product.categoryId}`">{{ product.categoryName }}</router-link>
          <span>/</span>
          <span class="crumb__cur">{{ product.name }}</span>
        </nav>

        <!-- Main card -->
        <div class="pd card">
          <!-- Gallery -->
          <div class="pd__gallery">
            <div class="pd__thumbs" @mouseleave="previewImage = ''">
              <button
                v-for="(img, i) in product.images"
                :key="i"
                type="button"
                :class="{ 'is-active': displayImage === img }"
                :aria-label="`查看 ${product.name} 第 ${i + 1} 张图片`"
                @mouseenter="previewImage = img"
                @focus="previewImage = img"
                @blur="previewImage = ''"
                @click="previewImage = img"
              >
                <img :src="img" :alt="`${product.name} 图 ${i + 1}`" />
              </button>
            </div>
            <div class="pd__stage">
              <img :src="displayImage" :alt="product.name" />
            </div>
          </div>

          <!-- Info -->
          <div class="pd__info">
            <h1 class="pd__title">{{ product.name }}</h1>
            <p class="pd__brand">
              品牌：
              <router-link :to="`/products?brandId=${product.brandId}`" class="link">{{ product.brandName }}</router-link>
              <span class="pd__subtitle">{{ product.subtitle }}</span>
            </p>
            <div class="pd__rating">
              <StarRating :score="product.avgScore" show-text :count="product.commentCount" />
              <span class="pd__goodrate">好评率 {{ goodRate }}%</span>
            </div>

            <div class="pd__pricebox">
              <PriceTag :amount="displayPrice" size="lg" :market="displayMarket" />
              <span v-if="product.tags[0]" class="badge-deal">{{ product.tags[0] }}</span>
            </div>
            <p class="pd__tax">含税价 · 满 99 元包邮 · 支持 7 天无理由退换</p>

            <hr class="pd__divider" />

            <!-- Specs -->
            <div v-for="g in specGroups" :key="g.name" class="pd__spec">
              <span class="pd__spec-label">{{ g.name }}</span>
              <div class="pd__spec-values">
                <button
                  v-for="v in g.values"
                  :key="v"
                  class="pd__spec-btn"
                  :class="{
                    'is-active': selectedSpec[g.name] === v,
                    'is-disabled': !isValueAvailable(g.name, v),
                  }"
                  @click="pickSpec(g.name, v)"
                >
                  {{ v }}
                </button>
              </div>
            </div>

            <div class="pd__meta">
              <span>库存：<b :class="{ 'is-low': displayStock < 20 }">{{ displayStock }}</b> {{ product.unit }}</span>
              <span>销量：{{ product.salesCount.toLocaleString() }}</span>
            </div>

            <div class="pd__about">
              <h4>关于此商品</h4>
              <ul>
                <li>· {{ product.subtitle }}</li>
                <li>· 平台自营正品，假一赔十</li>
                <li>· 小兔速达，48 小时内发货</li>
              </ul>
            </div>
          </div>

          <!-- Buy box -->
          <aside class="pd__buy">
            <PriceTag :amount="displayPrice" size="lg" />
            <p class="pd__buy-deliver">
              配送至 <b>湛江 赤坎区</b>
            </p>
            <p class="pd__buy-stock" :class="{ 'is-out': displayStock <= 0 }">
              {{ displayStock > 0 ? (displayStock < 20 ? `仅剩 ${displayStock} 件，欲购从速` : '现货 · 有货') : '暂时缺货' }}
            </p>
            <div class="pd__buy-qty">
              <span>数量</span>
              <QuantityStepper v-model="quantity" :max="Math.max(1, displayStock)" />
            </div>
            <button class="btn btn-primary btn-block pd__buy-btn" :disabled="displayStock <= 0" @click="addToCart()">
              加入购物车
            </button>
            <button class="btn btn-buy btn-block pd__buy-btn" :disabled="displayStock <= 0" @click="buyNow">
              立即购买
            </button>
            <div class="pd__buy-actions">
              <button @click="toggleFavorite">
                {{ favorited ? '♥ 已收藏' : '♡ 收藏' }}
              </button>
              <button @click="ui.toast('链接已复制（演示）', 'info')">分享</button>
            </div>
            <div class="pd__buy-secure">🔒 安全交易 · 信息加密</div>
          </aside>
        </div>

        <!-- Tabs -->
        <div class="pd-tabs card">
          <div class="pd-tabs__nav">
            <button :class="{ 'is-active': activeTab === 'detail' }" @click="activeTab = 'detail'">商品详情</button>
            <button :class="{ 'is-active': activeTab === 'spec' }" @click="activeTab = 'spec'">规格参数</button>
            <button :class="{ 'is-active': activeTab === 'review' }" @click="activeTab = 'review'">
              用户评价 ({{ product.commentCount }})
            </button>
          </div>

          <div class="pd-tabs__body">
            <div v-if="activeTab === 'detail'" class="pd-detail">
              <div class="pd-detail__placeholder">
                <div class="pd-detail__badge">商品详情</div>
                <h2>{{ product.name }}</h2>
                <p class="muted">{{ product.subtitle }}</p>
              </div>
              <div class="pd-detail__rich" v-html="product.detailHtml" />
              <img :src="product.images[1]" alt="详情图" class="pd-detail__banner" />
              <img :src="product.images[2]" alt="详情图" class="pd-detail__banner" />
            </div>

            <table v-else-if="activeTab === 'spec'" class="pd-spec-table">
              <tbody>
                <tr><th>商品名称</th><td>{{ product.name }}</td></tr>
                <tr><th>品牌</th><td>{{ product.brandName }}</td></tr>
                <tr><th>分类</th><td>{{ product.categoryName }}</td></tr>
                <tr><th>单位</th><td>{{ product.unit }}</td></tr>
                <tr v-for="g in specGroups" :key="g.name">
                  <th>{{ g.name }}</th>
                  <td>{{ g.values.join(' / ') }}</td>
                </tr>
                <tr><th>库存</th><td>{{ product.totalStock }}</td></tr>
              </tbody>
            </table>

            <div v-else class="pd-review">
              <aside class="pd-review__summary">
                <div class="pd-review__score">
                  <StarRating :score="product.avgScore" :size="22" />
                  <span>{{ product.avgScore.toFixed(1) }} / 5</span>
                </div>
                <p class="muted">共 {{ product.commentCount }} 条评价 · 好评率 {{ goodRate }}%</p>
                <div v-for="r in ratingDist" :key="r.star" class="pd-review__bar">
                  <span>{{ r.star }} 星</span>
                  <div class="pd-review__track"><div :style="{ width: `${r.percent}%` }" /></div>
                  <span class="muted">{{ r.percent }}%</span>
                </div>
              </aside>
              <ul class="pd-review__list">
                <li v-for="c in comments" :key="c.id" class="review">
                  <img :src="c.avatar" class="review__avatar" :alt="c.nickname" />
                  <div class="review__main">
                    <div class="review__head">
                      <b>{{ c.nickname }}</b>
                      <StarRating :score="c.score" :size="13" />
                    </div>
                    <p class="review__spec muted">{{ c.specText }} · {{ c.createdAt }}</p>
                    <p class="review__content">{{ c.content }}</p>
                    <div v-if="c.images.length" class="review__imgs">
                      <img v-for="(img, i) in c.images" :key="i" :src="img" alt="买家秀" />
                    </div>
                    <div v-if="c.replyContent" class="review__reply">
                      <b>商家回复：</b>{{ c.replyContent }}
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Recommend -->
        <section class="pd-recommend">
          <h2 class="section-title">看了又看</h2>
          <div class="grid-products">
            <ProductCard v-for="p in recommend" :key="p.id" :product="p" />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pd-loading {
  text-align: center;
  padding: 100px;
  color: var(--text-secondary);
}
.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--amz-link);
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.crumb a:hover {
  text-decoration: underline;
  color: var(--amz-link-hover);
}
.crumb__cur {
  color: var(--text-secondary);
}

.pd {
  display: grid;
  grid-template-columns: minmax(360px, 1.1fr) minmax(320px, 1.2fr) 300px;
  gap: 26px;
  padding: 24px;
}
.pd__gallery {
  display: flex;
  gap: 12px;
}
.pd__thumbs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pd__thumbs button {
  width: 54px;
  height: 54px;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 2px;
  background: #fff;
}
.pd__thumbs button.is-active {
  border-color: var(--amz-link);
  box-shadow: 0 0 0 1px var(--amz-link);
}
.pd__thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.pd__stage {
  flex: 1;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pd__stage img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.pd__info {
  min-width: 0;
}
.pd__title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 8px;
}
.pd__brand {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.pd__subtitle {
  margin-left: 10px;
  color: var(--text-secondary);
}
.pd__rating {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.pd__goodrate {
  color: var(--amz-success);
  font-weight: 700;
  font-size: 13px;
}
.pd__pricebox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0 4px;
}
.pd__tax {
  font-size: 12.5px;
  color: var(--text-secondary);
}
.pd__divider {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 16px 0;
}
.pd__spec {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.pd__spec-label {
  width: 48px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 14px;
  padding-top: 6px;
}
.pd__spec-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pd__spec-btn {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 14px;
  color: var(--text);
  transition: all 0.15s;
}
.pd__spec-btn:hover:not(.is-disabled) {
  border-color: var(--amz-navy-2);
}
.pd__spec-btn.is-active {
  border-color: var(--amz-navy-2);
  background: var(--amz-navy-2);
  color: #fff;
  font-weight: 700;
}
.pd__spec-btn.is-disabled {
  color: #b8bcbc;
  background: #f7f8f8;
  text-decoration: line-through;
  cursor: not-allowed;
}
.pd__meta {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--text-secondary);
  padding: 6px 0 14px;
}
.pd__meta b {
  color: var(--text);
}
.pd__meta b.is-low {
  color: var(--amz-danger);
}
.pd__about {
  background: var(--bg-subtle);
  border-radius: 8px;
  padding: 14px 16px;
}
.pd__about h4 {
  font-size: 14px;
  margin-bottom: 8px;
}
.pd__about li {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.9;
}

.pd__buy {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px;
  height: fit-content;
  align-self: start;
  background: #fff;
}
.pd__buy-deliver {
  font-size: 13px;
  color: var(--amz-link);
  margin-top: 8px;
}
.pd__buy-stock {
  font-size: 14px;
  color: var(--amz-success);
  font-weight: 700;
  margin: 8px 0 14px;
}
.pd__buy-stock.is-out {
  color: var(--amz-danger);
}
.pd__buy-qty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 14px;
}
.pd__buy-btn {
  margin-bottom: 10px;
  padding: 11px;
  font-weight: 700;
}
.pd__buy-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
.pd__buy-actions button {
  flex: 1;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 7px;
  font-size: 13px;
}
.pd__buy-actions button:hover {
  background: var(--bg-hover);
}
.pd__buy-secure {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 12px;
}

.pd-tabs {
  margin-top: 22px;
  overflow: hidden;
}
.pd-tabs__nav {
  display: flex;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-subtle);
}
.pd-tabs__nav button {
  border: none;
  background: none;
  padding: 15px 26px;
  font-size: 15px;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
}
.pd-tabs__nav button:hover {
  color: var(--text);
}
.pd-tabs__nav button.is-active {
  background: #fff;
  color: var(--text);
  font-weight: 700;
  border-bottom-color: var(--amz-orange);
}
.pd-tabs__body {
  padding: 24px;
}
.pd-detail__placeholder {
  text-align: center;
  padding: 14px 0 26px;
}
.pd-detail__badge {
  display: inline-block;
  background: var(--amz-navy-2);
  color: #fff;
  padding: 4px 14px;
  border-radius: 100px;
  font-size: 13px;
  margin-bottom: 12px;
}
.pd-detail__placeholder h2 {
  font-size: 22px;
  margin-bottom: 6px;
}
.pd-detail__rich {
  max-width: 720px;
  margin: 0 auto 20px;
  color: var(--text-secondary);
  line-height: 2;
}
.pd-detail__rich :deep(ul) {
  padding-left: 20px;
  list-style: disc;
}
.pd-detail__banner {
  width: 100%;
  max-width: 720px;
  margin: 0 auto 16px;
  border-radius: 8px;
}

.pd-spec-table {
  width: 100%;
  max-width: 720px;
  border-collapse: collapse;
}
.pd-spec-table th,
.pd-spec-table td {
  border: 1px solid var(--border-light);
  padding: 11px 16px;
  text-align: left;
  font-size: 14px;
}
.pd-spec-table th {
  width: 160px;
  background: var(--bg-subtle);
  font-weight: 600;
  color: var(--text-secondary);
}

.pd-review {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 30px;
}
.pd-review__score {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  margin-bottom: 4px;
}
.pd-review__bar {
  display: grid;
  grid-template-columns: 44px 1fr 40px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}
.pd-review__track {
  height: 8px;
  background: var(--bg-subtle);
  border-radius: 100px;
  overflow: hidden;
}
.pd-review__track div {
  height: 100%;
  background: var(--amz-star);
}
.pd-review__list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.review {
  display: flex;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}
.review:last-child {
  border-bottom: none;
}
.review__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
}
.review__head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.review__spec {
  font-size: 12px;
  margin: 3px 0 8px;
}
.review__content {
  font-size: 14px;
  line-height: 1.7;
}
.review__imgs {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.review__imgs img {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-light);
}
.review__reply {
  margin-top: 10px;
  background: var(--bg-subtle);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-secondary);
}
.pd-recommend {
  margin-top: 34px;
}

@media (max-width: 1200px) {
  .pd {
    grid-template-columns: minmax(320px, 1fr) minmax(320px, 1.2fr);
  }
  .pd__buy {
    grid-column: 1 / -1;
  }
}
@media (max-width: 820px) {
  .pd {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .pd__gallery {
    flex-direction: column-reverse;
  }
  .pd__thumbs {
    flex-direction: row;
  }
  .pd__title {
    font-size: 19px;
  }
  .pd-review {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .pd-tabs__nav button {
    padding: 13px 14px;
    font-size: 14px;
  }
  .pd-spec-table th {
    width: 100px;
  }
}
</style>
