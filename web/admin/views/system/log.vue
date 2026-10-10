<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminLogItem } from '@admin/api'

const loading = ref(false)
const list = ref<AdminLogItem[]>([])
const total = ref(0)
const query = reactive({
  module: 'auth' as string | undefined,
  page: 1,
  pageSize: 20,
})

/** 模块筛选：auth=登录日志（A-73），其它为操作日志（A-74） */
const MODULE_OPTIONS: { label: string; value: string | undefined }[] = [
  { label: '登录日志', value: 'auth' },
  { label: '全部日志', value: undefined },
]

async function load() {
  loading.value = true
  try {
    const res = await adminApi.systemApi.logs({ ...query })
    list.value = res.list
    total.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onModuleChange() {
  query.page = 1
  load()
}

onMounted(load)
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-radio-group v-model="query.module" @change="onModuleChange">
        <el-radio-button v-for="m in MODULE_OPTIONS" :key="String(m.value)" :value="m.value">
          {{ m.label }}
        </el-radio-button>
      </el-radio-group>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="管理员" prop="adminName" width="130">
          <template #default="{ row }">
            <span :class="{ 'is-unknown': !row.adminId }">{{ row.adminName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="模块" prop="module" width="100" />
        <el-table-column label="动作" width="140">
          <template #default="{ row }">
            <el-tag
              :type="row.action === 'login_failed' ? 'danger' : row.action === 'login_success' ? 'success' : 'info'"
              size="small"
            >
              {{ row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容" prop="content" min-width="280" show-overflow-tooltip />
        <el-table-column label="IP" prop="ip" width="150" />
        <el-table-column label="时间" prop="createdAt" width="170" />
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
.is-unknown {
  color: #9aa3af;
}
</style>
