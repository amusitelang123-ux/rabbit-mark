<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { configApi, feedbackApi } from '@/api'
import type { FeedbackItem, Order, PublicConfig } from '@/api/types'
import AiChatPanel from '@/components/AiChatPanel.vue'
import { ORDER_STATUS_TEXT } from '@/constants/order'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import { formatMoney } from '@/utils/money'

const props = defineProps<{ modelValue: boolean; order: Order | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const user = useUserStore()
const ui = useUiStore()

const MAX_IMAGES = 3
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const QUICK_QUESTIONS = [
  '请问我的订单什么时候发货？',
  '物流信息好几天没有更新了，能帮忙查一下吗？',
  '收到的商品有问题，想申请退换货。',
  '请问这个订单怎么开具发票？',
]

type TabKey = 'ai' | 'form' | 'history'

const TYPE_OPTIONS = [
  { value: 1, label: '咨询' },
  { value: 2, label: '投诉' },
  { value: 3, label: '建议' },
]

const FEEDBACK_TYPE_TEXT: Record<number, string> = { 1: '咨询', 2: '投诉', 3: '建议' }
const FEEDBACK_STATUS_TEXT: Record<number, string> = { 0: '待处理', 1: '已回复', 2: '已关闭' }

const config = ref<PublicConfig | null>(null)
const configLoading = ref(false)

const feedbacks = ref<FeedbackItem[]>([])
const feedbackLoading = ref(false)
const feedbackError = ref('')

const tab = ref<TabKey>('ai')
const form = ref({ type: 1, content: '', contact: '', images: [] as string[] })
const submitting = ref(false)
const uploading = ref(false)
const contentRef = ref<HTMLTextAreaElement | null>(null)

const orderNo = computed(() => props.order?.orderNo ?? '')
const statusText = computed(() => (props.order ? ORDER_STATUS_TEXT[props.order.status] : '—'))
const amountLabel = computed(() => {
  if (props.order?.status === 10) return '应付'
  if (props.order?.status === 70) return '订单金额'
  return '实付'
})
const itemCount = computed(
  () => props.order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
)
const hasReplied = computed(() => feedbacks.value.some((f) => f.status === 1))

const servicePhone = computed(() => config.value?.servicePhone ?? '')
const serviceEmail = computed(() => config.value?.serviceEmail ?? '')
const serviceHours = computed(() => config.value?.serviceHours ?? '')
const telHref = computed(() => (servicePhone.value ? `tel:${servicePhone.value.replace(/[^\d+]/g, '')}` : ''))
const mailHref = computed(() => (serviceEmail.value ? `mailto:${serviceEmail.value}` : ''))

/** 个人资料里的手机号是脱敏展示的，带 * 时不回填，避免把无效号码提交给客服 */
function defaultContact() {
  const phone = user.user?.phone ?? ''
  return phone.includes('*') ? '' : phone
}

async function loadConfig() {
  configLoading.value = true
  try {
    config.value = await configApi.public()
  } catch {
    // 客服信息加载失败不阻塞留言；保留上一次成功加载的客服信息
  } finally {
    configLoading.value = false
  }
}

async function loadFeedbacks() {
  if (!orderNo.value) {
    feedbacks.value = []
    return
  }
  feedbackLoading.value = true
  feedbackError.value = ''
  try {
    const rows = await feedbackApi.mine(orderNo.value)
    // 服务端已按订单过滤，这里再兜底一次，避免旧接口把全部留言带回来
    feedbacks.value = rows.filter((f) => f.orderNo === orderNo.value)
  } catch (e) {
    feedbacks.value = []
    feedbackError.value = e instanceof Error ? e.message : '留言记录加载失败'
  } finally {
    feedbackLoading.value = false
  }
}

/** AI 面板转人工成功后，切到留言记录查看工单 */
function onAiTransferred() {
  switchTab('history')
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    tab.value = 'ai'
    form.value = {
      type: 1,
      content: '',
      contact: defaultContact(),
      images: [],
    }
    feedbacks.value = []
    feedbackError.value = ''
    void loadConfig()
    void loadFeedbacks()
  },
  { immediate: true },
)

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

