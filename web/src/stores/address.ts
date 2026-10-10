import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addressApi } from '@/api'
import type { Address } from '@/api/types'

export const useAddressStore = defineStore('address', () => {
  const list = ref<Address[]>([])
  const loading = ref(false)

  const defaultAddress = computed(() => list.value.find((a) => a.isDefault) ?? list.value[0] ?? null)

  async function load() {
    loading.value = true
    try {
      list.value = await addressApi.list()
    } finally {
      loading.value = false
    }
  }

  function clear() {
    list.value = []
  }

  return { list, loading, defaultAddress, load, clear }
})
