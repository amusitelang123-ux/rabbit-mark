<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminFeedback } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const list = ref<AdminFeedback[]>([])
const total = ref(0)
const query = reactive({
  keyword: '',
  type: undefined as number | undefined,
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
})

const TYPE_TEXT: Record<number, string> = { 1: '咨询', 2: '投诉', 3: '建议' }
const STATUS_TEXT: Record<number, string> = { 0: '待处理', 1: '已回复', 2: '已关闭' }

const replyDialog = reactive({ visible: false, id: 0, content: '', target: '' })
const detailDialog = reactive({ visible: false, data: null as AdminFeedback | null })

function statusType(status: number) {
  if (status === 0) return 'warning'
  if (status === 1) return 'success'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    const res = await adminApi.feedbackApi.list({ ...query })
    list.value = res.list
    total.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function search() {
  query.page = 1
  load()
}

function reset() {
  query.keyword = ''
  query.type = undefined
  query.status = undefined
  search()
}

function openDetail(row: AdminFeedback) {
  detailDialog.data = row
  detailDialog.visible = true
}

function openReply(row: AdminFeedback) {
  Object.assign(replyDialog, { visible: true, id: row.id, content: '', target: row.content.slice(0, 40) })
}

async function submitReply() {
  if (!replyDialog.content.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  try {
    await adminApi.feedbackApi.reply(replyDialog.id, replyDialog.content.trim())
    ElMessage.success('回复成功')
    replyDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '回复失败')
  }
}

async function closeFeedback(row: AdminFeedback) {
  try {
    await adminApi.feedbackApi.close(row.id)
    ElMessage.success('工单已关闭')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="留言内容 / 订单号" clearable style="width: 190px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.type" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="(label, value) in TYPE_TEXT" :key="value" :label="label" :value="Number(value)" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="(label, value) in STATUS_TEXT" :key="value" :label="label" :value="Number(value)" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <img :src="row.avatar" alt="" />
              <span>{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ TYPE_TEXT[row.type] ?? row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="留言内容" min-width="240">
          <template #default="{ row }">
            <p class="content">{{ row.content }}</p>
            <p v-if="row.replyContent" class="reply">回复：{{ row.replyContent }}</p>
          </template>
        </el-table-column>
        <el-table-column label="联系方式" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.contact || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ STATUS_TEXT[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" prop="createdAt" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="admin.hasPerm('feedback:update') && row.status !== 2" link type="primary" @click="openReply(row)">
              回复
            </el-button>
            <el-button
              v-if="admin.hasPerm('feedback:update') && row.status !== 2"
              link
              type="danger"
              @click="closeFeedback(row)"
            >
              关闭
            </el-button>
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
          @current-change="(p: number) => { query.page = p; load() }"
        />
      </div>
    </el-card>

    <el-dialog v-model="replyDialog.visible" title="回复工单" width="520px">
      <p class="muted dialog-quote">用户留言：{{ replyDialog.target }}…</p>
      <el-input v-model="replyDialog.content" type="textarea" :rows="5" maxlength="2000" placeholder="请输入回复内容" />
      <template #footer>
        <el-button @click="replyDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">发送回复</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialog.visible" title="工单详情" width="560px">
      <template v-if="detailDialog.data">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="用户">{{ detailDialog.data.nickname }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ TYPE_TEXT[detailDialog.data.type] }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ STATUS_TEXT[detailDialog.data.status] }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detailDialog.data.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="联系方式" :span="2">{{ detailDialog.data.contact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联订单" :span="2">{{ detailDialog.data.orderNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="留言内容" :span="2">{{ detailDialog.data.content }}</el-descriptions-item>
          <el-descriptions-item v-if="detailDialog.data.replyContent" label="官方回复" :span="2">
            {{ detailDialog.data.replyContent }}
            <p class="muted">{{ detailDialog.data.replier }} · {{ detailDialog.data.replyAt }}</p>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-cell img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f2f5;
}
.content {
  font-size: 13px;
  color: #1f2733;
}
.reply {
  font-size: 12px;
  color: #8a93a0;
  margin-top: 4px;
}
.muted {
  color: #9aa3af;
  font-size: 12px;
}
.dialog-quote {
  background: #f5f6f8;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
</style>
