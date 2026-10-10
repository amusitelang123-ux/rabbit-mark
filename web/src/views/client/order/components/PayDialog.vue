<script setup lang="ts">
import { ref, watch } from 'vue'
import { paymentApi } from '@/api'
import type { PayChannel } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { formatMoney } from '@/utils/money'

const props = defineProps<{ modelValue: boolean; orderNo: string; amount: number }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  paid: []
}>()

const ui = useUiStore()

const channels: { value: PayChannel; label: string; desc: string }[] = [
  { value: 4, label: '沙箱支付', desc: '推荐用于演示，即时到账' },
  { value: 1, label: '微信支付', desc: '模拟微信收银台' },
  { value: 2, label: '支付宝', desc: '模拟支付宝收银台' },
  { value: 3, label: '余额支付', desc: '使用账户余额抵扣' },
]

const channel = ref<PayChannel>(4)
const paying = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      channel.value = 4
      paying.value = false
    }
  },
)

function close() {
  if (paying.value) return
  emit('update:modelValue', false)
}

async function poll(payNo: string, times = 10): Promise<boolean> {
  for (let i = 0; i < times; i++) {
    const res = await paymentApi.status(payNo)
    if (res.payStatus === 1) return true
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

async function submit() {
  if (paying.value) return
  paying.value = true
  try {
    const prepay = await paymentApi.prepay({ orderNo: props.orderNo, channel: channel.value })
    await paymentApi.sandboxPay({
      payNo: prepay.payNo,
      amount: prepay.amount,
      sandboxToken: prepay.payParams.sandboxToken ?? '',
    })
    const ok = await poll(prepay.payNo)
    if (ok) {
      ui.toast('支付成功', 'success')
      emit('paid')
    } else {
      ui.toast('支付结果确认中，请稍后在订单列表查看', 'info')
    }
    emit('update:modelValue', false)
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '支付失败', 'error')
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="pay-mask" @click.self="close">
    <div class="pay-modal card">
      <header class="pay-modal__head">
        <h2>收银台</h2>
        <button class="pay-modal__close" :disabled="paying" @click="close">✕</button>
      </header>

      <div class="pay-modal__amount">
        <span class="muted">应付金额</span>
        <b class="pay-modal__price">¥{{ formatMoney(amount) }}</b>
      </div>

      <p class="pay-modal__label">选择支付方式</p>
      <ul class="pay-methods">
        <li
          v-for="c in channels"
          :key="c.value"
          class="pay-method"
          :class="{ 'is-active': channel === c.value }"
          @click="channel = c.value"
        >
          <span class="pay-method__dot" />
          <div class="pay-method__text">
            <b>{{ c.label }}</b>
            <span class="muted">{{ c.desc }}</span>
          </div>
        </li>
      </ul>

      <button class="btn btn-primary pay-modal__submit" :disabled="paying" @click="submit">
        {{ paying ? '支付处理中…' : `确认支付 ¥${formatMoney(amount)}` }}
      </button>
      <p class="pay-modal__tip muted">演示环境使用沙箱支付，点击确认即视为支付成功</p>
    </div>
  </div>
</template>

<style scoped>
.pay-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}
.pay-modal {
  width: 100%;
  max-width: 420px;
  padding: 22px;
}
.pay-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.pay-modal__head h2 {
  font-size: 20px;
  font-weight: 800;
}
.pay-modal__close {
  border: none;
  background: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
}
.pay-modal__amount {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  background: var(--bg-subtle);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 18px;
}
.pay-modal__price {
  font-size: 24px;
  color: var(--amz-price);
}
.pay-modal__label {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}
.pay-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.pay-method {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.pay-method.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
}
.pay-method__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.pay-method.is-active .pay-method__dot {
  border-color: var(--amz-orange);
  background: var(--amz-orange);
  box-shadow: inset 0 0 0 3px #fff;
}
.pay-method__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}
.pay-method__text .muted {
  font-size: 12px;
}
.pay-modal__submit {
  width: 100%;
  justify-content: center;
}
.pay-modal__tip {
  font-size: 12px;
  text-align: center;
  margin-top: 10px;
}
</style>
