<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProductBrowser from '@/components/ProductBrowser.vue'

const route = useRoute()
const categoryId = computed(() => (route.query.categoryId ? Number(route.query.categoryId) : undefined))
</script>

<template>
  <div class="page">
    <div class="container">
      <ProductBrowser :category-id="categoryId" />
    </div>
  </div>
</template>
