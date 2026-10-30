<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { paymentApi } from '@/api'
import type { PayChannel } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import { formatMoney } from '@/utils/money'
import BalanceRechargeDialog from '@/components/BalanceRechargeDialog.vue'

const props = defineProps<{ modelValue: boolean; orderNo: string; amount: number }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  paid: []
}>()

const ui = useUiStore()
const router = useRouter()
const user = useUserStore()
const balance = ref(0)
const rechargeVisible = ref(false)

const shortfall = computed(() => Math.max(0, Number(props.amount) - balance.value))

const channels = computed<{ value: PayChannel; label: string; desc: string; disabled?: boolean }[]>(
  () => [
    { value: 4, label: '沙箱支付', desc: '推荐用于演示，即时到账' },
    { value: 1, label: '微信支付', desc: '模拟微信收银台' },
    { value: 2, label: '支付宝', desc: '模拟支付宝收银台' },
    {
      value: 3,
      label: '余额支付',
      desc:
        balance.value >= props.amount
          ? `可用余额 ¥${formatMoney(balance.value)}`
          : `余额不足（还差 ¥${formatMoney(shortfall.value)}），点击充值`,
      disabled: balance.value < props.amount,
    },
  ],
)

const channel = ref<PayChannel>(4)
const paying = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      channel.value = 4
      paying.value = false
      if (user.isLoggedIn) {
        user
          .loadProfile()
          .then(() => {
            balance.value = user.user?.balance ?? 0
          })
          .catch(() => {
            balance.value = 0
          })
      }
    }
  },
)

function selectChannel(item: { value: PayChannel; disabled?: boolean }) {
  // 余额不足时点击余额支付直接打开充值弹窗，充完即可继续支付
  if (item.value === 3 && item.disabled) {
    rechargeVisible.value = true
    return
  }
  if (item.disabled) {
    ui.toast('账户余额不足，请选择其它支付方式', 'error')
    return
  }
  channel.value = item.value
}

/** 充值成功后刷新可用余额，并按需自动选中余额支付 */
function onRecharged(newBalance: number) {
  balance.value = newBalance
  if (newBalance >= props.amount) {
    channel.value = 3
    return
  }
  ui.toast(`当前余额仍不足，还差 ¥${formatMoney(props.amount - newBalance)}`, 'info')
}

function close() {
  if (paying.value) return
  emit('update:modelValue', false)
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
      channel: channel.value,
    })
    await user.loadProfile().catch(() => undefined)
    emit('paid')
    emit('update:modelValue', false)
    // 同步回跳：进入支付结果页轮询状态（U-32），不再只靠弹窗内的定时轮询
    router.push({ path: '/pay/result', query: { payNo: prepay.payNo, orderNo: props.orderNo } })
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
          :class="{
            'is-active': channel === c.value,
            'is-disabled': c.disabled && c.value !== 3,
            'is-short': c.value === 3 && c.disabled,
          }"
          @click="selectChannel(c)"
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

    <BalanceRechargeDialog
      v-model="rechargeVisible"
      :balance="balance"
      :suggested="shortfall"
      @recharged="onRecharged"
    />
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
.pay-method.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pay-method.is-short {
  opacity: 0.6;
  cursor: pointer;
}
.pay-method.is-short:hover {
  opacity: 1;
  border-color: var(--amz-orange);
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