function switchTab(next: TabKey) {
  tab.value = next
  if (next === 'history') void loadFeedbacks()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function copyText(text: string, label: string) {
  if (!text) return
  if (!navigator.clipboard) {
    ui.toast(`当前浏览器不支持复制，请手动记录${label}`, 'info')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ui.toast(`${label}已复制`, 'success')
  } catch {
    ui.toast(`复制失败，请手动记录${label}`, 'error')
  }
}

function applyQuick(text: string) {
  form.value.content = text
  nextTick(() => contentRef.value?.focus())
}

async function onPickImages(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const remain = MAX_IMAGES - form.value.images.length
  if (remain <= 0) {
    ui.toast(`最多上传 ${MAX_IMAGES} 张图片`, 'error')
    return
  }
  if (files.length > remain) {
    ui.toast(`最多上传 ${MAX_IMAGES} 张图片，已忽略多余文件`, 'info')
  }

  const targetImages = form.value.images
  for (const file of files.slice(0, remain)) {
    if (!file.type.startsWith('image/')) {
      ui.toast(`「${file.name}」不是图片文件`, 'error')
      continue
    }
    if (file.size > MAX_IMAGE_SIZE) {
      ui.toast(`「${file.name}」超过 5MB`, 'error')
      continue
    }
    uploading.value = true
    try {
      const { url } = await feedbackApi.uploadImage(file)
      targetImages.push(url)
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : '图片上传失败', 'error')
    } finally {
      uploading.value = false
    }
  }
}

function removeImage(index: number) {
  form.value.images.splice(index, 1)
}

