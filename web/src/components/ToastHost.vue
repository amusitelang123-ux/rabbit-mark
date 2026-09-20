<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="`toast--${t.type}`">
        <span class="toast__icon">{{ t.type === 'error' ? '⚠' : t.type === 'info' ? 'ℹ' : '✓' }}</span>
        <span>{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--amz-navy);
  color: #fff;
  padding: 11px 20px;
  border-radius: 10px;
  box-shadow: var(--shadow-pop);
  font-size: 14px;
  font-weight: 500;
}
.toast--success .toast__icon {
  color: #7bd88f;
}
.toast--error .toast__icon {
  color: #ff9b8a;
}
.toast--info .toast__icon {
  color: var(--amz-orange);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
