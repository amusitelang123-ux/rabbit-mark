<script setup lang="ts">
withDefaults(
  defineProps<{
    score: number
    size?: number
    showText?: boolean
    count?: number
  }>(),
  { size: 15, showText: false },
)
</script>

<template>
  <span class="stars" :title="`${score.toFixed(1)} 星`">
    <span class="stars__icons" :style="{ fontSize: `${size}px` }" aria-hidden="true">
      <span v-for="i in 5" :key="i" class="stars__star" :class="{ 'is-on': i <= Math.round(score) }">★</span>
    </span>
    <span v-if="showText" class="stars__text">{{ score.toFixed(1) }}</span>
    <span v-if="count !== undefined" class="stars__count">({{ count.toLocaleString() }})</span>
  </span>
</template>

<style scoped>
.stars {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}
.stars__star {
  color: var(--amz-star-empty);
}
.stars__star.is-on {
  color: var(--amz-star);
}
.stars__text {
  color: var(--amz-link);
  font-size: 13px;
}
.stars__count {
  color: var(--amz-link);
  font-size: 13px;
}
</style>
