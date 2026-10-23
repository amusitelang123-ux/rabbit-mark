<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { noticeApi } from '@/api'
import type { Notice } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'

const ui = useUiStore()

const notices = ref<Notice[]>([])
const loading = ref(true)
const errorMsg = ref('')
const page = ref(1)
const pageSize = 10

/** 后端 limit 上限 50，一次取回后由前端分页展示 */
const FETCH_LIMIT = 50

const totalPages = computed(() => Math.max(1, Math.ceil(notices.value.length / pageSize)))
const pageItems = computed(() =>
  notices.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const reachedLimit = computed(() => notices.value.length >= FETCH_LIMIT)

function summary(n: Notice): string {
  const text = (n.content || '').replace(/\s+/g, ' ').trim()
  if (!text) return '暂无详细内容'
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    notices.value = await noticeApi.list(FETCH_LIMIT)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '公告加载失败'
    ui.toast(errorMsg.value, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="nt-hero">
        <h1>平台公告</h1>
        <p>服务升级 · 活动预告 · 配送与售后说明</p>
      </div>

      <div v-if="loading" class="nt-loading">正在加载公告…</div>

      <div v-else-if="errorMsg" class="card nt-error">
        <p>{{ errorMsg }}</p>
        <button class="btn btn-secondary btn-sm" type="button" @click="load">重新加载</button>
      </div>

      <ul v-else-if="notices.length" class="nt-list">
        <li v-for="n in pageItems" :key="n.id" class="card nt-item">
          <router-link :to="`/notices/${n.id}`" class="nt-item__link">
            <div class="nt-item__head">
              <span class="tag nt-item__type">公告</span>
              <h3 class="nt-item__title">{{ n.title }}</h3>
            </div>
            <p class="nt-item__desc muted">{{ summary(n) }}</p>
            <div class="nt-item__meta muted">
              <span>发布于 {{ n.publishAt }}</span>
              <span class="nt-item__more">查看全文 ›</span>
            </div>
          </router-link>
        </li>
      </ul>

      <EmptyState v-else icon="📢" title="暂无公告" desc="平台有新的公告时会第一时间在这里展示">
        <button class="btn btn-secondary btn-sm" type="button" @click="load">刷新试试</button>
      </EmptyState>

      <Pagination v-if="notices.length" :page="page" :total-pages="totalPages" @change="page = $event" />

      <p v-if="reachedLimit" class="nt-tip muted">当前展示最近 {{ FETCH_LIMIT }} 条公告，更早的公告请通过帮助中心咨询。</p>
    </div>
  </div>
</template>

<style scoped>
.nt-hero {
  background: linear-gradient(120deg, #232f3e, #37475a);
  color: #fff;
  border-radius: 12px;
  padding: 34px 36px;
  margin-bottom: 22px;
}
.nt-hero h1 {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 8px;
}
.nt-hero p {
  color: var(--amz-orange);
  font-size: 15px;
}
.nt-loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}
.nt-error {
  padding: 26px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.nt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.nt-item {
  padding: 18px 22px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.nt-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.nt-item__link {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--text);
  text-decoration: none;
}
.nt-item__head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nt-item__type {
  flex-shrink: 0;
}
.nt-item__title {
  font-size: 17px;
  font-weight: 700;
}
.nt-item__link:hover .nt-item__title {
  color: var(--amz-price);
}
.nt-item__desc {
  font-size: 13.5px;
  line-height: 1.7;
}
.nt-item__meta {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
}
.nt-item__more {
  color: var(--amz-link);
}
.nt-tip {
  margin-top: 16px;
  text-align: center;
  font-size: 12.5px;
}
</style>