async function submit() {
  if (submitting.value) return
  const content = form.value.content.trim()
  if (content.length < 5) {
    ui.toast('请至少填写 5 个字的描述', 'error')
    contentRef.value?.focus()
    return
  }
  if (!orderNo.value) {
    ui.toast('订单信息缺失，请刷新页面后重试', 'error')
    return
  }

  submitting.value = true
  try {
    await feedbackApi.create({
      type: form.value.type,
      content,
      contact: form.value.contact.trim() || undefined,
      orderNo: orderNo.value,
      images: form.value.images.length ? form.value.images : undefined,
    })
    ui.toast('留言已提交，客服会尽快回复', 'success')
    form.value = {
      type: 1,
      content: '',
      contact: form.value.contact,
      images: [],
    }
    tab.value = 'history'
    await loadFeedbacks()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="cs-mask" @click.self="close">
    <div class="cs-modal card" role="dialog" aria-modal="true" aria-labelledby="cs-title">
      <header class="cs-head">
        <div class="cs-head__main">
          <span class="cs-head__icon">💬</span>
          <div>
            <h2 id="cs-title">联系客服</h2>
            <p class="muted">订单 {{ orderNo }} · {{ serviceHours || '客服会尽快回复你' }}</p>
          </div>
        </div>
        <button class="cs-close" aria-label="关闭" @click="close">✕</button>
      </header>

      <div class="cs-body">
        <p v-if="configLoading && !config" class="cs-config-tip muted">正在加载客服信息…</p>

        <section class="cs-channels">
          <div class="cs-channel">
            <span class="cs-channel__icon">☎</span>
            <div class="cs-channel__body">
              <span class="cs-channel__label">客服热线</span>
              <a v-if="servicePhone" class="cs-channel__value" :href="telHref">
                {{ servicePhone }}
              </a>
              <span v-else class="cs-channel__value is-empty">暂未配置</span>
            </div>
            <button
              v-if="servicePhone"
              class="cs-channel__copy"
              @click="copyText(servicePhone, '客服热线')"
            >
              复制
            </button>
          </div>

          <div class="cs-channel">
            <span class="cs-channel__icon">✉</span>
            <div class="cs-channel__body">
              <span class="cs-channel__label">客服邮箱</span>
              <a v-if="serviceEmail" class="cs-channel__value" :href="mailHref">
                {{ serviceEmail }}
              </a>
              <span v-else class="cs-channel__value is-empty">暂未配置</span>
            </div>
            <button
              v-if="serviceEmail"
              class="cs-channel__copy"
              @click="copyText(serviceEmail, '客服邮箱')"
            >
              复制
            </button>
          </div>

          <div class="cs-channel">
            <span class="cs-channel__icon">🕘</span>
            <div class="cs-channel__body">
              <span class="cs-channel__label">服务时间</span>
              <span class="cs-channel__value is-text">{{ serviceHours || '—' }}</span>
            </div>
          </div>
        </section>

        <div class="cs-order">
          <div class="cs-order__main">
            <span class="cs-order__label">当前订单</span>
            <b class="cs-order__no">{{ orderNo }}</b>
            <span class="cs-order__meta">
              {{ statusText }} · {{ amountLabel }} ¥{{ formatMoney(order?.payAmount ?? 0) }} · 共 {{ itemCount }} 件
            </span>
          </div>
          <button class="cs-order__copy" @click="copyText(orderNo, '订单号')">复制订单号</button>
        </div>

        <div class="cs-tabs" role="tablist">
          <button
            role="tab"
            :aria-selected="tab === 'ai'"
            :class="{ 'is-active': tab === 'ai' }"
            @click="switchTab('ai')"
          >
            AI 客服
            <span class="cs-tabs__ai">AI</span>
          </button>
          <button
            role="tab"
            :aria-selected="tab === 'form'"
            :class="{ 'is-active': tab === 'form' }"
            @click="switchTab('form')"
          >
            在线留言
          </button>
          <button
            role="tab"
            :aria-selected="tab === 'history'"
            :class="{ 'is-active': tab === 'history' }"
            @click="switchTab('history')"
          >
            留言记录
            <span v-if="hasReplied" class="cs-tabs__dot" aria-label="有客服回复" />
            <span v-if="feedbacks.length" class="cs-tabs__count">{{ feedbacks.length }}</span>
          </button>
        </div>

        <div v-if="tab === 'ai'" class="cs-pane cs-ai-pane">
          <AiChatPanel :order-no="orderNo" @transferred="onAiTransferred" />
        </div>

        <div v-else-if="tab === 'form'" class="cs-pane">
          <p class="cs-tip">
            描述遇到的问题后提交，留言会自动关联订单 <b>{{ orderNo }}</b>，客服回复后会显示在「留言记录」中。
          </p>

          <div class="cs-quick">
            <button v-for="q in QUICK_QUESTIONS" :key="q" class="cs-quick__item" @click="applyQuick(q)">
              {{ q }}
            </button>
          </div>

          <p class="cs-label">问题类型</p>
          <div class="cs-types">
            <button
              v-for="t in TYPE_OPTIONS"
              :key="t.value"
              class="cs-type"
              :class="{ 'is-active': form.type === t.value }"
              @click="form.type = t.value"
            >
              {{ t.label }}
            </button>
          </div>

          <p class="cs-label">
            问题描述 <span class="muted">（至少 5 个字）</span>
          </p>
          <textarea
            ref="contentRef"
            v-model="form.content"
            class="cs-textarea"
            rows="4"
            maxlength="2000"
            placeholder="请详细描述遇到的问题，便于客服快速处理…"
          />
          <p class="cs-counter muted">{{ form.content.length }}/2000</p>

          <p class="cs-label">
            图片凭证 <span class="muted">（选填，最多 {{ MAX_IMAGES }} 张）</span>
          </p>
          <div class="cs-images">
            <div v-for="(url, index) in form.images" :key="url" class="cs-image">
              <img :src="url" alt="留言图片" />
              <button class="cs-image__remove" aria-label="移除图片" @click="removeImage(index)">✕</button>
            </div>
            <label v-if="form.images.length < MAX_IMAGES" class="cs-add" :class="{ 'is-disabled': uploading }">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                :disabled="uploading"
                @change="onPickImages"
              />
              <span v-if="uploading" class="cs-add__text">上传中…</span>
              <span v-else class="cs-add__text">+<br />上传图片</span>
            </label>
          </div>

          <p class="cs-label">
            联系方式 <span class="muted">（选填）</span>
          </p>
          <input
            v-model="form.contact"
            class="cs-input"
            maxlength="100"
            placeholder="手机号或邮箱，便于客服联系你"
          />

          <div class="cs-actions">
            <button class="btn btn-primary" :disabled="submitting || uploading" @click="submit">
              {{ submitting ? '提交中…' : '提交留言' }}
            </button>
          </div>
        </div>

        <div v-else class="cs-pane">
          <div class="cs-history-bar">
            <span class="muted">客服回复会同步显示在这里</span>
            <button class="cs-refresh" :disabled="feedbackLoading" @click="loadFeedbacks">
              {{ feedbackLoading ? '刷新中…' : '刷新' }}
            </button>
          </div>
          <div v-if="feedbackLoading && !feedbacks.length" class="cs-state muted">正在加载留言记录…</div>
          <div v-else-if="feedbackError" class="cs-state cs-state--error">
            <p>{{ feedbackError }}</p>
            <button class="btn btn-secondary btn-sm" @click="loadFeedbacks">重新加载</button>
          </div>
          <div v-else-if="!feedbacks.length" class="cs-state">
            <p class="cs-state__icon">💬</p>
            <p class="muted">该订单还没有留言记录</p>
            <button class="btn btn-secondary btn-sm" @click="switchTab('form')">去留言</button>
          </div>
          <ul v-else class="cs-tickets">
            <li v-for="f in feedbacks" :key="f.id" class="cs-ticket">
              <div class="cs-ticket__head">
                <span class="cs-ticket__type">{{ FEEDBACK_TYPE_TEXT[f.type] ?? '留言' }}</span>
                <span class="cs-ticket__status" :class="`is-${f.status}`">
                  {{ FEEDBACK_STATUS_TEXT[f.status] ?? '处理中' }}
                </span>
                <span class="muted cs-ticket__time">{{ f.createdAt }}</span>
              </div>
              <p class="cs-ticket__content">{{ f.content }}</p>
              <div v-if="f.images.length" class="cs-ticket__images">
                <a
                  v-for="(img, index) in f.images"
                  :key="`${f.id}-${index}`"
                  :href="img"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img :src="img" alt="留言图片" />
                </a>
              </div>
              <div v-if="f.replyContent" class="cs-reply">
                <div class="cs-reply__head">
                  <b>客服回复</b>
                  <span v-if="f.replier" class="muted">{{ f.replier }}</span>
                </div>
                <p>{{ f.replyContent }}</p>
                <span v-if="f.replyAt" class="muted">{{ f.replyAt }}</span>
              </div>
              <p v-else class="cs-ticket__wait muted">
                {{ f.status === 2 ? '该留言已关闭，如有疑问可以重新留言' : '客服正在处理中，回复会显示在这里～' }}
              </p>
            </li>
          </ul>
        </div>
      </div>

      <footer class="cs-foot">
        <router-link to="/help" class="cs-foot__link" @click="close">查看帮助中心 →</router-link>
        <button class="btn btn-secondary" @click="close">关闭</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.cs-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}
.cs-modal {
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cs-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border-light);
}
.cs-head__main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.cs-head__icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fff8ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.cs-head h2 {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 4px;
}
.cs-head .muted {
  font-size: 13px;
}
.cs-close {
  border: none;
  background: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
}
.cs-close:hover {
  color: var(--text);
}
.cs-body {
  padding: 16px 22px 4px;
  overflow-y: auto;
  flex: 1;
}
.cs-config-tip {
  font-size: 12px;
  margin-bottom: 10px;
}
.cs-channels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.cs-channel {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--bg-subtle);
  border-radius: 10px;
  padding: 12px;
  min-width: 0;
}
.cs-channel__icon {
  font-size: 16px;
  line-height: 1.4;
  flex-shrink: 0;
}
.cs-channel__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.cs-channel__label {
  font-size: 12px;
  color: var(--text-secondary);
}
.cs-channel__value {
  font-size: 13px;
  font-weight: 700;
  color: var(--amz-link);
  word-break: break-all;
}
a.cs-channel__value:hover {
  color: var(--amz-link-hover);
  text-decoration: underline;
}
.cs-channel__value.is-empty {
  color: var(--text-secondary);
  font-weight: 400;
}
.cs-channel__value.is-text {
  color: var(--text);
}
.cs-channel__copy {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 2px 5px;
  cursor: pointer;
  flex-shrink: 0;
}
.cs-channel__copy:hover {
  border-color: var(--amz-orange);
  color: var(--amz-price);
}
.cs-order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 12px;
}
.cs-order__main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
}
.cs-order__label {
  font-size: 12px;
  color: var(--text-secondary);
}
.cs-order__no {
  font-size: 14px;
  word-break: break-all;
}
.cs-order__meta {
  font-size: 12.5px;
  color: var(--text-secondary);
}
.cs-order__copy {
  border: none;
  background: none;
  color: var(--amz-link);
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
}
.cs-order__copy:hover {
  color: var(--amz-link-hover);
  text-decoration: underline;
}
.cs-tabs {
  display: flex;
  gap: 22px;
  border-bottom: 1px solid var(--border-light);
  margin-top: 16px;
}
.cs-tabs button {
  position: relative;
  border: none;
  background: none;
  padding: 10px 2px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}
