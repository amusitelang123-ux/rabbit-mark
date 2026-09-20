<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ change: [page: number] }>()

const pages = computed(() => {
  const total = props.totalPages
  const cur = props.page
  const set = new Set<number>([1, total, cur, cur - 1, cur + 1])
  return [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
})

function go(p: number) {
  if (p < 1 || p > props.totalPages || p === props.page) return
  emit('change', p)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="分页">
    <button class="pager__btn" :disabled="page <= 1" @click="go(page - 1)">上一页</button>
    <template v-for="(p, i) in pages" :key="p">
      <span v-if="i > 0 && p - pages[i - 1] > 1" class="pager__gap">…</span>
      <button class="pager__btn" :class="{ 'is-active': p === page }" @click="go(p)">{{ p }}</button>
    </template>
    <button class="pager__btn" :disabled="page >= totalPages" @click="go(page + 1)">下一页</button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin: 28px 0 8px;
  flex-wrap: wrap;
}
.pager__btn {
  min-width: 38px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  font-size: 14px;
  color: var(--text);
}
.pager__btn:hover:not(:disabled):not(.is-active) {
  background: var(--bg-hover);
}
.pager__btn.is-active {
  background: var(--amz-navy-2);
  border-color: var(--amz-navy-2);
  color: #fff;
  font-weight: 700;
}
.pager__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pager__gap {
  color: var(--text-secondary);
}
</style>
