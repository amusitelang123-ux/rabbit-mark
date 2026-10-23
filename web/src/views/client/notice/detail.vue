<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { noticeApi } from '@/api'
import type { Notice } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()

const notice = ref<Notice | null>(null)
const loading = ref(true)
const errorMsg = ref('')

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const id = Number(route.params.id)
    if (!Number.isFinite(id) || id <= 0) throw new Error('公告不存在')
    notice.value = await noticeApi.detail(id)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '公告加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="container">
      <nav class="nt-back">
        <router-link to="/notices" class="nt-back__link">‹ 返回公告列表</router-link>
      </nav>

      <div v-if="loading" class="nt-loading">正在加载公告…</div>

      <article v-else-if="notice" class="card nt-detail">
        <h1 class="nt-detail__title">{{ notice.title }}</h1>
        <div class="nt-detail__meta muted">
          <span class="tag">公告</span>
          <span>发布于 {{ notice.publishAt }}</span>
        </div>
        <div class="nt-detail__body">{{ notice.content || '（暂无详细内容）' }}</div>
      </article>

      <EmptyState v-else icon="📢" :title="errorMsg || '公告不存在'" desc="该公告可能已下线或链接有误">
        <router-link to="/notices" class="btn btn-secondary btn-sm">返回公告列表</router-link>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.nt-back {
  margin-bottom: 14px;
  font-size: 14px;
}
.nt-back__link {
  color: var(--amz-link);
  text-decoration: none;
}
.nt-back__link:hover {
  color: var(--amz-link-hover);
  text-decoration: underline;
}
.nt-loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}
.nt-detail {
  padding: 28px 34px;
}
.nt-detail__title {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 12px;
  line-height: 1.4;
}
.nt-detail__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  margin-bottom: 20px;
}
.nt-detail__body {
  font-size: 15px;
  line-height: 2;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
