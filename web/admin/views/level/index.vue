<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminLevel } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()
const canEdit = admin.hasPerm('level:update')

const loading = ref(false)
const list = ref<AdminLevel[]>([])

const dialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  minSpent: 0,
  discountRate: 1,
  sort: 0,
  status: 1,
})

async function load() {
  loading.value = true
  try {
    list.value = await adminApi.levelApi.list()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(dialog, { visible: true, mode: 'create', id: 0, name: '', minSpent: 0, discountRate: 1, sort: 0, status: 1 })
}

function openEdit(row: AdminLevel) {
  Object.assign(dialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    minSpent: row.minSpent,
    discountRate: row.discountRate,
    sort: row.sort,
    status: row.status,
  })
}

async function submit() {
  if (!dialog.name) {
    ElMessage.warning('请输入等级名称')
    return
  }
  const payload = {
    name: dialog.name,
    minSpent: dialog.minSpent,
    discountRate: dialog.discountRate,
    sort: dialog.sort,
    status: dialog.status,
  }
  try {
    if (dialog.mode === 'create') await adminApi.levelApi.create(payload)
    else await adminApi.levelApi.update(dialog.id, payload)
    ElMessage.success('已保存')
    dialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function remove(row: AdminLevel) {
  try {
    await ElMessageBox.confirm(`确定删除等级「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.levelApi.remove(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-button v-if="canEdit" type="primary" @click="openCreate">新增等级</el-button>
      <span class="hint">等级折扣将在下单结算时按用户等级应用（后续迭代接入）</span>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="等级名称" prop="name" width="150" />
        <el-table-column label="升级门槛（累计消费）" width="180">
          <template #default="{ row }">¥{{ row.minSpent }}</template>
        </el-table-column>
        <el-table-column label="折扣率" width="120">
          <template #default="{ row }">{{ row.discountRate === 1 ? '无折扣' : `${(row.discountRate * 10).toFixed(1)} 折` }}</template>
        </el-table-column>
        <el-table-column label="会员数" prop="userCount" width="100" />
        <el-table-column label="排序" prop="sort" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="canEdit" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增等级' : '编辑等级'" width="440px">
      <el-form label-width="110px">
        <el-form-item label="等级名称"><el-input v-model="dialog.name" /></el-form-item>
        <el-form-item label="升级门槛">
          <el-input-number v-model="dialog.minSpent" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="折扣率">
          <el-input-number v-model="dialog.discountRate" :min="0.01" :max="1" :step="0.01" :precision="2" />
          <span class="hint">0.95 = 9.5 折</span>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dialog.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="dialog.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.hint {
  font-size: 12px;
  color: #9aa3af;
  margin-left: 8px;
}
</style>