.cs-tabs button.is-active {
  color: var(--text);
  font-weight: 700;
}
.cs-tabs button.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--amz-price);
  border-radius: 2px 2px 0 0;
}
.cs-tabs__dot {
  position: absolute;
  top: 7px;
  right: -7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e03131;
}
.cs-tabs__count {
  display: inline-block;
  min-width: 17px;
  margin-left: 5px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 17px;
  text-align: center;
  vertical-align: 1px;
}
.cs-pane {
  padding: 14px 0 16px;
}
.cs-history-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
}
.cs-refresh {
  border: none;
  background: none;
  padding: 0;
  color: var(--amz-link);
  font-size: 12.5px;
  cursor: pointer;
}
.cs-refresh:hover:not(:disabled) {
  color: var(--amz-link-hover);
  text-decoration: underline;
}
.cs-refresh:disabled {
  color: var(--text-secondary);
  cursor: wait;
}
.cs-tip {
  background: #fff8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.7;
  color: #8a5a00;
}
.cs-tip b {
  word-break: break-all;
}
.cs-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.cs-quick__item {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.cs-quick__item:hover {
  border-color: var(--amz-orange);
  background: #fffdf8;
  color: var(--amz-price);
}
.cs-label {
  font-size: 13.5px;
  font-weight: 700;
  margin: 16px 0 8px;
}
.cs-label .muted {
  font-weight: 400;
  font-size: 12px;
}
.cs-types {
  display: flex;
  gap: 10px;
}
.cs-type {
  flex: 1;
  padding: 8px 0;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--text);
  cursor: pointer;
}
.cs-type.is-active {
  border-color: var(--amz-orange);
  background: #fff8ec;
  color: var(--amz-price);
  font-weight: 700;
}
.cs-textarea,
.cs-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: #fff;
}
.cs-textarea {
  resize: vertical;
  min-height: 96px;
}
.cs-textarea:focus,
.cs-input:focus {
  border-color: var(--amz-orange);
}
.cs-counter {
  text-align: right;
  font-size: 11.5px;
  margin-top: 4px;
}
.cs-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.cs-image {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}
.cs-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cs-image__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.cs-add {
  width: 72px;
  height: 72px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  cursor: pointer;
  background: #fff;
}
.cs-add:hover {
  border-color: var(--amz-orange);
  color: var(--amz-price);
}
.cs-add.is-disabled {
  cursor: wait;
  opacity: 0.7;
}
.cs-add input {
  display: none;
}
.cs-add__text {
  font-size: 12px;
  line-height: 1.4;
}
.cs-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
.cs-state {
  text-align: center;
  padding: 30px 12px;
  font-size: 13.5px;
}
.cs-state--error {
  color: #c0392b;
}
.cs-state--error p {
  margin-bottom: 10px;
}
.cs-state__icon {
  font-size: 30px;
  margin-bottom: 8px;
}
.cs-state .btn {
  margin-top: 10px;
}
.cs-tickets {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cs-ticket {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 12px 14px;
}
.cs-ticket__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
}
.cs-ticket__type {
  background: var(--bg-hover);
  border-radius: 4px;
  padding: 2px 7px;
}
.cs-ticket__status {
  font-weight: 700;
}
.cs-ticket__status.is-0 {
  color: var(--amz-price);
}
.cs-ticket__status.is-1 {
  color: var(--amz-success);
}
.cs-ticket__status.is-2 {
  color: var(--text-secondary);
}
.cs-ticket__time {
  margin-left: auto;
  font-size: 11.5px;
}
.cs-ticket__content {
  font-size: 13.5px;
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
}
.cs-ticket__images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.cs-ticket__images img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-light);
}
.cs-reply {
  margin-top: 10px;
  background: #fff8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
.cs-reply__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.cs-reply__head b {
  color: var(--amz-price);
  font-size: 12.5px;
}
.cs-reply p {
  line-height: 1.65;
  word-break: break-word;
  white-space: pre-wrap;
}
.cs-reply .muted {
  font-size: 11.5px;
}
.cs-ticket__wait {
  margin-top: 8px;
  font-size: 12px;
}
.cs-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px;
  border-top: 1px solid var(--border-light);
}
.cs-foot__link {
  font-size: 13px;
  color: var(--amz-link);
}
.cs-foot__link:hover {
  color: var(--amz-link-hover);
  text-decoration: underline;
}

@media (max-width: 640px) {
  .cs-mask {
    padding: 8px;
  }
  .cs-modal {
    max-height: 94vh;
  }
  .cs-head {
    padding: 16px 16px 12px;
  }
  .cs-body {
    padding: 12px 16px 0;
  }
  .cs-channels {
    grid-template-columns: 1fr;
  }
  .cs-order {
    align-items: flex-start;
    flex-direction: column;
  }
  .cs-foot {
    padding: 12px 16px;
  }
}
/* ------------------------------ AI 客服 ------------------------------ */
.cs-tabs__ai {
  display: inline-block;
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 4px;
  background: linear-gradient(135deg, #ff7a18, #ffb020);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  vertical-align: 1px;
}
.cs-ai-pane {
  padding-top: 4px;
}
</style>
