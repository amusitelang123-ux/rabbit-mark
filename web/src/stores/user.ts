import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/api/types'
import { userApi, type RegisterPayload } from '@/api'
import { readRemember, readStored, removeStored, writeRemember, writeStored } from '@/utils/authStorage'

const TOKEN_KEY = 'xtx_access_token'
const REFRESH_KEY = 'xtx_refresh_token'
const USER_KEY = 'xtx_user'

function loadUser(): UserInfo | null {
  try {
    const raw = readStored(USER_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const remember = ref(readRemember())
  const token = ref<string>(readStored(TOKEN_KEY))
  const refreshToken = ref<string>(readStored(REFRESH_KEY))
  const user = ref<UserInfo | null>(loadUser())

  const isLoggedIn = computed(() => Boolean(token.value))

  function setSession(
    result: { user: UserInfo; token: string; refreshToken: string },
    rememberMe = remember.value,
  ) {
    remember.value = rememberMe
    writeRemember(rememberMe)
    token.value = result.token
    refreshToken.value = result.refreshToken
    user.value = result.user
    writeStored(TOKEN_KEY, result.token, rememberMe)
    writeStored(REFRESH_KEY, result.refreshToken, rememberMe)
    writeStored(USER_KEY, JSON.stringify(result.user), rememberMe)
  }

  async function login(
    account: string,
    password: string,
    captcha?: { captchaId: string; captchaCode: string },
    rememberMe = remember.value,
  ) {
    setSession(await userApi.login(account, password, captcha), rememberMe)
  }

  /** 手机验证码登录 */
  async function loginBySms(phone: string, code: string, rememberMe = remember.value) {
    setSession(await userApi.loginBySms(phone, code), rememberMe)
  }

  async function register(payload: RegisterPayload) {
    const result = await userApi.register(payload)
    setSession(result)
    return result
  }

  async function loadProfile() {
    if (!token.value) return
    user.value = await userApi.profile()
    writeStored(USER_KEY, JSON.stringify(user.value), remember.value)
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    user.value = null
    removeStored(TOKEN_KEY)
    removeStored(REFRESH_KEY)
    removeStored(USER_KEY)
  }

  return {
    remember,
    token,
    refreshToken,
    user,
    isLoggedIn,
    login,
    loginBySms,
    register,
    loadProfile,
    logout,
  }
})
