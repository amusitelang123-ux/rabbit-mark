<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { aiApi } from '@/api'
import type { AiCitation, AiConfig, AiOrderOption, AiStreamHandlers } from '@/api/types'
import { useUiStore } from '@/stores/ui'

/**
 * 可复用的 AI 客服面板：
 * - 订单详情弹窗：固定订单，不显示选择器
 * - 帮助中心：显示订单选择器，可指定订单，也可「不选择订单」咨询通用问题
 *
 * 订单号通过 v-model:order-no 由父组件持有，面板只负责展示与触发切换。
 */

const props = withDefaults(
  defineProps<{
    orderNo?: string
    orders?: AiOrderOption[]
    showOrderPicker?: boolean
    listHeight?: string
  }>(),
  {
    orderNo: '',
    orders: () => [],
    showOrderPicker: false,
    listHeight: '300px',
  },
)

const emit = defineEmits<{
  'update:orderNo': [value: string]
  transferred: [payload: { feedbackId: number; conversationId: number }]
}>()

const ui = useUiStore()

const DEFAULT_QUESTIONS = [
  '我的订单什么时候发货？',
  '帮我查一下物流到哪了',
  '想退货，流程是怎样的？',
  '怎么开发票？',
]

interface AiUiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: AiCitation[]
  pending?: boolean
}

const aiConfig = ref<AiConfig | null>(null)
const loadingConfig = ref(false)
const messages = ref<AiUiMessage[]>([])
const input = ref('')
const sending = ref(false)
const transferring = ref(false)
const errorText = ref('')
const statusText = ref('')
const conversationId = ref<number | null>(null)
const loadingHistory = ref(false)
const scroller = ref<HTMLElement | null>(null)

let abort: AbortController | null = null
let loadSeq = 0

const quickQuestions = computed(() => aiConfig.value?.quickQuestions ?? DEFAULT_QUESTIONS)
const selectedOrderNo = computed(() => props.orderNo ?? '')

async function loadConfig() {
  loadingConfig.value = true
  try {
    aiConfig.value = await aiApi.config()
  } catch {
    // 配置加载失败时使用内置文案，不阻塞提问
  } finally {
    loadingConfig.value = false
  }
}

function resetState() {
  // 先摘掉引用再 abort：旧请求的 catch/finally 会因 abort !== controller 而跳过，
  // 避免切换订单后旧请求的报错或“停止生成”串到新会话里
  const current = abort
  abort = null
  current?.abort()
  sending.value = false
  messages.value = []
  conversationId.value = null
  input.value = ''
  errorText.value = ''
  statusText.value = ''
}

/** 切换订单后重新加载该订单（或通用）最近一次会话 */
async function reload() {
  const seq = ++loadSeq
  resetState()
  loadingHistory.value = true
  try {
    const rows = await aiApi.conversations(props.orderNo || undefined)
    if (seq !== loadSeq) return
    const latest = rows[0]
    if (!latest) return
    conversationId.value = latest.id
    const history = await aiApi.messages(latest.id)
    if (seq !== loadSeq) return
    messages.value = history.map((item) => ({
      id: `h-${item.id}`,
      role: item.role,
      content: item.content,
      citations: item.citations ?? [],
    }))
    scrollToBottom()
  } catch {
    // 历史加载失败按新会话处理
  } finally {
    if (seq === loadSeq) loadingHistory.value = false
  }
}

