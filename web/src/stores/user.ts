import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/api/types'
import { userApi, type RegisterPayload } from '@/api'

const TOKEN_KEY = 'xtx_access_token'
const REFRESH_KEY = 'xtx_refresh_token'
const USER_KEY = 'xtx_user'

function loadUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) ?? '')
  const refreshToken = ref<string>(localStorage.getItem(REFRESH_KEY) ?? '')
  const user = ref<UserInfo | null>(loadUser())

  const isLoggedIn = computed(() => Boolean(token.value))

  function setSession(result: { user: UserInfo; token: string; refreshToken: string }) {
    token.value = result.token
    refreshToken.value = result.refreshToken
    user.value = result.user
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(REFRESH_KEY, result.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
  }

  async function login(
    account: string,
    password: string,
    captcha?: { captchaId: string; captchaCode: string },
  ) {
    setSession(await userApi.login(account, password, captcha))
  }

  async function register(payload: RegisterPayload) {
    setSession(await userApi.register(payload))
  }

  async function loadProfile() {
    if (!token.value) return
    user.value = await userApi.profile()
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, refreshToken, user, isLoggedIn, login, register, loadProfile, logout }
})
