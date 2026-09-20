<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductBrowser from '@/components/ProductBrowser.vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const app = useAppStore()

const keyword = computed(() => (route.query.keyword as string) ?? '')

function quickSearch(kw: string) {
  app.pushHistory(kw)
  router.push({ path: '/search', query: { keyword: kw } })
}
</script>

<template>
  <div class="page">
    <div class="container">
      <template v-if="keyword">
        <div class="search-head card">
          <h1 class="search-head__title">
            搜索 “<span>{{ keyword }}</span>”
          </h1>
          <div class="search-head__chips">
            <span class="muted">相关搜索：</span>
            <button v-for="h in app.hotKeywords.slice(0, 5)" :key="h" @click="quickSearch(h)">{{ h }}</button>
          </div>
        </div>
        <ProductBrowser :keyword="keyword" />
      </template>

      <template v-else>
        <div class="search-empty card">
          <h1>搜索小兔鲜</h1>
          <div class="search-empty__block">
            <h3>搜索历史
              <button v-if="app.searchHistory.length" @click="app.clearHistory()">清除</button>
            </h3>
            <div class="search-empty__chips">
              <button v-for="h in app.searchHistory" :key="h" class="chip" @click="quickSearch(h)">{{ h }}</button>
              <span v-if="!app.searchHistory.length" class="muted">暂无搜索历史</span>
            </div>
          </div>
          <div class="search-empty__block">
            <h3>热门搜索</h3>
            <div class="search-empty__chips">
              <button v-for="h in app.hotKeywords" :key="h" class="chip chip--hot" @click="quickSearch(h)">{{ h }}</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-head {
  padding: 18px 20px;
  margin-bottom: 18px;
}
.search-head__title {
  font-size: 20px;
  margin-bottom: 10px;
}
.search-head__title span {
  color: var(--amz-price);
}
.search-head__chips {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
}
.search-head__chips button {
  background: none;
  border: none;
  color: var(--amz-link);
  font-size: 13px;
  padding: 0;
}
.search-head__chips button:hover {
  text-decoration: underline;
}
.search-empty {
  padding: 30px;
}
.search-empty h1 {
  font-size: 24px;
  margin-bottom: 24px;
}
.search-empty__block {
  margin-bottom: 22px;
}
.search-empty__block h3 {
  font-size: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
}
.search-empty__block h3 button {
  background: none;
  border: none;
  color: var(--amz-link);
  font-size: 13px;
}
.search-empty__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  background: #f0f2f2;
  border: none;
  border-radius: 100px;
  padding: 6px 16px;
  font-size: 14px;
}
.chip--hot {
  background: #fff4e5;
  color: #b45309;
}
.chip:hover {
  background: #e3e6e6;
}
</style>
