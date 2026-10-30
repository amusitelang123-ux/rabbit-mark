<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const cart = useCartStore()
const ui = useUiStore()

const mode = ref<'password' | 'sms'>('password')
const account = ref('')
const password = ref('')
const phone = ref('')
const code = ref('')
const remember = ref(user.remember)
const loading = ref(false)
const countdown = ref(0)
const sending = ref(false)
let timer: number | undefined

async function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) {
    ui.toast('请输入正确的手机号', 'error')
    return
  }
  if (countdown.value > 0 || sending.value) return
  sending.value = true
  try {
    const res = await userApi.sendSmsCode(phone.value)
    countdown.value = 60
    // 演示环境后端直接返回验证码，方便评审；生产环境不会回传
    ui.toast(`验证码已发送（演示：${res.code}）`)
    timer = window.setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '验证码发送失败', 'error')
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (mode.value === 'sms') {
    if (!/^1\d{10}$/.test(phone.value)) {
      ui.toast('请输入正确的手机号', 'error')
      return
    }
    if (!code.value) {
      ui.toast('请输入短信验证码', 'error')
      return
    }
    loading.value = true
    try {
      await user.loginBySms(phone.value, code.value, remember.value)
      await cart.load()
      ui.toast('登录成功，欢迎回来')
      router.replace((route.query.redirect as string) || '/')
    } catch (err) {
      ui.toast(err instanceof Error ? err.message : '登录失败', 'error')
    } finally {
      loading.value = false
    }
    return
  }
  if (!account.value || !password.value) {
    ui.toast('请输入账号和密码', 'error')
    return
  }
  if (!captchaCode.value) {
    ui.toast('请输入图形验证码', 'error')
    return
  }
  loading.value = true
  try {
    await user.login(
      account.value,
      password.value,
      {
        captchaId: captchaId.value,
        captchaCode: captchaCode.value,
      },
      remember.value,
    )
    await cart.load()
    ui.toast('登录成功，欢迎回来')
    router.replace((route.query.redirect as string) || '/')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '登录失败', 'error')
    // 验证码一次性消费，失败后必须刷新
    await refreshCaptcha()
  } finally {
    loading.value = false
  }
}

/* 图形验证码（U-41 防爆破） */
const captchaId = ref('')
const captchaImage = ref('')
const captchaCode = ref('')

async function refreshCaptcha() {
  captchaCode.value = ''
  try {
    const res = await userApi.captcha()
    captchaId.value = res.captchaId
    captchaImage.value = res.image
  } catch {
    captchaId.value = ''
    captchaImage.value = ''
  }
}

onMounted(refreshCaptcha)
</script>

<template>
  <div class="auth">
    <div class="auth__top">
      <router-link to="/" class="auth__brand">
        <span class="auth__logo">🐰</span>
        <span class="auth__name">小兔鲜</span>
      </router-link>
      <router-link to="/register" class="auth__switch">还没有账号？免费注册</router-link>
    </div>

    <div class="auth__main">
      <div class="auth-card">
        <h1 class="auth-card__title">登录</h1>

        <div class="auth-tabs">
          <button :class="{ 'is-active': mode === 'password' }" @click="mode = 'password'">密码登录</button>
          <button :class="{ 'is-active': mode === 'sms' }" @click="mode = 'sms'">验证码登录</button>
        </div>

        <form v-if="mode === 'password'" @submit.prevent="submit">
          <div class="field">
            <label for="account">用户名 / 手机号</label>
            <input id="account" v-model="account" class="input" placeholder="请输入用户名或手机号" />
          </div>
          <div class="field">
            <label for="password">密码</label>
            <input id="password" v-model="password" type="password" class="input" placeholder="请输入密码" />
          </div>
          <div class="field">
            <label for="captcha">图形验证码</label>
            <div class="code-row">
              <input
                id="captcha"
                v-model="captchaCode"
                class="input"
                placeholder="请输入右侧字符"
                maxlength="6"
                autocomplete="off"
              />
              <img
                v-if="captchaImage"
                class="captcha-img"
                :src="captchaImage"
                alt="图形验证码"
                title="点击刷新"
                @click="refreshCaptcha"
              />
              <button v-else type="button" class="btn btn-secondary code-row__btn" @click="refreshCaptcha">
                获取
              </button>
            </div>
          </div>
        </form>

        <form v-else @submit.prevent="submit">
          <div class="field">
            <label for="phone">手机号</label>
            <input id="phone" v-model="phone" class="input" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="field">
            <label for="code">短信验证码</label>
            <div class="code-row">
              <input id="code" v-model="code" class="input" placeholder="请输入验证码" />
              <button type="button" class="btn btn-secondary code-row__btn" :disabled="countdown > 0 || sending" @click="sendCode">
                {{ countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码' }}
              </button>
            </div>
          </div>
        </form>

        <label class="remember">
          <input v-model="remember" type="checkbox" />
          <span>记住我（未勾选时关闭浏览器即退出登录）</span>
        </label>

        <button class="btn btn-primary btn-block auth-card__submit" :disabled="loading" @click="submit">
          {{ loading ? '登录中…' : '登录' }}
        </button>

        <p class="auth-card__demo">演示账号：user1 ~ user20，密码均为 123456</p>

        <div class="auth-card__links">
          <router-link to="/forgot" class="link">忘记密码</router-link>
          <router-link to="/register" class="link">免费注册</router-link>
        </div>

        <p class="auth-card__terms">
          登录即表示同意小兔鲜的
          <a href="javascript:void(0)" class="link">使用条件</a> 与
          <a href="javascript:void(0)" class="link">隐私声明</a>
        </p>
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
.auth__switch:hover {
  text-decoration: underline;
}
.auth__main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px 16px 60px;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 26px 28px 22px;
  box-shadow: var(--shadow-card);
}
.auth-card__title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 18px;
}
.auth-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-subtle);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 20px;
}
.auth-tabs button {
  flex: 1;
  border: none;
  background: none;
  padding: 8px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}
.auth-tabs button.is-active {
  background: #fff;
  color: var(--text);
  font-weight: 700;
  box-shadow: var(--shadow-card);
}
.code-row {
  display: flex;
  gap: 8px;
}
.code-row__btn {
  white-space: nowrap;
}
.captcha-img {
  width: 120px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
  display: block;
}
.auth-card__submit {
  margin-top: 6px;
  padding: 11px;
  font-weight: 700;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 2px 4px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}
.remember input {
  width: 15px;
  height: 15px;
  accent-color: var(--amz-orange);
}
.auth-card__demo {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 12px;
}
.auth-card__links {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-top: 16px;
}
.auth-card__terms {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 22px;
  line-height: 1.8;
}
.auth__footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 20px;
}
</style>
