<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { configApi, contentApi, feedbackApi } from '@/api'
import type { FaqGroup, FeedbackItem, LogisticsCompanyItem, PublicConfig } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import EmptyState from '@/components/EmptyState.vue'

const user = useUserStore()
const ui = useUiStore()

const loading = ref(true)
const groups = ref<FaqGroup[]>([])
const companies = ref<LogisticsCompanyItem[]>([])
const config = ref<PublicConfig | null>(null)
const activeCategory = ref('')
const openId = ref<number | null>(null)

function toggle(id: number) {
  openId.value = openId.value === id ? null : id
}

/* -------------------------------- 留言工单 -------------------------------- */
type HelpTab = 'faq' | 'feedback'
const tab = ref<HelpTab>('faq')

const FEEDBACK_TYPE_TEXT: Record<number, string> = { 1: '咨询', 2: '投诉', 3: '建议' }
const FEEDBACK_STATUS_TEXT: Record<number, string> = { 0: '待处理', 1: '已回复', 2: '已关闭' }

const feedbacks = ref<FeedbackItem[]>([])
const form = ref({ type: 1, content: '', contact: '' })
const submitting = ref(false)

async function loadFeedbacks() {
  if (!user.isLoggedIn) {
    feedbacks.value = []
    return
  }
  try {
    feedbacks.value = await feedbackApi.mine()
  } catch {
    feedbacks.value = []
  }
}

function switchTab(next: HelpTab) {
  tab.value = next
  if (next === 'feedback') loadFeedbacks()
}

async function submitFeedback() {
  if (!user.isLoggedIn) {
    ui.toast('请先登录后再提交留言', 'info')
    return
  }
  if (form.value.content.trim().length < 5) {
    ui.toast('请至少填写 5 个字的描述', 'error')
    return
  }
  submitting.value = true
  try {
    await feedbackApi.create({
      type: form.value.type,
      content: form.value.content.trim(),
      contact: form.value.contact.trim() || undefined,
    })
    ui.toast('留言已提交，我们会尽快回复')
    form.value = { type: 1, content: '', contact: '' }
    await loadFeedbacks()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const [g, c, cfg] = await Promise.all([
      contentApi.faqGroups(),
      contentApi.logisticsCompanies(),
      configApi.public().catch(() => null),
    ])
    groups.value = g
    companies.value = c
    config.value = cfg
    activeCategory.value = g[0]?.category ?? ''
  } finally {
    loading.value = false
  }
  await loadFeedbacks()
})
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="help-hero">
        <h1>帮助中心</h1>
        <p>常见问题解答 · 在线留言 · 合作快递</p>
      </div>

      <div class="help-tabs">
        <button :class="{ 'is-active': tab === 'faq' }" @click="switchTab('faq')">常见问题</button>
        <button :class="{ 'is-active': tab === 'feedback' }" @click="switchTab('feedback')">
          在线留言
          <span v-if="feedbacks.some((f) => f.status === 1)" class="help-tabs__dot" />
        </button>
      </div>

      <div v-if="tab === 'faq'" class="help-grid">
        <aside class="help-side card">
          <h3 class="help-side__title">问题分类</h3>
          <ul>
            <li
              v-for="g in groups"
              :key="g.category"
              :class="{ 'is-active': activeCategory === g.category }"
              @click="activeCategory = g.category"
            >
              {{ g.category }}
              <span>{{ g.items.length }}</span>
            </li>
          </ul>
        </aside>

        <main class="help-main">
          <div v-if="loading" class="help-loading">正在加载…</div>

          <template v-else-if="groups.length">
            <section v-for="g in groups.filter((x) => x.category === activeCategory)" :key="g.category" class="card help-block">
              <h2 class="help-block__title">{{ g.category }}</h2>
              <ul class="faq-list">
                <li v-for="item in g.items" :key="item.id" class="faq-item" :class="{ 'is-open': openId === item.id }">
                  <button class="faq-item__q" @click="toggle(item.id)">
                    <span class="faq-item__mark">Q</span>
                    <span class="faq-item__text">{{ item.question }}</span>
                    <span class="faq-item__arrow">{{ openId === item.id ? '−' : '+' }}</span>
                  </button>
                  <div v-show="openId === item.id" class="faq-item__a">
                    {{ item.answer }}
                  </div>
                </li>
              </ul>
            </section>
          </template>

          <EmptyState v-else icon="❓" title="暂无帮助内容" desc="请稍后再来看看" />

          <section class="card help-service">
            <h2 class="help-block__title">没找到答案？给我们留言</h2>
            <div class="service-grid">
              <div class="service-item">
                <span class="service-item__label">服务时间</span>
                <b>{{ config?.serviceHours || '—' }}</b>
              </div>
              <div class="service-item">
                <span class="service-item__label">客服热线</span>
                <b>{{ config?.servicePhone || '—' }}</b>
              </div>
              <div class="service-item">
                <span class="service-item__label">客服邮箱</span>
                <b>{{ config?.serviceEmail || '—' }}</b>
              </div>
            </div>
          </section>

          <section v-if="companies.length" class="card help-express">
            <h2 class="help-block__title">合作快递</h2>
            <ul class="express-list">
              <li v-for="c in companies" :key="c.id">
                <b>{{ c.name }}</b>
                <span class="muted">{{ c.phone || '—' }}</span>
              </li>
            </ul>
          </section>
        </main>
      </div>

      <!-- 在线留言 -->
      <div v-else class="help-feedback">
        <section class="card help-form">
          <h2 class="help-block__title">提交留言</h2>
          <p class="muted help-form__tip">
            咨询、投诉或建议都可以在这里反馈，我们会在 {{ config?.serviceHours || '服务时间' }} 内处理
          </p>

          <div class="field">
            <label>留言类型</label>
            <div class="type-row">
              <button
                v-for="t in [{ v: 1, l: '咨询' }, { v: 2, l: '投诉' }, { v: 3, l: '建议' }]"
                :key="t.v"
                class="type-btn"
                :class="{ 'is-active': form.type === t.v }"
                @click="form.type = t.v"
              >
                {{ t.l }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>问题描述</label>
            <textarea v-model="form.content" rows="5" maxlength="2000" placeholder="请详细描述遇到的问题（至少 5 个字）" />
          </div>

          <div class="field">
            <label>联系方式（选填）</label>
            <input v-model="form.contact" maxlength="100" placeholder="手机号或邮箱，便于我们联系你" />
          </div>

          <button class="btn btn-primary" :disabled="submitting" @click="submitFeedback">
            {{ submitting ? '提交中…' : '提交留言' }}
          </button>
        </section>

        <section class="card help-list">
          <h2 class="help-block__title">我的留言</h2>
          <EmptyState
            v-if="!feedbacks.length"
            icon="💬"
            title="还没有留言"
            desc="有疑问可以在左侧提交，我们会尽快回复"
          />
          <ul v-else class="fb-list">
            <li v-for="f in feedbacks" :key="f.id" class="fb-item">
              <div class="fb-item__head">
                <span class="fb-tag">{{ FEEDBACK_TYPE_TEXT[f.type] ?? '留言' }}</span>
                <span class="fb-status" :class="`is-${f.status}`">{{ FEEDBACK_STATUS_TEXT[f.status] }}</span>
                <span class="muted">{{ f.createdAt }}</span>
              </div>
              <p class="fb-item__content">{{ f.content }}</p>
              <div v-if="f.replyContent" class="fb-reply">
                <b>官方回复</b>
                <p>{{ f.replyContent }}</p>
                <span class="muted">{{ f.replyAt }}</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-hero {
  background: linear-gradient(120deg, #232f3e, #37475a);
  color: #fff;
  border-radius: 12px;
  padding: 34px 36px;
  margin-bottom: 22px;
}
.help-hero h1 {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 8px;
}
.help-hero p {
  color: var(--amz-orange);
  font-size: 15px;
}
.help-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  align-items: start;
}
.help-side {
  padding: 18px;
}
.help-side__title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
}
.help-side ul {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.help-side li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s ease;
}
.help-side li:hover {
  background: var(--bg-hover, #f5f6f8);
}
.help-side li.is-active {
  background: #fff8ec;
  color: var(--amz-price);
  font-weight: 700;
}
.help-side li span {
  font-size: 12px;
  color: var(--text-secondary);
}
.help-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.help-loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
}
.help-block {
  padding: 22px 24px;
}
.help-block__title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 14px;
}
.faq-list {
  display: flex;
  flex-direction: column;
}
.faq-item {
  border-bottom: 1px solid var(--border);
}
.faq-item:last-child {
  border-bottom: none;
}
.faq-item__q {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14.5px;
  color: var(--text);
}
.faq-item__mark {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--amz-orange);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.faq-item__text {
  flex: 1;
}
.faq-item__arrow {
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1;
}
.faq-item__a {
  padding: 0 0 16px 30px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--text-secondary);
}
.faq-item.is-open .faq-item__q {
  color: var(--amz-price);
  font-weight: 600;
}
.help-service {
  padding: 22px 24px;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.service-item {
  background: #fff8ec;
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.service-item__label {
  font-size: 12.5px;
  color: var(--text-secondary);
}
.service-item b {
  font-size: 15px;
  color: var(--amz-price);
}
.help-express {
  padding: 22px 24px;
}
.express-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.express-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13px;
}
.muted {
  color: var(--text-secondary);
}

/* ---- 顶部切换 ---- */
.help-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.help-tabs button {
  position: relative;
  padding: 8px 18px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
}
.help-tabs button.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
  color: var(--amz-price);
  font-weight: 700;
}
.help-tabs__dot {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e03131;
}

