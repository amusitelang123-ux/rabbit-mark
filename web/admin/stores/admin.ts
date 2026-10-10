import { ref } from 'vue'
import { defineStore } from 'pinia'
import { adminApi } from '@admin/api'
import type { AdminProfile } from '@admin/api'

const TOKEN_KEY = 'xtx_admin_token'

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const profile = ref<AdminProfile | null>(null)
  const permissions = ref<string[]>([])
  const loaded = ref(false)

  async function login(username: string, password: string) {
    const res = await adminApi.authApi.login(username, password)
    token.value = res.token
    localStorage.setItem(TOKEN_KEY, res.token)
    await loadProfile()
  }

  async function loadProfile() {
    const me = await adminApi.authApi.me()
    profile.value = me
    permissions.value = me.permissions ?? []
    loaded.value = true
    return me
  }

  function hasPerm(code?: string) {
    if (!code) return true
    return permissions.value.includes('*') || permissions.value.includes(code)
  }

  function logout() {
    token.value = ''
    profile.value = null
    permissions.value = []
    loaded.value = false
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, profile, permissions, loaded, login, loadProfile, hasPerm, logout }
})
