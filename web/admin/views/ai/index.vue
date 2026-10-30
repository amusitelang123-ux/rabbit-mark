<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminAiConversation, AdminAiMessage, AdminAiUsage } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const rebuilding = ref(false)
const usage = ref<AdminAiUsage | null>(null)

const list = ref<AdminAiConversation[]>([])
const total = ref(0)
const query = reactive({
  keyword: '',
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
})

const STATUS_TEXT: Record<number, string> = { 1: '进行中', 2: '已转人工', 3: '已关闭' }
const ROLE_TEXT: Record<string, string> = { user: '用户', assistant: 'AI 客服', tool: '工具' }

const drawer = reactive({
  visible: false,
  title: '',
  loading: false,
  messages: [] as AdminAiMessage[],
})

function statusType(status: number) {
  if (status === 2) return 'success'
  if (status === 3) return 'info'
  return 'warning'
}

function money(value: number | undefined): string {
  return `¥${Number(value ?? 0).toFixed(4)}`
}

async function loadUsage() {
  try {
    usage.value = await adminApi.aiApi.usage()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '用量加载失败')
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await adminApi.aiApi.conversations({ ...query })
    list.value = res.list
    total.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '会话加载失败')
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await Promise.all([loadUsage(), loadList()])
}

function search() {
  query.page = 1
  void loadList()
}

function reset() {
  query.keyword = ''
  query.status = undefined
  search()
}

async function openConversation(row: AdminAiConversation) {
  drawer.visible = true
  drawer.title = `会话 #${row.id} · ${row.nickname}`
  drawer.loading = true
  drawer.messages = []
  try {
    drawer.messages = await adminApi.aiApi.messages(row.id)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '消息加载失败')
  } finally {
    drawer.loading = false
  }
}

