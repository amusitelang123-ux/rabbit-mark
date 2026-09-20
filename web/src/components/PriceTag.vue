<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/utils/money'

const props = withDefaults(defineProps<{ amount: number; size?: 'sm' | 'md' | 'lg'; market?: number }>(), {
  size: 'md',
})

const parts = computed(() => {
  const [int, dec] = formatMoney(props.amount).split('.')
  return { int, dec }
})
</script>

<template>
  <span class="ptag" :class="`ptag--${size}`">
    <span class="ptag__sym">¥</span>
    <span class="ptag__int">{{ parts.int }}</span>
    <span class="ptag__dec">.{{ parts.dec }}</span>
    <span v-if="market && market > amount" class="ptag__market">¥{{ formatMoney(market) }}</span>
  </span>
</template>

<style scoped>
.ptag {
  color: var(--amz-price);
  font-weight: 700;
  white-space: nowrap;
}
.ptag__sym {
  font-size: 0.62em;
  vertical-align: top;
  position: relative;
  top: 0.18em;
}
.ptag__dec {
  font-size: 0.65em;
  vertical-align: top;
  position: relative;
  top: -0.02em;
}
.ptag--sm .ptag__int {
  font-size: 16px;
}
.ptag--md .ptag__int {
  font-size: 21px;
}
.ptag--lg .ptag__int {
  font-size: 28px;
}
.ptag__market {
  color: var(--text-secondary);
  font-weight: 400;
  font-size: 13px;
  text-decoration: line-through;
  margin-left: 8px;
}
</style>
