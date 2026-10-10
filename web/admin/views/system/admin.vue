<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminRoleItem, AdminUserItem } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const list = ref<AdminUserItem[]>([])
const roles = ref<AdminRoleItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10

const dialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  username: '',
  password: '',
  realName: '',
  phone: '',
  roleId: undefined as number | undefined,
  status: 1,
})

async function load() {
  loading.value = true
  try {
    const res = await adminApi.systemApi.admins(page.value, pageSize)
    list.value = res.list
    total.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(dialog, {
    visible: true,
    mode: 'create',
    id: 0,
    username: '',
    password: '',
    realName: '',
    phone: '',
    roleId: undefined,
    status: 1,
  })
}

function openEdit(row: AdminUserItem) {
  Object.assign(dialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    username: row.username,
    password: '',
    realName: row.realName,
    phone: row.phone,
    roleId: row.roleId ?? undefined,
    status: row.status,
  })
}

async function submit() {
  try {
    if (dialog.mode === 'create') {
      if (!dialog.username || !dialog.password) {
        ElMessage.warning('请填写账号与密码')
        return
      }
      await adminApi.systemApi.createAdmin({
        username: dialog.username,
        password: dialog.password,
        realName: dialog.realName,
        phone: dialog.phone,
        roleId: dialog.roleId,
        status: dialog.status,
      })
    } else {
      await adminApi.systemApi.updateAdmin(dialog.id, {
        realName: dialog.realName,
        phone: dialog.phone,
        roleId: dialog.roleId,
        status: dialog.status,
      })
    }
    ElMessage.success('已保存')
    dialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function resetPassword(row: AdminUserItem) {
  let password = ''
  try {
    const res = await ElMessageBox.prompt(`为「${row.username}」设置新密码`, '重置密码', {
      inputValue: '',
      inputPattern: /^.{6,50}$/,
      inputErrorMessage: '密码长度 6-50 位',
    })
    password = res.value
  } catch {
    return
  }
  try {
    await adminApi.systemApi.resetPassword(row.id, password)
    ElMessage.success('密码已重置')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function remove(row: AdminUserItem) {
  try {
    await ElMessageBox.confirm(`确定删除管理员「${row.username}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.systemApi.removeAdmin(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

onMounted(async () => {
  try {
    roles.value = await adminApi.systemApi.roles()
  } catch {
    /* ignore */
  }
  load()
})
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-button v-if="admin.hasPerm('system:create')" type="primary" @click="openCreate">新增管理员</el-button>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="账号" prop="username" width="150" />
        <el-table-column label="姓名" prop="realName" width="130" />
        <el-table-column label="角色" prop="roleName" width="140" />
        <el-table-column label="手机号" prop="phone" width="150" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="admin.hasPerm('system:update')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="admin.hasPerm('system:update')" link type="primary" @click="resetPassword(row)">重置密码</el-button>
            <el-button v-if="admin.hasPerm('system:delete')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          @current-change="(p: number) => { page = p; load() }"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增管理员' : '编辑管理员'" width="440px">
      <el-form label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="dialog.username" :disabled="dialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item v-if="dialog.mode === 'create'" label="密码">
          <el-input v-model="dialog.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="姓名"><el-input v-model="dialog.realName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="dialog.phone" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="dialog.roleId" placeholder="请选择角色" clearable style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
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
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
