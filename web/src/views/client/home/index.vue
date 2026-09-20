<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { homeApi, type HomeData } from '@/api'
import ProductCard from '@/components/ProductCard.vue'
import PriceTag from '@/components/PriceTag.vue'

const router = useRouter()
const data = ref<HomeData | null>(null)
const loading = ref(true)
const slide = ref(0)
let timer: number | undefined

const countdown = ref({ h: '00', m: '00', s: '00' })
let clock: number | undefined

async function load() {
  loading.value = true
  data.value = await homeApi.get()
  loading.value = false
}

function next() {
  if (!data.value) return
  slide.value = (slide.value + 1) % data.value.banners.length
}
function prev() {
  if (!data.value) return
  slide.value = (slide.value - 1 + data.value.banners.length) % data.value.banners.length
}
function go(i: number) {
  slide.value = i
}

function tick() {
  const end = new Date()
  end.setHours(24, 0, 0, 0)
  const diff = Math.max(0, end.getTime() - Date.now())
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  countdown.value = {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  }
}

const current = computed(() => data.value?.banners[slide.value])

onMounted(async () => {
  await load()
  timer = window.setInterval(next, 5000)
  tick()
  clock = window.setInterval(tick, 1000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  clearInterval(clock)
})
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div v-if="current" class="hero__slide" :style="{ background: current.bg }">
        <img :src="current.image" :alt="current.title" class="hero__img" />
        <div class="hero__overlay container">
          <p class="hero__eyebrow">小兔鲜 · 平台自营</p>
          <h1 class="hero__title">{{ current.title }}</h1>
          <p class="hero__subtitle">{{ current.subtitle }}</p>
          <button class="btn btn-primary hero__cta" @click="router.push(current.link)">立即选购</button>
        </div>
      </div>
      <button class="hero__nav hero__nav--prev" aria-label="上一张" @click="prev">‹</button>
      <button class="hero__nav hero__nav--next" aria-label="下一张" @click="next">›</button>
      <div class="hero__dots">
        <button
          v-for="(b, i) in data?.banners ?? []"
          :key="b.id"
          :class="{ 'is-active': i === slide }"
          :aria-label="`第 ${i + 1} 张`"
          @click="go(i)"
        />
      </div>
    </section>

    <div class="container">
      <!-- Overlapping promo cards -->
      <section class="promos">
        <div class="promo">
          <h3>新人专享</h3>
          <img :src="'/favicon.svg'" alt="" class="promo__img" />
          <p>注册即领 88 元券包</p>
          <router-link to="/coupons" class="link">立即领取</router-link>
        </div>
        <div class="promo promo--navy">
          <h3>数码焕新季</h3>
          <p class="promo__big">低至 8 折</p>
          <button class="btn btn-primary btn-sm" @click="router.push('/category/101')">去看看</button>
        </div>
        <div class="promo promo--green">
          <h3>产地直采</h3>
          <p class="promo__big">生鲜包邮</p>
          <button class="btn btn-primary btn-sm" @click="router.push('/category/104')">去看看</button>
        </div>
        <div class="promo">
          <h3>家居焕新</h3>
          <p class="promo__big">满 300 减 60</p>
          <button class="btn btn-primary btn-sm" @click="router.push('/category/103')">去看看</button>
        </div>
      </section>

      <!-- Categories -->
      <section class="quick">
        <router-link
          v-for="c in data?.categories ?? []"
          :key="c.id"
          :to="`/category/${c.id}`"
          class="quick__item"
        >
          <span class="quick__icon">{{ c.icon }}</span>
          <span class="quick__name">{{ c.name }}</span>
        </router-link>
      </section>

      <!-- Seckill -->
      <section class="seckill card">
        <div class="seckill__head">
          <div class="seckill__title">
            <span class="seckill__flame">⚡</span>
            <h2>限时秒杀</h2>
            <span class="seckill__sub">今日好价 抢完即止</span>
          </div>
          <div class="seckill__clock">
            <small>距结束</small>
            <span>{{ countdown.h }}</span>:<span>{{ countdown.m }}</span>:<span>{{ countdown.s }}</span>
          </div>
          <router-link to="/products" class="link">全部秒杀 ›</router-link>
        </div>
        <div class="seckill__row">
          <router-link
            v-for="s in data?.seckills ?? []"
            :key="s.id"
            :to="`/product/${s.productId}`"
            class="sk"
          >
            <img :src="s.image" :alt="s.name" loading="lazy" />
            <p class="sk__name">{{ s.name }}</p>
            <PriceTag :amount="s.price" size="sm" :market="s.originPrice" />
            <div class="sk__bar">
              <div class="sk__bar-fill" :style="{ width: `${Math.min(100, (s.soldCount / (s.soldCount + s.stock)) * 100)}%` }" />
              <span>已抢 {{ Math.round((s.soldCount / (s.soldCount + s.stock)) * 100) }}%</span>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Floors -->
      <section v-for="floor in data?.floors ?? []" :key="floor.title" class="floor">
        <div class="floor__head">
          <div>
            <h2 class="floor__title">{{ floor.title }}</h2>
            <span class="floor__sub">{{ floor.subtitle }}</span>
          </div>
          <router-link :to="`/category/${floor.categoryId}`" class="link">查看全部 ›</router-link>
        </div>
        <div class="grid-products">
          <ProductCard v-for="p in floor.products" :key="p.id" :product="p" />
        </div>
      </section>

      <!-- Recommend -->
      <section class="floor">
        <div class="floor__head">
          <h2 class="floor__title">猜你喜欢</h2>
        </div>
        <div class="grid-products">
          <ProductCard v-for="p in data?.recommend ?? []" :key="p.id" :product="p" />
        </div>
      </section>

      <div v-if="loading" class="home__loading">正在加载精彩好物…</div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  height: 420px;
  overflow: hidden;
}
.hero__slide {
  position: absolute;
  inset: 0;
}
.hero__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.75;
}
.hero__overlay {
  position: absolute;
  inset: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}
