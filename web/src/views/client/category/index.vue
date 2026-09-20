<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductBrowser from '@/components/ProductBrowser.vue'
import { categoryApi } from '@/api'
import type { Category } from '@/api/types'
import { findTopCategoryId } from '@/utils/category'

const route = useRoute()
const router = useRouter()

const categories = ref<Category[]>([])
const tops = computed(() => categories.value.filter((c) => c.level === 1))

const categoryId = computed(() => {
  const raw = route.params.id
  return raw ? Number(raw) : undefined
})

const activeTop = computed(() =>
  categoryId.value ? findTopCategoryId(categoryId.value, categories.value) : undefined,
)

onMounted(async () => {
  categories.value = await categoryApi.tree()
})
</script>

<template>
  <div class="page">
    <div class="container">
      <nav class="catnav card">
        <button class="catnav__item" :class="{ 'is-active': !categoryId }" @click="router.push('/products')">
          <span class="catnav__icon">🏷️</span>
          <span>全部商品</span>
        </button>
        <button
          v-for="c in tops"
          :key="c.id"
          class="catnav__item"
          :class="{ 'is-active': activeTop === c.id }"
          @click="router.push(`/category/${c.id}`)"
        >
          <span class="catnav__icon">{{ c.icon }}</span>
          <span>{{ c.name }}</span>
        </button>
      </nav>

      <ProductBrowser :category-id="categoryId" />
    </div>
  </div>
</template>

<style scoped>
.catnav {
  display: flex;
  gap: 6px;
  padding: 14px;
  margin-bottom: 18px;
  overflow-x: auto;
}
.catnav__item {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 100px;
  padding: 8px 16px;
  font-size: 14px;
  white-space: nowrap;
  color: var(--text);
}
.catnav__item:hover {
  background: var(--bg-hover);
}
.catnav__item.is-active {
  background: var(--amz-navy-2);
  border-color: var(--amz-navy-2);
  color: #fff;
  font-weight: 700;
}
.catnav__icon {
  font-size: 16px;
}
</style>
