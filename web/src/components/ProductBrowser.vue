<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { brandApi, categoryApi, productApi } from '@/api'
import type { Brand, Category, Product } from '@/api/types'
import ProductCard from './ProductCard.vue'
import Pagination from './Pagination.vue'
import EmptyState from './EmptyState.vue'
import { findTopCategoryId } from '@/utils/category'

const props = withDefaults(
  defineProps<{ categoryId?: number; keyword?: string; showCategoryTree?: boolean }>(),
  { showCategoryTree: true },
)

const categories = ref<Category[]>([])
const brands = ref<Brand[]>([])
const products = ref<Product[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(false)

const route = useRoute()
const activeTop = ref<number | undefined>(undefined)

/** 支持 /products?brandId=x 直达（商品详情品牌链接、品牌专区） */
function brandIdFromRoute(): number | undefined {
  const raw = Number(route.query.brandId)
  return Number.isFinite(raw) && raw > 0 ? raw : undefined
}

const query = reactive({
  categoryId: props.categoryId,
  keyword: props.keyword,
  brandId: brandIdFromRoute(),
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  sortBy: 'default' as 'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'new',
  page: 1,
  pageSize: 12,
})

const sorts = [
  { key: 'default', label: '综合排序' },
  { key: 'sales', label: '销量优先' },
  { key: 'priceAsc', label: '价格从低到高' },
  { key: 'priceDesc', label: '价格从高到低' },
  { key: 'new', label: '最新上架' },
] as const

const priceRanges = [
  { label: '0-99 元', min: 0, max: 99 },
  { label: '100-299 元', min: 100, max: 299 },
  { label: '300-599 元', min: 300, max: 599 },
  { label: '600 元以上', min: 600, max: undefined },
]

const tops = computed(() => categories.value.filter((c) => c.level === 1))
const children = computed(() => categories.value.filter((c) => c.parentId === activeTop.value))
const currentCategoryName = computed(() => {
  const c = categories.value.find((x) => x.id === query.categoryId)
  return c?.name ?? (query.keyword ? `“${query.keyword}” 的搜索结果` : '全部商品')
})

async function fetchList() {
  loading.value = true
  const res = await productApi.list({ ...query })
  products.value = res.list
  total.value = res.total
  totalPages.value = res.totalPages
  loading.value = false
}

function pickTop(id: number) {
  activeTop.value = activeTop.value === id ? undefined : id
  query.categoryId = activeTop.value
  query.page = 1
  fetchList()
}

function pickCategory(id: number | undefined) {
  query.categoryId = id
  query.page = 1
  fetchList()
}

function pickBrand(id: number) {
  query.brandId = query.brandId === id ? undefined : id
  query.page = 1
  fetchList()
}

function pickPrice(min: number, max?: number) {
  const same = query.minPrice === min && query.maxPrice === max
  query.minPrice = same ? undefined : min
  query.maxPrice = same ? undefined : max
  query.page = 1
  fetchList()
}

function setSort(key: typeof query.sortBy) {
  query.sortBy = key
  query.page = 1
  fetchList()
}

function resetFilters() {
  query.brandId = undefined
  query.minPrice = undefined
  query.maxPrice = undefined
  query.categoryId = props.categoryId
  activeTop.value = undefined
  query.page = 1
  fetchList()
}

watch(
  () => props.categoryId,
  (id) => {
    query.categoryId = id
    activeTop.value = id ? findTopCategoryId(id, categories.value) : undefined
    query.brandId = undefined
    query.page = 1
    fetchList()
  },
)
watch(
  () => props.keyword,
  (kw) => {
    query.keyword = kw
    query.page = 1
    fetchList()
  },
)
watch(
  () => route.query.brandId,
  () => {
    const id = brandIdFromRoute()
    if (id === query.brandId) return
    query.brandId = id
    query.page = 1
    fetchList()
  },
)

onMounted(async () => {
  const [cats, bs] = await Promise.all([categoryApi.tree(), brandApi.list()])
  categories.value = cats
  brands.value = bs
  if (query.categoryId) activeTop.value = findTopCategoryId(query.categoryId, categories.value)
  fetchList()
})
</script>

<template>
  <div class="browser">
    <!-- Sidebar -->
    <aside v-if="showCategoryTree" class="side card">
      <h3 class="side__title">商品分类</h3>
      <ul class="side__tree">
        <li>
          <button :class="{ 'is-active': !query.categoryId }" @click="pickCategory(undefined)">全部分类</button>
        </li>
        <li v-for="c in tops" :key="c.id">
          <button :class="{ 'is-open': activeTop === c.id }" @click="pickTop(c.id)">
            <span>{{ c.icon }} {{ c.name }}</span>
            <span class="side__arrow">{{ activeTop === c.id ? '▾' : '▸' }}</span>
          </button>
          <ul v-if="activeTop === c.id" class="side__children">
            <li v-for="child in children" :key="child.id">
              <button :class="{ 'is-active': query.categoryId === child.id }" @click="pickCategory(child.id)">
                {{ child.name }}
              </button>
            </li>
          </ul>
        </li>
      </ul>

      <h3 class="side__title side__title--mt">品牌</h3>
      <div class="side__brands">
        <button
          v-for="b in brands"
          :key="b.id"
          class="side__brand"
          :class="{ 'is-active': query.brandId === b.id }"
          @click="pickBrand(b.id)"
        >
          {{ b.name }}
        </button>
      </div>

      <h3 class="side__title side__title--mt">价格区间</h3>
      <div class="side__prices">
        <button
          v-for="r in priceRanges"
          :key="r.label"
          :class="{ 'is-active': query.minPrice === r.min && query.maxPrice === r.max }"
          @click="pickPrice(r.min, r.max)"
        >
          {{ r.label }}
        </button>
      </div>

      <button class="btn btn-secondary btn-block side__reset" @click="resetFilters">重置筛选</button>
    </aside>

    <!-- Main -->
    <section class="main">
      <div class="toolbar card">
        <div class="toolbar__crumb">
          <span class="muted">商品分类 /</span>
          <strong>{{ currentCategoryName }}</strong>
          <span class="muted toolbar__count">共 {{ total }} 件商品</span>
        </div>
        <div class="toolbar__sorts">
          <button
            v-for="s in sorts"
            :key="s.key"
            :class="{ 'is-active': query.sortBy === s.key }"
            @click="setSort(s.key)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">正在加载商品…</div>

      <template v-else>
        <div v-if="products.length" class="grid-products">
          <ProductCard v-for="p in products" :key="p.id" :product="p" />
        </div>
        <EmptyState v-else icon="🔍" title="没有找到相关商品" desc="换个关键词或调整筛选条件试试">
          <button class="btn btn-primary" @click="resetFilters">重置筛选</button>
        </EmptyState>
      </template>

      <Pagination :page="query.page" :total-pages="totalPages" @change="(p) => { query.page = p; fetchList() }" />
    </section>
  </div>
</template>

<style scoped>
.browser {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 18px;
  align-items: start;
}
.side {
  padding: 18px;
  position: sticky;
  top: calc(var(--header-h) + var(--subnav-h) + 12px);
}
.side__title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 10px;
}
.side__title--mt {
  margin-top: 22px;
}
.side__tree button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  background: none;
  border: none;
  text-align: left;
  padding: 7px 8px;
  border-radius: 6px;
  font-size: 13.5px;
  color: var(--text);
}
.side__tree button:hover {
  background: var(--bg-hover);
}
.side__tree button.is-active {
  background: #fff4e5;
  color: #b45309;
  font-weight: 700;
}
.side__tree button.is-open {
  font-weight: 700;
}
.side__children {
  padding-left: 12px;
  border-left: 2px solid var(--border-light);
  margin-left: 8px;
}
.side__children button {
  font-size: 13px;
  color: var(--text-secondary);
}
.side__arrow {
  color: var(--text-muted);
  font-size: 11px;
}
.side__brands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.side__brand {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 13px;
}
.side__brand:hover {
  background: var(--bg-hover);
}
.side__brand.is-active {
  background: var(--amz-navy-2);
  color: #fff;
  border-color: var(--amz-navy-2);
}
.side__prices {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.side__prices button {
  background: none;
  border: none;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13.5px;
  color: var(--amz-link);
}
.side__prices button:hover {
  background: var(--bg-hover);
}
.side__prices button.is-active {
  background: #e7f3f8;
  font-weight: 700;
}
.side__reset {
  margin-top: 22px;
}

.main {
  min-width: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.toolbar__crumb {
  font-size: 14px;
}
.toolbar__count {
  margin-left: 10px;
  font-size: 13px;
}
.toolbar__sorts {
  display: flex;
  gap: 4px;
  background: var(--bg-subtle);
  border-radius: 8px;
  padding: 3px;
}
.toolbar__sorts button {
  border: none;
  background: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}
.toolbar__sorts button.is-active {
  background: #fff;
  color: var(--text);
  font-weight: 700;
  box-shadow: var(--shadow-card);
}
.loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
  background: #fff;
  border-radius: var(--radius);
}

@media (max-width: 900px) {
  .browser {
    grid-template-columns: 1fr;
  }
  .side {
    position: static;
  }
}
</style>
