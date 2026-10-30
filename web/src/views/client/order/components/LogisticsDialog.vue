<script setup lang="ts">
import { ref, watch } from 'vue'
import { orderApi } from '@/api'
import type { OrderLogisticsDetail } from '@/api/types'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ modelValue: boolean; orderNo: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const ui = useUiStore()
const loading = ref(false)
const error = ref('')
const data = ref<OrderLogisticsDetail | null>(null)

async function load() {
  if (!props.orderNo) return
  loading.value = true
  error.value = ''
  try {
    data.value = await orderApi.logistics(props.orderNo)
  } catch (e) {
    data.value = null
    error.value = e instanceof Error ? e.message : '物流信息加载失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      data.value = null
      error.value = ''
      void load()
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function copyTrackingNo() {
  const trackingNo = data.value?.trackingNo
  if (!trackingNo) return
  if (!navigator.clipboard) {
    ui.toast('当前浏览器不支持复制，请手动记录运单号', 'info')
    return
  }
  navigator.clipboard
    .writeText(trackingNo)
    .then(() => ui.toast('运单号已复制', 'success'))
    .catch(() => ui.toast('复制失败，请手动记录运单号', 'error'))
}
</script>

<template>
  <div v-if="modelValue" class="lg-mask" @click.self="close">
    <div class="lg-modal card" role="dialog" aria-modal="true">
      <header class="lg-modal__head">
        <div>
          <h2>物流详情</h2>
          <p class="muted">订单号：{{ orderNo }}</p>
        </div>
        <button class="lg-modal__close" aria-label="关闭" @click="close">✕</button>
      </header>

      <div v-if="loading" class="lg-state muted">正在查询物流信息…</div>
      <p v-else-if="error" class="lg-state lg-state--error">{{ error }}</p>

      <template v-else-if="data">
        <div v-if="data.hasLogistics" class="lg-summary">
          <div>
            <b>{{ data.company || '快递公司' }}</b>
            <p class="muted">运单号：{{ data.trackingNo || '-' }}</p>
            <p v-if="data.shipTime" class="muted">发货时间：{{ data.shipTime }}</p>
          </div>
          <button v-if="data.trackingNo" class="btn btn-secondary btn-sm" @click="copyTrackingNo">
            复制运单号
          </button>
        </div>

        <ul v-if="data.traces.length" class="lg-timeline">
          <li v-for="(t, i) in data.traces" :key="`${t.time}-${i}`" :class="{ 'is-latest': i === 0 }">
            <span class="lg-timeline__dot" />
            <div>
              <p>{{ t.text }}</p>
              <span class="muted">{{ t.time }}</span>
            </div>
          </li>
        </ul>

        <div v-else class="lg-state">
          <p class="lg-state__icon">🚚</p>
          <p class="muted">
            {{ data.status >= 30 ? '物流轨迹更新中，请稍后再试' : '商家还未发货，请耐心等待' }}
          </p>
        </div>
      </template>

      <div class="lg-modal__foot">
        <button class="btn btn-secondary" :disabled="loading" @click="load">刷新物流</button>
        <button class="btn btn-primary" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lg-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}
.lg-modal {
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  padding: 22px;
}
.lg-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.lg-modal__head h2 {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 4px;
}
.lg-modal__head .muted {
  font-size: 13px;
}
.lg-modal__close {
  border: none;
  background: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
}
.lg-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: var(--bg-subtle);
  border-radius: 10px;
  padding: 14px 16px;
}
.lg-summary b {
  font-size: 15px;
}
.lg-summary .muted {
  font-size: 13px;
  margin-top: 4px;
}
.lg-timeline {
  margin-top: 20px;
  padding-left: 8px;
  border-left: 2px solid var(--border-light);
}
.lg-timeline li {
  display: flex;
  gap: 14px;
  padding: 0 0 18px 18px;
  position: relative;
}
.lg-timeline li:last-child {
  padding-bottom: 0;
}
.lg-timeline__dot {
  position: absolute;
  left: -9px;
  top: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--border);
  border: 3px solid #fff;
}
.lg-timeline li.is-latest .lg-timeline__dot {
  background: var(--amz-orange);
  box-shadow: 0 0 0 3px rgba(254, 189, 105, 0.35);
}
.lg-timeline li p {
  font-size: 14px;
}
.lg-timeline li.is-latest p {
  font-weight: 700;
}
.lg-timeline li span {
  font-size: 12px;
}
.lg-state {
  text-align: center;
  padding: 32px 12px;
  color: var(--text-secondary);
}
.lg-state--error {
  color: #c0392b;
}
.lg-state__icon {
  font-size: 30px;
  margin-bottom: 8px;
}
.lg-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
</style>
