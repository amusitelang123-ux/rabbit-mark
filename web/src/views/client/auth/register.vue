<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const user = useUserStore()
const cart = useCartStore()
const ui = useUiStore()

const username = ref('')
const phone = ref('')
const code = ref('')
const password = ref('')
const confirm = ref('')
const agreed = ref(false)
const loading = ref(false)
const sending = ref(false)

async function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) {
    ui.toast('请输入正确的手机号', 'error')
    return
  }
  if (sending.value) return
  sending.value = true
  try {
    const res = await userApi.sendSmsCode(phone.value)
    ui.toast(`验证码已发送（演示：${res.code}）`)
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '验证码发送失败', 'error')
  } finally {
    sending.value = false
  }
}

const strength = computed(() => {
  const p = password.value
  let score = 0
  if (p.length >= 8) score += 1
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) score += 1
  if (/[^A-Za-z0-9]/.test(p)) score += 1
  return score
})
const strengthText = computed(() => ['弱', '中', '强'][Math.max(0, strength.value - 1)] ?? '弱')

async function submit() {
  if (!username.value || !phone.value || !code.value || !password.value) {
    ui.toast('请填写完整信息', 'error')
    return
  }
  if (!/^1\d{10}$/.test(phone.value)) {
    ui.toast('手机号格式不正确', 'error')
    return
  }
  if (password.value.length < 8) {
    ui.toast('密码至少 8 位', 'error')
    return
  }
  if (password.value !== confirm.value) {
    ui.toast('两次输入的密码不一致', 'error')
    return
  }
  if (!agreed.value) {
    ui.toast('请先同意用户协议', 'error')
    return
  }
  loading.value = true
  try {
    const result = await user.register({
      username: username.value,
      phone: phone.value,
      password: password.value,
      code: code.value,
    })
    await cart.load()
    ui.toast(
      result.newUserCoupons
        ? `注册成功，已发放 ${result.newUserCoupons} 张新人券`
        : '注册成功，已自动登录',
    )
    router.replace('/')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '注册失败', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__top">
      <router-link to="/" class="auth__brand">
        <span class="auth__logo">🐰</span>
        <span class="auth__name">小兔鲜</span>
      </router-link>
      <router-link to="/login" class="auth__switch">已有账号？立即登录</router-link>
    </div>

    <div class="auth__main">
      <div class="auth-card">
        <h1 class="auth-card__title">创建账户</h1>
        <p class="auth-card__sub">注册即领 88 元新人券包</p>

        <form @submit.prevent="submit">
          <div class="field">
            <label for="username">用户名</label>
            <input id="username" v-model="username" class="input" placeholder="4-20 位字母或数字" />
          </div>
          <div class="field">
            <label for="phone">手机号</label>
            <input id="phone" v-model="phone" class="input" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="field">
            <label for="code">短信验证码</label>
            <div class="code-row">
              <input id="code" v-model="code" class="input" placeholder="请输入验证码" />
              <button type="button" class="btn btn-secondary" :disabled="sending" @click="sendCode">
                {{ sending ? '发送中…' : '获取验证码' }}
              </button>
            </div>
          </div>
          <div class="field">
            <label for="password">设置密码</label>
            <input id="password" v-model="password" type="password" class="input" placeholder="至少 8 位，含字母与数字" />
            <div v-if="password" class="strength">
              <div class="strength__bar">
                <span v-for="i in 3" :key="i" :class="{ 'is-on': i <= strength }" />
              </div>
              <span class="strength__text">{{ strengthText }}</span>
            </div>
          </div>
          <div class="field">
            <label for="confirm">确认密码</label>
            <input id="confirm" v-model="confirm" type="password" class="input" placeholder="请再次输入密码" />
          </div>

          <label class="agree">
            <input v-model="agreed" type="checkbox" />
            <span>我已阅读并同意《小兔鲜用户协议》与《隐私政策》</span>
          </label>

          <button class="btn btn-primary btn-block auth-card__submit" :disabled="loading" @click="submit">
            {{ loading ? '注册中…' : '创建账户' }}
          </button>
        </form>
      </div>
    </div>

    <footer class="auth__footer">© 2026 小兔鲜电商 · 教学演示项目</footer>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  background: linear-gradient(180deg, #f4f6f8 0%, #eaeded 100%);
  display: flex;
  flex-direction: column;
}
.auth__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 34px;
}
.auth__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.auth__logo {
  font-size: 30px;
}
.auth__name {
  font-size: 26px;
  font-weight: 800;
  color: var(--amz-navy);
}
.auth__switch {
  font-size: 14px;
  color: var(--amz-link);
}
.auth__main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 20px 16px 60px;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 26px 28px 22px;
  box-shadow: var(--shadow-card);
}
.auth-card__title {
  font-size: 26px;
  font-weight: 700;
}
.auth-card__sub {
  color: var(--amz-price);
  font-size: 13px;
  margin: 6px 0 20px;
}
.code-row {
  display: flex;
  gap: 8px;
}
.strength {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.strength__bar {
  display: flex;
  gap: 4px;
  flex: 1;
}
.strength__bar span {
  flex: 1;
  height: 5px;
  border-radius: 100px;
  background: var(--bg-subtle);
}
.strength__bar span.is-on {
  background: var(--amz-star);
}
.strength__text {
  font-size: 12px;
  color: var(--text-secondary);
}
.agree {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
  margin: 4px 0 16px;
}
.agree input {
  margin-top: 2px;
  accent-color: var(--amz-link);
}
.auth-card__submit {
  padding: 11px;
  font-weight: 700;
}
.auth__footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 20px;
}
</style>
