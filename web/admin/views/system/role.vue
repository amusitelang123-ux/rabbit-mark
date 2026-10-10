<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ElTree } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminPermissionItem, AdminRoleItem } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const roles = ref<AdminRoleItem[]>([])
const permissions = ref<AdminPermissionItem[]>([])
const treeRef = ref<InstanceType<typeof ElTree>>()

const dialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  code: '',
  description: '',
  status: 1,
  permissionIds: [] as number[],
})

interface PermNode {
  id: number
  label: string
  children: PermNode[]
}

const permTree = computed<PermNode[]>(() => {
  const nodes: PermNode[] = permissions.value.map((p) => ({
    id: p.id,
    label: `${p.name}（${p.code}）`,
    children: [],
  }))
  const map = new Map(nodes.map((n) => [n.id, n]))
  const roots: PermNode[] = []
  permissions.value.forEach((p, i) => {
    const node = nodes[i]
    const parent = p.parentId ? map.get(p.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
})

async function load() {
  loading.value = true
  try {
    const [r, p] = await Promise.all([adminApi.systemApi.roles(), adminApi.systemApi.permissions()])
    roles.value = r
    permissions.value = p
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(dialog, { visible: true, mode: 'create', id: 0, name: '', code: '', description: '', status: 1, permissionIds: [] })
  treeRef.value?.setCheckedKeys([])
}

function openEdit(row: AdminRoleItem) {
  Object.assign(dialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
    permissionIds: [...row.permissionIds],
  })
  setTimeout(() => treeRef.value?.setCheckedKeys(row.permissionIds), 0)
}

function collectChecked(): number[] {
  const tree = treeRef.value
  if (!tree) return []
  return [...tree.getCheckedKeys(false), ...tree.getHalfCheckedKeys()].map((k) => Number(k))
}

async function submit() {
  if (!dialog.name || !dialog.code) {
    ElMessage.warning('请填写角色名与编码')
    return
  }
  try {
    let roleId = dialog.id
    if (dialog.mode === 'create') {
      const res = await adminApi.systemApi.createRole({
        name: dialog.name,
        code: dialog.code,
        description: dialog.description,
        status: dialog.status,
      })
      roleId = res.id
    } else {
      await adminApi.systemApi.updateRole(dialog.id, {
        name: dialog.name,
        description: dialog.description,
        status: dialog.status,
      })
    }
    await adminApi.systemApi.setRolePermissions(roleId, collectChecked())
    ElMessage.success('已保存')
    dialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function remove(row: AdminRoleItem) {
  try {
    await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.systemApi.removeRole(row.id)
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
      <el-button v-if="admin.hasPerm('system:create')" type="primary" @click="openCreate">新增角色</el-button>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="roles" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="角色名" prop="name" width="150" />
        <el-table-column label="编码" prop="code" width="150" />
        <el-table-column label="描述" prop="description" />
        <el-table-column label="权限数" width="100">
          <template #default="{ row }">
            {{ row.code === 'super_admin' ? '全部' : row.permissionIds.length }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="admin.hasPerm('system:update')" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑权限</el-button>
            <el-button v-if="row.code !== 'super_admin'" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增角色' : '编辑角色'" width="520px">
      <el-form label-width="80px">
        <el-form-item label="角色名"><el-input v-model="dialog.name" /></el-form-item>
        <el-form-item label="编码">
          <el-input v-model="dialog.code" :disabled="dialog.mode === 'edit'" placeholder="如 product_op" />
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="dialog.description" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="dialog.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="权限">
          <div class="perm-tree">
            <el-tree
              ref="treeRef"
              :data="permTree"
              show-checkbox
              node-key="id"
              default-expand-all
              :props="{ label: 'label', children: 'children' }"
            />
          </div>
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
.perm-tree {
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
}
</style>