function scrollToBottom() {
  void nextTick(() => {
    const el = scroller.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onOrderChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:orderNo', value)
}

/**
 * 发送提问。handlers 只用于面板内部更新流式状态；
 * 真正的恢复逻辑放在 onDone / catch 中，避免中途替换对象。
 */
async function send(preset?: string) {
  if (sending.value || loadingHistory.value) return
  const content = (preset ?? input.value).trim()
  if (!content) return
  if (aiConfig.value && !aiConfig.value.enabled) {
    ui.toast('AI 客服暂未开启，请使用在线留言', 'info')
    return
  }

  input.value = ''
  errorText.value = ''
  statusText.value = ''
  messages.value.push({ id: `u-${Date.now()}`, role: 'user', content, citations: [] })
  messages.value.push({
    id: `a-${Date.now()}`,
    role: 'assistant',
    content: '',
    citations: [],
    pending: true,
  })
  const target = messages.value[messages.value.length - 1]
  sending.value = true
  const controller = new AbortController()
  abort = controller
  scrollToBottom()

  const handlers: AiStreamHandlers = {
    onMeta: (meta) => {
      if (abort !== controller) return
      conversationId.value = meta.conversationId
    },
    onThinking: (text) => {
      if (abort !== controller) return
      statusText.value = text
    },
    onTool: (tool) => {
      if (abort !== controller) return
      statusText.value = tool.label
    },
    onDelta: (text) => {
      if (abort !== controller) return
      target.content += text
      target.pending = false
      scrollToBottom()
    },
    onDone: (done) => {
      if (abort !== controller) return
      target.content = done.content
      target.citations = done.citations
      target.pending = false
      statusText.value = ''
      scrollToBottom()
    },
    onError: (message) => {
      if (abort !== controller) return
      errorText.value = message
    },
  }

  try {
    const result = await aiApi.chat(
      {
        message: content,
        conversationId: conversationId.value ?? undefined,
        orderNo: props.orderNo || undefined,
        signal: controller.signal,
      },
      handlers,
    )
    if (abort !== controller) return
    if (!target.content) target.content = result.content
    target.citations = result.citations
  } catch (error) {
    if (abort !== controller) return
    const aborted = (error as { name?: string })?.name === 'AbortError'
    target.pending = false
    if (aborted) {
      if (!target.content) target.content = '（已停止生成）'
    } else {
      const message = error instanceof Error ? error.message : 'AI 客服暂时不可用'
      errorText.value = message
      if (!target.content) {
        target.content = '抱歉，刚才没能回答上来。你可以重试，或点「转人工」由客服跟进。'
      }
    }
  } finally {
    if (abort === controller) {
      sending.value = false
      abort = null
      statusText.value = ''
      scrollToBottom()
    }
  }
}

function stop() {
  abort?.abort()
}

/** 转人工：后端把最近对话摘要写成留言工单 */
async function transfer() {
  if (transferring.value) return
  if (sending.value) stop()
  if (!conversationId.value) {
    ui.toast('请先发送一条消息，或在「在线留言」中提交问题', 'info')
    return
  }
  transferring.value = true
  try {
    const result = await aiApi.transfer(
      conversationId.value,
      selectedOrderNo.value
        ? `用户就订单 ${selectedOrderNo.value} 与 AI 客服沟通后请求转人工`
        : '用户在帮助中心与 AI 客服沟通后请求转人工',
    )
    ui.toast('已转人工，客服会尽快回复', 'success')
    emit('transferred', result)
  } catch (error) {
    ui.toast(error instanceof Error ? error.message : '转人工失败，请直接留言', 'error')
  } finally {
    transferring.value = false
  }
}

watch(
  () => props.orderNo,
  () => {
    void reload()
  },
)

onMounted(() => {
  void loadConfig()
  void reload()
})

onUnmounted(() => {
  abort?.abort()
})
</script>

<template>
  <div class="ai-panel">
    <div class="ai-panel__head">
      <span class="ai-badge" :class="{ 'is-mock': aiConfig?.mode !== 'deepseek' }">
        {{ aiConfig?.mode === 'deepseek' ? 'DeepSeek' : '演示模式' }}
      </span>
      <span class="muted">
        {{
          aiConfig?.mode === 'deepseek'
            ? `由 ${aiConfig?.model ?? 'deepseek-chat'} 生成`
            : '未配置 API Key，当前使用内置话术'
        }}
      </span>
    </div>

    <div v-if="showOrderPicker" class="ai-order">
      <label for="ai-order-select">咨询订单</label>
      <select id="ai-order-select" :value="selectedOrderNo" @change="onOrderChange">
        <option value="">不选择订单（咨询通用问题）</option>
        <option v-for="order in orders" :key="order.orderNo" :value="order.orderNo">
          {{ order.orderNo }} · {{ order.statusText }} · ¥{{ order.payAmount.toFixed(2) }} · {{ order.itemCount }} 件
        </option>
      </select>
    </div>

    <div ref="scroller" class="ai-list" :style="{ height: listHeight }">
      <p v-if="loadingConfig && !aiConfig" class="muted ai-loading">正在连接 AI 客服…</p>
      <template v-else>
        <div v-if="loadingHistory" class="muted ai-loading">正在加载历史会话…</div>
        <div v-else-if="!messages.length" class="ai-welcome">
          <p>
            {{
              aiConfig?.welcome ??
              '你好，我是小兔鲜 AI 客服。订单、物流、退换货、发票的问题都可以问我。'
            }}
          </p>
          <div class="ai-quick">
            <button v-for="q in quickQuestions" :key="q" @click="send(q)">{{ q }}</button>
          </div>
        </div>

        <div v-for="m in messages" :key="m.id" class="ai-msg" :class="`is-${m.role}`">
          <div class="ai-bubble">
            <span v-if="m.pending && !m.content" class="ai-typing" aria-label="正在输入">
              <i /><i /><i />
            </span>
            <p v-else class="ai-text">{{ m.content }}</p>
            <div v-if="m.citations.length" class="ai-cites">
              <span
                v-for="(c, i) in m.citations"
                :key="`${m.id}-${i}`"
                class="ai-cite"
                :title="c.snippet"
              >
                [{{ i + 1 }}] {{ c.title }}
              </span>
            </div>
          </div>
        </div>
      </template>
      <p v-if="statusText" class="ai-status muted">{{ statusText }}</p>
      <p v-if="errorText" class="ai-error">{{ errorText }}</p>
    </div>

    <div class="ai-composer">
      <textarea
        v-model="input"
        class="ai-input"
        rows="2"
        maxlength="500"
        placeholder="描述你的问题，例如：我的订单什么时候发货？"
        @keydown.enter.exact.prevent="send()"
      />
      <div class="ai-actions">
        <span class="muted ai-hint">Enter 发送 · Shift+Enter 换行</span>
        <div class="ai-buttons">
          <button v-if="sending" class="btn btn-secondary btn-sm" @click="stop">停止</button>
          <button v-else class="btn btn-primary btn-sm" :disabled="!input.trim()" @click="send()">
            发送
          </button>
          <button class="btn btn-secondary btn-sm" :disabled="transferring" @click="transfer">
            {{ transferring ? '转接中…' : '转人工' }}
          </button>
        </div>
      </div>
    </div>
    <p class="ai-disclaimer muted">
      {{ aiConfig?.disclaimer ?? '内容由 AI 生成，仅供参考；退款、赔付以人工客服审核为准。' }}
    </p>
  </div>
</template>

<style scoped>
.ai-panel {
  padding-top: 12px;
}
.ai-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 10px;
}
.ai-badge {
  padding: 2px 8px;
  border-radius: 100px;
  background: #eef7ff;
  color: #1677ff;
  font-size: 11px;
  font-weight: 700;
}
.ai-badge.is-mock {
  background: #fff7e6;
  color: #b45309;
}
.ai-order {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12.5px;
}
.ai-order label {
  flex-shrink: 0;
  color: var(--text-secondary);
}
.ai-order select {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: var(--text);
  outline: none;
}
.ai-order select:focus {
  border-color: var(--amz-orange);
}
.ai-loading {
  font-size: 13px;
}
.ai-list {
  overflow-y: auto;
  padding: 4px 2px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-welcome {
  background: var(--bg-subtle);
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.7;
}
.ai-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ai-quick button {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 100px;
  padding: 5px 12px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
}
.ai-quick button:hover {
  border-color: var(--amz-orange);
  color: var(--amz-price);
}
.ai-msg {
  display: flex;
}
.ai-msg.is-user {
  justify-content: flex-end;
}
.ai-bubble {
  max-width: 86%;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-subtle);
  font-size: 13.5px;
  line-height: 1.65;
}
.ai-msg.is-user .ai-bubble {
  background: #fff3e8;
  border: 1px solid #ffe0c2;
}
.ai-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.ai-typing {
  display: inline-flex;
  gap: 4px;
  padding: 4px 2px;
}
.ai-typing i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: ai-blink 1.2s infinite ease-in-out;
}
.ai-typing i:nth-child(2) {
  animation-delay: 0.2s;
}
.ai-typing i:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes ai-blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
.ai-cites {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.ai-cite {
  font-size: 11px;
  color: var(--amz-link);
  background: #f2f7ff;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: help;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-status {
  font-size: 12px;
  margin: 2px 0 0 4px;
}
.ai-error {
  font-size: 12.5px;
  color: var(--amz-price);
  background: #fff2f0;
  border-radius: 6px;
  padding: 8px 10px;
  margin-top: 4px;
}
.ai-composer {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px 10px;
  background: #fff;
}
.ai-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font: inherit;
  font-size: 13.5px;
  line-height: 1.6;
  background: transparent;
  color: var(--text);
}
.ai-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}
.ai-hint {
  font-size: 11px;
}
.ai-buttons {
  display: flex;
  gap: 8px;
}
.ai-disclaimer {
  font-size: 11px;
  margin-top: 8px;
  line-height: 1.5;
}
@media (max-width: 640px) {
  .ai-hint {
    display: none;
  }
}
</style>
