<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; title: string; desc?: string }>(), { icon: '🛒' })
</script>

<template>
  <div class="empty">
    <div class="empty__icon">{{ icon }}</div>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="desc" class="empty__desc">{{ desc }}</p>
    <div class="empty__action"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}
.empty__icon {
  font-size: 54px;
  margin-bottom: 14px;
  opacity: 0.85;
}
.empty__title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}
.empty__desc {
  color: var(--text-secondary);
  margin-bottom: 18px;
}
</style>
