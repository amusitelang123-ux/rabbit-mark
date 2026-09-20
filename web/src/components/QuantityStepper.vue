<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: number; min?: number; max?: number }>(), {
  min: 1,
  max: 99,
})
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function change(delta: number) {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta))
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="stepper">
    <button class="stepper__btn" :disabled="modelValue <= min" @click="change(-1)">−</button>
    <input
      class="stepper__input"
      type="text"
      inputmode="numeric"
      :value="modelValue"
      @change="emit('update:modelValue', Math.min(max, Math.max(min, Number(($event.target as HTMLInputElement).value) || min)))"
    />
    <button class="stepper__btn" :disabled="modelValue >= max" @click="change(1)">+</button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.stepper__btn {
  width: 34px;
  height: 34px;
  border: none;
  background: #f0f2f2;
  font-size: 18px;
  color: var(--text);
  transition: background 0.15s;
}
.stepper__btn:hover:not(:disabled) {
  background: #e3e6e6;
}
.stepper__btn:disabled {
  color: #b8bcbc;
  cursor: not-allowed;
}
.stepper__input {
  width: 46px;
  height: 34px;
  border: none;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  text-align: center;
  outline: none;
  color: var(--text);
}
</style>
