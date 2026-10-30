<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { walletApi } from '@/api'
import type { RechargeChannel } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import { formatMoney } from '@/utils/money'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 当前余额，用于弹窗顶部展示 */
    balance?: number
    /** 差额建议值：收银台余额不足时自动带入 */
    suggested?: number
  }>(),
  { balance: 0, suggested: 0 },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  recharged: [balance: number]
}>()

const ui = useUiStore()
const user = useUserStore()

const PRESETS = [50, 100, 200, 500, 1000, 2000]
const MIN_AMOUNT = 0.01
const MAX_AMOUNT = 50000

const CHANNELS: { value: RechargeChannel; label: string; desc: string }[] = [
  { value: 4, label: '沙箱支付', desc: '演示环境，确认后即时到账' },
  { value: 1, label: '微信支付', desc: '模拟微信收银台' },
  { value: 2, label: '支付宝', desc: '模拟支付宝收银台' },
]

const step = ref<'form' | 'success'>('form')
const amount = ref(100)
const channel = ref<RechargeChannel>(4)
const submitting = ref(false)
const newBalance = ref(0)
const lastAmount = ref(0)

const normalizedAmount = computed(() => Math.round(Number(amount.value) * 100) / 100)
const amountValid = computed(
  () =>
    Number.isFinite(normalizedAmount.value) &&
    normalizedAmount.value >= MIN_AMOUNT &&
    normalizedAmount.value <= MAX_AMOUNT,
)
const canSubmit = computed(() => amountValid.value && !submitting.value)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    step.value = 'form'
    submitting.value = false
    newBalance.value = 0
    lastAmount.value = 0
    channel.value = 4
    const deficit = Number(props.suggested) || 0
    amount.value =
      deficit > 0 ? Math.max(50, Math.ceil(deficit / 10) * 10) : 100
  },
)

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

function pickPreset(value: number) {
  amount.value = value
}

