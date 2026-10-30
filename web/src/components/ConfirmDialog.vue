<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
    loading?: boolean
  }>(),
  {
    title: '请确认',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    danger: false,
    loading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function close() {
  if (props.loading) return
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="cd-mask" @click.self="close">
    <div class="cd-modal card" role="dialog" aria-modal="true">
      <h2 class="cd-modal__title">{{ title }}</h2>
      <p class="cd-modal__message">{{ message }}</p>
      <div class="cd-modal__actions">
        <button class="btn btn-secondary" :disabled="loading" @click="close">{{ cancelText }}</button>
        <button
          class="btn"
          :class="danger ? 'cd-btn-danger' : 'btn-primary'"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ loading ? '处理中…' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cd-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}
.cd-modal {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}
.cd-modal__title {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 10px;
}
.cd-modal__message {
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre-wrap;
}
.cd-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.cd-btn-danger {
  background: #c0392b;
  border-color: #a93226;
  color: #fff;
}
.cd-btn-danger:hover:not(:disabled) {
  background: #a93226;
}
</style>
