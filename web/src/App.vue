<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const user = useUserStore()
const cart = useCartStore()

onMounted(async () => {
  if (user.isLoggedIn) {
    try {
      await Promise.all([user.loadProfile(), cart.load()])
    } catch {
      user.logout()
      await cart.load()
    }
  }
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
  <ToastHost />
</template>
