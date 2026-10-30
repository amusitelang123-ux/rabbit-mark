<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { brandApi } from '@/api'
import type { Brand } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'

/** 品牌专区（U-08）：品牌聚合入口，点击进入按品牌筛选的商品列表 */
const router = useRouter()
const brands = ref<Brand[]>([])
const loading = ref(true)

function goBrand(brand: Brand) {
  router.push({ path: '/products', query: { brandId: String(brand.id) } })
}

onMounted(async () => {
  try {
    brands.value = await brandApi.list()
  } catch {
    brands.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <div class="container">
      <section class="brand-hero">
        <p class="brand-hero__eyebrow">BRAND ZONE</p>
        <h1>品牌专区</h1>
        <p>精选品牌官方好物，平台自营 · 正品保障</p>
      </section>

      <div v-if="loading" class="brand-loading">正在加载品牌…</div>

      <div v-else-if="brands.length" class="brand-grid">
        <button v-for="b in brands" :key="b.id" class="brand-card card" @click="goBrand(b)">
          <img v-if="b.logo" :src="b.logo" :alt="b.name" class="brand-card__logo" />
          <span v-else class="brand-card__initial">{{ b.name.slice(0, 1) }}</span>
          <span class="brand-card__name">{{ b.name }}</span>
          <span class="brand-card__action">进入品牌 ›</span>
        </button>
      </div>

      <EmptyState v-else icon="🏷️" title="暂无品牌" desc="品牌正在入驻中，敬请期待" />
    </div>
  </div>
</template>

<style scoped>
.brand-hero {
  border-radius: 12px;
  padding: 34px 36px;
  margin-bottom: 22px;
  color: #fff;
  background: linear-gradient(120deg, #232f3e, #37475a);
}
.brand-hero__eyebrow {
  font-size: 12px;
  letter-spacing: 3px;
  color: var(--amz-orange);
  font-weight: 700;
  margin-bottom: 8px;
}
.brand-hero h1 {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 6px;
}
.brand-hero p {
  opacity: 0.9;
}
.brand-loading {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}
.brand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 16px;
  border: 1px solid var(--border-light);
  background: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.brand-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}
.brand-card__logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 8px;
}
.brand-card__initial {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 800;
  color: #6b4300;
  background: linear-gradient(135deg, #ffe0a3, #febd69);
}
.brand-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.brand-card__action {
  font-size: 13px;
  color: var(--amz-link);
}
</style>
