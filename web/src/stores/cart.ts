import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CartItem, Product, ProductSku } from '@/api/types'
import { cartApi, useMock } from '@/api'
import { addMoney, mulMoney } from '@/utils/money'

const STORAGE_KEY = 'xtx_cart'

function loadLocal(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(useMock ? loadLocal() : [])

  const serverMode = computed(() => !useMock)
  const localMode = computed(() => useMock)

  function persist() {
    if (useMock) localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  async function load() {
    if (serverMode.value) items.value = await cartApi.list()
    else items.value = loadLocal()
  }

  async function add(product: Product, sku: ProductSku, quantity = 1) {
    if (serverMode.value) {
      items.value = await cartApi.add({ productId: product.id, skuId: sku.id, quantity })
      return
    }
    const existing = items.value.find((it) => it.skuId === sku.id)
    if (existing) {
      existing.quantity += quantity
      existing.selected = true
    } else {
      items.value.unshift({
        id: Date.now(),
        productId: product.id,
        skuId: sku.id,
        name: product.name,
        image: sku.image || product.mainImage,
        specText: sku.specText,
        price: sku.price,
        quantity,
        stock: sku.stock,
        selected: true,
      })
    }
    persist()
  }

  async function updateQuantity(skuId: number, quantity: number) {
    const it = items.value.find((i) => i.skuId === skuId)
    if (!it) return
    if (serverMode.value) {
      items.value = await cartApi.update(it.id, { quantity })
      return
    }
    it.quantity = Math.max(1, Math.min(quantity, it.stock))
    persist()
  }

  async function toggle(skuId: number, selected?: boolean) {
    const it = items.value.find((i) => i.skuId === skuId)
    if (!it) return
    const next = selected ?? !it.selected
    if (serverMode.value) {
      items.value = await cartApi.update(it.id, { selected: next })
      return
    }
    it.selected = next
    persist()
  }

  async function toggleAll(selected: boolean) {
    if (serverMode.value) {
      items.value = await cartApi.selectAll(selected)
      return
    }
    items.value.forEach((it) => {
      if (!it.invalid) it.selected = selected
    })
    persist()
  }

  async function remove(skuIds: number[]) {
    if (serverMode.value) {
      const ids = items.value.filter((it) => skuIds.includes(it.skuId)).map((it) => it.id)
      items.value = await cartApi.remove(ids)
      return
    }
    items.value = items.value.filter((it) => !skuIds.includes(it.skuId))
    persist()
  }

  async function clearSelected() {
    if (serverMode.value) {
      // 服务端在下单成功后已清除，这里仅重新拉取
      await load()
      return
    }
    items.value = items.value.filter((it) => !it.selected)
    persist()
  }

  const count = computed(() => items.value.reduce((sum, it) => sum + it.quantity, 0))
  const selectedItems = computed(() => items.value.filter((it) => it.selected && !it.invalid))
  const selectedCount = computed(() => selectedItems.value.reduce((sum, it) => sum + it.quantity, 0))
  const selectedTotal = computed(() => addMoney(...selectedItems.value.map((it) => mulMoney(it.price, it.quantity))))
  const allSelected = computed(
    () =>
      items.value.filter((it) => !it.invalid).length > 0 &&
      items.value.filter((it) => !it.invalid).every((it) => it.selected),
  )

  return {
    items,
    count,
    selectedItems,
    selectedCount,
    selectedTotal,
    allSelected,
    localMode,
    serverMode,
    load,
    add,
    updateQuantity,
    toggle,
    toggleAll,
    remove,
    clearSelected,
  }
})