.hero__eyebrow {
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--amz-orange);
  font-weight: 700;
  margin-bottom: 8px;
}
.hero__title {
  font-size: 46px;
  font-weight: 900;
  margin-bottom: 10px;
}
.hero__subtitle {
  font-size: 19px;
  margin-bottom: 22px;
  opacity: 0.95;
}
.hero__cta {
  padding: 12px 34px;
  font-size: 16px;
  font-weight: 700;
}
.hero__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 64px;
  border: none;
  background: rgba(15, 17, 17, 0.4);
  color: #fff;
  font-size: 34px;
  line-height: 1;
  border-radius: 6px;
}
.hero__nav:hover {
  background: rgba(15, 17, 17, 0.7);
}
.hero__nav--prev {
  left: 20px;
}
.hero__nav--next {
  right: 20px;
}
.hero__dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.hero__dots button {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #fff;
  background: transparent;
  padding: 0;
}
.hero__dots button.is-active {
  background: var(--amz-orange);
  border-color: var(--amz-orange);
  width: 26px;
  border-radius: 100px;
}

.promos {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-top: -70px;
  position: relative;
  z-index: 5;
}
.promo {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 170px;
}
.promo h3 {
  font-size: 18px;
  font-weight: 700;
}
.promo p {
  color: var(--text-secondary);
  font-size: 14px;
}
.promo__big {
  font-size: 24px !important;
  font-weight: 800;
  color: var(--amz-price) !important;
}
.promo__img {
  width: 72px;
  height: 72px;
  margin: 4px 0;
}
.promo--navy {
  background: linear-gradient(135deg, #232f3e, #37475a);
  color: #fff;
}
.promo--navy p,
.promo--navy .promo__big {
  color: #fff !important;
}
.promo--green {
  background: linear-gradient(135deg, #1f4a2e, #2f6b45);
  color: #fff;
}
.promo--green p,
.promo--green .promo__big {
  color: #fff !important;
}

.quick {
  margin-top: 24px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  padding: 22px 10px;
}
.quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
}
.quick__item:hover {
  background: var(--bg-hover);
}
.quick__icon {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #f0f2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.quick__name {
  font-size: 13px;
  color: var(--text);
}

.seckill {
  margin-top: 24px;
  padding: 20px;
}
.seckill__head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}
.seckill__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.seckill__flame {
  font-size: 24px;
}
.seckill__title h2 {
  font-size: 22px;
  font-weight: 800;
}
.seckill__sub {
  font-size: 13px;
  color: var(--text-secondary);
}
.seckill__clock {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}
.seckill__clock small {
  color: var(--text-secondary);
  font-weight: 400;
  margin-right: 4px;
}
.seckill__clock span {
  background: var(--amz-navy);
  color: #fff;
  border-radius: 4px;
  padding: 3px 6px;
  font-variant-numeric: tabular-nums;
}
.seckill__row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.sk {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
}
.sk:hover {
  box-shadow: var(--shadow-card);
}
.sk img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 6px;
}
.sk__name {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sk__bar {
  position: relative;
  height: 18px;
  border-radius: 100px;
  background: #ffe1c4;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sk__bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #ff8a00, #ffb75e);
}
.sk__bar span {
  position: relative;
  font-size: 11px;
  color: #7a3b00;
  font-weight: 700;
}

.floor {
  margin-top: 32px;
}
.floor__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.floor__title {
  font-size: 22px;
  font-weight: 800;
  display: inline-block;
  border-left: 5px solid var(--amz-orange);
  padding-left: 10px;
}
.floor__sub {
  color: var(--text-secondary);
  font-size: 13px;
  margin-left: 10px;
}

.home__loading {
  text-align: center;
  padding: 50px;
  color: var(--text-secondary);
}

@media (max-width: 1100px) {
  .promos {
    grid-template-columns: repeat(2, 1fr);
  }
  .quick {
    grid-template-columns: repeat(4, 1fr);
  }
  .seckill__row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .hero {
    height: 300px;
  }
  .hero__title {
    font-size: 28px;
  }
  .hero__subtitle {
    font-size: 15px;
  }
  .promos {
    display: none;
  }
  .quick {
    grid-template-columns: repeat(4, 1fr);
    margin-top: 16px;
  }
  .quick__icon {
    width: 46px;
    height: 46px;
    font-size: 22px;
  }
  .seckill__head {
    flex-wrap: wrap;
  }
  .seckill__clock {
    margin-left: 0;
  }
}
</style>