async function submit() {
  if (submitting.value) return
  if (!amountValid.value) {
    ui.toast(`充值金额需在 ¥${MIN_AMOUNT} ~ ¥${MAX_AMOUNT} 之间`, 'error')
    return
  }

  submitting.value = true
  try {
    const prepay = await walletApi.create({
      amount: normalizedAmount.value,
      channel: channel.value,
    })
    await walletApi.sandboxPay({
      payNo: prepay.payNo,
      amount: prepay.amount,
      sandboxToken: prepay.payParams.sandboxToken ?? '',
      channel: channel.value,
    })

    let status = await walletApi.status(prepay.payNo)
    for (let i = 0; i < 5 && status.payStatus !== 1; i += 1) {
      if (status.payStatus === 2) throw new Error('充值支付失败，请重新尝试')
      if (status.payStatus === 4) throw new Error('充值单已关闭，请重新发起充值')
      await new Promise((resolve) => setTimeout(resolve, 500))
      status = await walletApi.status(prepay.payNo)
    }
    if (status.payStatus !== 1) {
      throw new Error('充值结果确认中，请稍后在「我的钱包」查看余额')
    }

    newBalance.value = status.balance
    lastAmount.value = prepay.amount
    await user.loadProfile().catch(() => undefined)
    emit('recharged', status.balance)
    step.value = 'success'
    ui.toast('充值成功，余额已到账', 'success')
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '充值失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="brd">
      <div v-if="modelValue" class="brd" @click.self="close">
        <div class="brd__dialog" role="dialog" aria-modal="true" aria-label="余额充值">
          <header class="brd__head">
            <div>
              <h2>余额充值</h2>
              <p class="muted">当前余额 ¥{{ formatMoney(balance) }}</p>
            </div>
            <button class="brd__close" type="button" aria-label="关闭" :disabled="submitting" @click="close">
              ×
            </button>
          </header>

          <template v-if="step === 'form'">
            <div class="brd__body">
              <p class="brd__label">充值金额</p>
              <div class="brd__presets">
                <button
                  v-for="p in PRESETS"
                  :key="p"
                  type="button"
                  class="brd__preset"
                  :class="{ 'is-active': normalizedAmount === p }"
                  @click="pickPreset(p)"
                >
                  ¥{{ p }}
                </button>
              </div>

              <label class="brd__custom">
                <span>其他金额</span>
                <div class="brd__input-wrap">
                  <b>¥</b>
                  <input
                    v-model.number="amount"
                    type="number"
                    min="0.01"
                    max="50000"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="请输入充值金额"
                  />
                </div>
              </label>
              <p class="brd__hint muted">单笔充值 ¥{{ MIN_AMOUNT }} ~ ¥{{ MAX_AMOUNT }}，最多 2 位小数</p>

              <p class="brd__label">支付方式</p>
              <ul class="brd__channels">
                <li
                  v-for="c in CHANNELS"
                  :key="c.value"
                  class="brd__channel"
                  :class="{ 'is-active': channel === c.value }"
                  @click="channel = c.value"
                >
                  <span class="brd__dot" />
                  <div>
                    <b>{{ c.label }}</b>
                    <span class="muted">{{ c.desc }}</span>
                  </div>
                </li>
              </ul>

              <p class="brd__tip muted">演示环境使用沙箱支付，确认充值即视为支付成功并实时入账。</p>
            </div>

            <footer class="brd__foot">
              <button type="button" class="btn btn-secondary" :disabled="submitting" @click="close">取消</button>
              <button type="button" class="btn btn-primary" :disabled="!canSubmit" @click="submit">
                {{ submitting ? '充值处理中…' : amountValid ? `确认充值 ¥${formatMoney(normalizedAmount)}` : '请输入有效金额' }}
              </button>
            </footer>
          </template>

          <div v-else class="brd__success">
            <div class="brd__success-icon">✓</div>
            <h2>充值成功</h2>
            <p class="muted">本次充值 ¥{{ formatMoney(lastAmount) }}</p>
            <p class="brd__success-balance">当前余额 <b>¥{{ formatMoney(newBalance) }}</b></p>
            <button type="button" class="btn btn-primary" @click="close">完成</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.brd {
  position: fixed;
  inset: 0;
  z-index: 2900;
  background: rgba(15, 17, 17, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}
.brd__dialog {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-pop);
  overflow: hidden;
}
.brd__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border-light);
}
.brd__head h2 {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 4px;
}
.brd__head p {
  font-size: 13px;
}
.brd__close {
  border: none;
  background: none;
  font-size: 26px;
  line-height: 1;
  color: var(--text-secondary);
  padding: 0 4px;
}
.brd__close:hover {
  color: var(--text);
}
.brd__body {
  padding: 18px 22px 4px;
}
.brd__label {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}
.brd__presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.brd__preset {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 12px 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.brd__preset:hover {
  border-color: var(--amz-orange);
}
.brd__preset.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
  color: #b45309;
}
.brd__custom {
  display: block;
  margin-bottom: 4px;
}
.brd__custom > span {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.brd__input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
}
.brd__input-wrap:focus-within {
  border-color: var(--amz-orange);
}
.brd__input-wrap b {
  font-size: 16px;
  color: var(--text-secondary);
}
.brd__input-wrap input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 15px;
}
.brd__hint {
  font-size: 12px;
  margin-bottom: 18px;
}
.brd__channels {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}
.brd__channel {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.brd__channel.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
}
.brd__channel > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}
.brd__channel .muted {
  font-size: 12px;
}
.brd__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.brd__channel.is-active .brd__dot {
  border-color: var(--amz-orange);
  background: var(--amz-orange);
  box-shadow: inset 0 0 0 3px #fff;
}
.brd__tip {
  font-size: 12px;
  line-height: 1.6;
}
.brd__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px 20px;
}
.brd__success {
  padding: 32px 24px 28px;
  text-align: center;
}
.brd__success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f7ee;
  color: #1a7f4b;
  font-size: 32px;
  font-weight: 800;
}
.brd__success h2 {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}
.brd__success p {
  font-size: 14px;
  margin-bottom: 6px;
}
.brd__success-balance {
  margin: 16px 0 22px;
  color: var(--text-secondary);
}
.brd__success-balance b {
  font-size: 22px;
  color: var(--amz-price);
}
.brd__success .btn {
  min-width: 140px;
  justify-content: center;
}
.brd-enter-active,
.brd-leave-active {
  transition: opacity 0.18s ease;
}
.brd-enter-active .brd__dialog,
.brd-leave-active .brd__dialog {
  transition: transform 0.18s ease;
}
.brd-enter-from,
.brd-leave-to {
  opacity: 0;
}
.brd-enter-from .brd__dialog,
.brd-leave-to .brd__dialog {
  transform: translateY(12px) scale(0.98);
}
@media (max-width: 480px) {
  .brd__presets {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
