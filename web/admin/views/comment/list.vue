<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminComment } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const list = ref<AdminComment[]>([])
const total = ref(0)
const query = reactive({
  keyword: '',
  score: undefined as number | undefined,
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
})

async function load() {
  loading.value = true
  try {
    const res = await adminApi.commentApi.list({ ...query })
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
  query.score = undefined
  query.status = undefined
  search()
}

async function toggleStatus(row: AdminComment) {
  const next = row.status === 1 ? 0 : 1
  try {
    await adminApi.commentApi.setStatus(row.id, next as 0 | 1)
    ElMessage.success(next === 1 ? '已显示' : '已隐藏')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function reply(row: AdminComment) {
  let content = ''
  try {
    const res = await ElMessageBox.prompt('请输入回复内容', '回复评价', {
      inputValue: row.replyContent || '',
      inputPlaceholder: '感谢您的评价…',
    })
    content = res.value
  } catch {
    return
  }
  try {
    await adminApi.commentApi.reply(row.id, content)
    ElMessage.success('回复成功')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '回复失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="评价内容">
          <el-input v-model="query.keyword" placeholder="模糊搜索" clearable style="width: 190px" />
        </el-form-item>
        <el-form-item label="评分">
          <el-select v-model="query.score" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="s in [5, 4, 3, 2, 1]" :key="s" :label="`${s} 星`" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="显示" :value="1" />
            <el-option label="隐藏" :value="0" />
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
        <el-table-column label="商品" min-width="200">
          <template #default="{ row }">
            <div class="item-cell">
              <img :src="row.productImage" alt="" />
              <span>{{ row.productName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <span>{{ row.isAnonymous ? '匿名用户' : row.nickname }}</span>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="130">
          <template #default="{ row }">
            <el-rate :model-value="row.score" disabled size="small" />
          </template>
        </el-table-column>
        <el-table-column label="评价内容" min-width="240">
          <template #default="{ row }">
            <p class="content">{{ row.content }}</p>
            <p v-if="row.replyContent" class="reply">商家回复：{{ row.replyContent }}</p>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '显示' : '隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" prop="createdAt" width="170" />
        <el-table-column v-if="admin.hasPerm('comment:update')" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="reply(row)">回复</el-button>
            <el-button link :type="row.status === 1 ? 'danger' : 'primary'" @click="toggleStatus(row)">
              {{ row.status === 1 ? '隐藏' : '显示' }}
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
.item-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-cell img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
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
</style>