/* ---- 留言 ---- */
.help-feedback {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;
}
.help-form,
.help-list {
  padding: 22px 24px;
}
.help-form__tip {
  font-size: 12.5px;
  margin-bottom: 16px;
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
.field textarea,
.field input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}
.field textarea:focus,
.field input:focus {
  border-color: var(--amz-orange);
}
.type-row {
  display: flex;
  gap: 10px;
}
.type-btn {
  flex: 1;
  padding: 8px 0;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text);
}
.type-btn.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
  color: var(--amz-price);
  font-weight: 700;
}
.fb-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fb-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}
.fb-item__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  margin-bottom: 8px;
}
.fb-tag {
  background: var(--bg-hover, #f5f6f8);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 12px;
}
.fb-status {
  font-weight: 700;
}
.fb-status.is-0 {
  color: var(--amz-price);
}
.fb-status.is-1 {
  color: var(--amz-success);
}
.fb-status.is-2 {
  color: var(--text-secondary);
}
.fb-item__content {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text);
}
.fb-reply {
  margin-top: 10px;
  background: #fff8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
.fb-reply b {
  color: var(--amz-price);
  font-size: 12.5px;
}
.fb-reply p {
  margin: 4px 0;
  line-height: 1.6;
}
.fb-reply .muted {
  font-size: 12px;
}

@media (max-width: 900px) {
  .help-grid {
    grid-template-columns: 1fr;
  }
  .service-grid {
    grid-template-columns: 1fr;
  }
  .help-feedback {
    grid-template-columns: 1fr;
  }
}
</style>