async function rebuild() {
  try {
    await ElMessageBox.confirm(
      '将重新采集 FAQ、公告、物流公司、运费模板与平台规则，覆盖现有知识切片。确定执行？',
      '重建知识库',
      { type: 'warning' },
    )
  } catch {
    return
  }
  rebuilding.value = true
  try {
    const result = await adminApi.aiApi.rebuild()
    ElMessage.success(`知识库已重建：共 ${result.total} 条切片`)
    await loadUsage()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '重建失败')
  } finally {
    rebuilding.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="ai-page">
    <el-card shadow="never" class="head">
      <div class="head__main">
        <div>
          <h2>AI 智能客服</h2>
          <p class="muted">
            知识库问答 + 订单工具调用。回答、引用与调用成本全部留痕，可随时关闭或降级。
          </p>
        </div>
        <div class="head__actions">
          <el-tag :type="usage?.mode === 'deepseek' ? 'success' : 'warning'" effect="light">
            {{
              usage?.mode === 'deepseek'
                ? `DeepSeek · ${usage.model}`
                : usage?.usingFallback
                  ? '演示模式（未配置 Key）'
                  : '演示模式（mock）'
            }}
          </el-tag>
          <el-button
            v-if="admin.hasPerm('ai:manage')"
            :loading="rebuilding"
            type="primary"
            plain
            @click="rebuild"
          >
            重建知识库
          </el-button>
          <el-button :loading="loading" @click="refresh">刷新</el-button>
        </div>
      </div>
    </el-card>

    <div class="stats">
      <div class="stat">
        <span class="stat__label">今日调用</span>
        <b class="stat__value">{{ usage?.today.calls ?? 0 }}</b>
        <span class="stat__hint">近 7 天 {{ usage?.week.calls ?? 0 }} 次</span>
      </div>
      <div class="stat">
        <span class="stat__label">今日 Token</span>
        <b class="stat__value">{{ (usage?.today.tokens ?? 0).toLocaleString() }}</b>
        <span class="stat__hint">输入 + 输出</span>
      </div>
      <div class="stat">
        <span class="stat__label">今日成本</span>
        <b class="stat__value">{{ money(usage?.today.cost) }}</b>
        <span class="stat__hint">按配置单价估算</span>
      </div>
      <div class="stat">
        <span class="stat__label">平均延迟</span>
        <b class="stat__value">{{ usage?.today.avgLatency ?? 0 }} ms</b>
        <span class="stat__hint">失败 {{ usage?.today.failures ?? 0 }} 次</span>
      </div>
      <div class="stat">
        <span class="stat__label">会话 / 消息</span>
        <b class="stat__value">
          {{ usage?.totals.conversations ?? 0 }} / {{ usage?.totals.messages ?? 0 }}
        </b>
        <span class="stat__hint">知识切片 {{ usage?.totals.knowledgeChunks ?? 0 }} 条</span>
      </div>
    </div>

    <el-card shadow="never">
      <div class="card-head">
        <b>近 7 天调用</b>
        <span class="muted">
          知识库索引：{{ usage?.knowledgeIndexedAt ? usage.knowledgeIndexedAt.replace('T', ' ').slice(0, 19) : '尚未建立' }}
        </span>
      </div>
      <el-table :data="usage?.daily ?? []" size="small">
        <el-table-column prop="date" label="日期" width="130" />
        <el-table-column prop="calls" label="调用次数" width="110" />
        <el-table-column label="Token">
          <template #default="{ row }">{{ Number(row.tokens).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="成本">
          <template #default="{ row }">{{ money(row.cost) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="标题 / 最后消息 / 订单号"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option
              v-for="(label, value) in STATUS_TEXT"
              :key="value"
              :label="label"
              :value="Number(value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <span>{{ row.nickname }}</span>
              <span v-if="row.phone" class="muted">{{ row.phone }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单号" width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.orderNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="最后消息" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.lastMessage || row.title || '—' }}</template>
        </el-table-column>
        <el-table-column label="消息数" prop="messageCount" width="90" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ STATUS_TEXT[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近活跃" width="170">
          <template #default="{ row }">{{ row.lastMessageAt || row.createdAt }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openConversation(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="query.page"
          :page-size="query.pageSize"
          @current-change="(p: number) => { query.page = p; loadList() }"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawer.title" size="560px">
      <div v-loading="drawer.loading" class="chat">
        <p v-if="!drawer.messages.length && !drawer.loading" class="muted">暂无消息</p>
        <div
          v-for="m in drawer.messages"
          :key="m.id"
          class="msg"
          :class="`is-${m.role === 'user' ? 'user' : 'ai'}`"
        >
          <div class="msg__meta">
            <span>{{ ROLE_TEXT[m.role] ?? m.role }}</span>
            <span class="muted">{{ m.createdAt }}</span>
            <span v-if="m.tokens" class="muted">{{ m.tokens }} tokens</span>
          </div>
          <div class="msg__bubble">{{ m.content }}</div>
          <div v-if="m.citations.length" class="msg__cites">
            <el-tag v-for="(c, i) in m.citations" :key="i" size="small" type="info" effect="plain">
              [{{ i + 1 }}] {{ c.title }}
            </el-tag>
          </div>
          <div v-if="m.toolCalls.length" class="msg__tools">
            <span v-for="(t, i) in m.toolCalls" :key="i" class="muted">🔧 {{ t.name }}</span>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.head h2 {
  font-size: 18px;
  margin-bottom: 6px;
}
.head .muted {
  font-size: 12.5px;
}
.head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.stat {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat__label {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.stat__value {
  font-size: 22px;
  line-height: 1.3;
}
.stat__hint {
  font-size: 11.5px;
  color: var(--el-text-color-secondary, #909399);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.card-head .muted {
  font-size: 12px;
}
.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-cell .muted {
  font-size: 11.5px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.chat {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 120px;
}
.msg {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.msg.is-user {
  align-items: flex-end;
}
.msg__meta {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
}
.msg__bubble {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f7fa;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.is-user .msg__bubble {
  background: #fff3e8;
}
.msg__cites {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.msg__tools {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
}
@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .head__main {
    flex-direction: column;
  }
  .head__actions {
    justify-content: flex-start;
  }
}
</style>
