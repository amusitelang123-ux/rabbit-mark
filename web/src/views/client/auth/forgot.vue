<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/api'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const ui = useUiStore()

const form = ref({ phone: '', code: '', newPassword: '', confirm: '' })
const submitting = ref(false)
const sending = ref(false)
const countdown = ref(0)
let timer: number | undefined

const canSendCode = computed(() => /^1\d{10}$/.test(form.value.phone) && countdown.value === 0 && !sending.value)

function startCountdown() {
  countdown.value = 60
  timer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      window.clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}

async function sendCode() {
  if (!canSendCode.value) {
    if (!/^1\d{10}$/.test(form.value.phone)) ui.toast('请输入正确的手机号', 'error')
    return
  }
  sending.value = true
  try {
    const res = await userApi.sendSmsCode(form.value.phone)
    ui.toast(`验证码已发送（演示环境固定为 ${res.code}）`)
    startCountdown()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '发送失败', 'error')
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (!/^1\d{10}$/.test(form.value.phone)) {
    ui.toast('请输入正确的手机号', 'error')
    return
  }
  if (!form.value.code) {
    ui.toast('请输入验证码', 'error')
    return
  }
  if (form.value.newPassword.length < 6) {
    ui.toast('新密码至少 6 位', 'error')
    return
  }
  if (form.value.newPassword !== form.value.confirm) {
    ui.toast('两次输入的密码不一致', 'error')
    return
  }
  submitting.value = true
  try {
    await userApi.resetPassword({
      phone: form.value.phone,
      code: form.value.code,
      newPassword: form.value.newPassword,
    })
    ui.toast('密码已重置，请使用新密码登录')
    router.replace({ name: 'login' })
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '重置失败', 'error')
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="page auth-page">
    <div class="auth-card card">
      <h1 class="auth-card__title">找回密码</h1>
      <p class="auth-card__tip muted">通过注册手机号接收验证码，重置登录密码</p>

      <div class="field">
        <label>手机号</label>
        <div class="field__row">
          <input v-model="form.phone" maxlength="11" placeholder="请输入注册手机号" />
          <button class="btn btn-secondary btn-sm" :disabled="!canSendCode" @click="sendCode">
            {{ countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码' }}
          </button>
        </div>
      </div>

      <div class="field">
        <label>验证码</label>
        <input v-model="form.code" maxlength="6" placeholder="请输入短信验证码" />
      </div>

      <div class="field">
        <label>新密码</label>
        <input v-model="form.newPassword" type="password" placeholder="至少 6 位" />
      </div>

      <div class="field">
        <label>确认新密码</label>
        <input v-model="form.confirm" type="password" placeholder="再次输入新密码" @keyup.enter="submit" />
      </div>

      <button class="btn btn-primary btn-block" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '重置密码' }}
      </button>

      <p class="auth-card__foot">
        <router-link to="/login" class="link">返回登录</router-link>
        <span class="muted"> · </span>
        <router-link to="/register" class="link">注册新账号</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 32px 30px 26px;
}
.auth-card__title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 6px;
}
.auth-card__tip {
  font-size: 13px;
  margin-bottom: 22px;
}
.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.field input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
}
.field input:focus {
  border-color: var(--amz-orange);
}
.field__row {
  display: flex;
  gap: 10px;
}
.field__row input {
  flex: 1;
}
.field__row .btn {
  flex-shrink: 0;
}
.auth-card__foot {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
}
.muted {
  color: var(--text-secondary);
}
</style>
