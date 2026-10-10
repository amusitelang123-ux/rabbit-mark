<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminBrand, AdminCategoryNode, SpecGroupItem } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()
const canEdit = admin.hasPerm('product:create') || admin.hasPerm('product:update')

const tab = ref('category')
const loading = ref(false)

const categories = ref<AdminCategoryNode[]>([])
const brands = ref<AdminBrand[]>([])
const specGroups = ref<SpecGroupItem[]>([])

/* --------------------------------- 分类 ----------------------------------- */
const catDialog = reactive({ visible: false, mode: 'create' as 'create' | 'edit', id: 0, parentId: 0, name: '', sort: 0, status: 1 })

function openCreateCategory(parent?: AdminCategoryNode) {
  Object.assign(catDialog, { visible: true, mode: 'create', id: 0, parentId: parent?.id ?? 0, name: '', sort: 0, status: 1 })
}

function openEditCategory(node: AdminCategoryNode) {
  Object.assign(catDialog, { visible: true, mode: 'edit', id: node.id, parentId: node.parentId, name: node.name, sort: node.sort, status: node.status })
}

async function submitCategory() {
  if (!catDialog.name) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    if (catDialog.mode === 'create') {
      await adminApi.categoryApi.create({ name: catDialog.name, parentId: catDialog.parentId, sort: catDialog.sort, status: catDialog.status })
    } else {
      await adminApi.categoryApi.update(catDialog.id, { name: catDialog.name, sort: catDialog.sort, status: catDialog.status })
    }
    ElMessage.success('已保存')
    catDialog.visible = false
    await loadCategories()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeCategory(node: AdminCategoryNode) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${node.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.categoryApi.remove(node.id)
    ElMessage.success('已删除')
    await loadCategories()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* --------------------------------- 品牌 ----------------------------------- */
const brandDialog = reactive({ visible: false, mode: 'create' as 'create' | 'edit', id: 0, name: '', sort: 0, status: 1 })

function openCreateBrand() {
  Object.assign(brandDialog, { visible: true, mode: 'create', id: 0, name: '', sort: 0, status: 1 })
}

function openEditBrand(row: AdminBrand) {
  Object.assign(brandDialog, { visible: true, mode: 'edit', id: row.id, name: row.name, sort: row.sort, status: row.status })
}

async function submitBrand() {
  if (!brandDialog.name) {
    ElMessage.warning('请输入品牌名称')
    return
  }
  try {
    if (brandDialog.mode === 'create') {
      await adminApi.brandApi.create({ name: brandDialog.name, sort: brandDialog.sort, status: brandDialog.status })
    } else {
      await adminApi.brandApi.update(brandDialog.id, { name: brandDialog.name, sort: brandDialog.sort, status: brandDialog.status })
    }
    ElMessage.success('已保存')
    brandDialog.visible = false
    await loadBrands()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeBrand(row: AdminBrand) {
  try {
    await ElMessageBox.confirm(`确定删除品牌「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.brandApi.remove(row.id)
    ElMessage.success('已删除')
    await loadBrands()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* ------------------------------- 规格模板 --------------------------------- */
const specDialog = reactive({ visible: false, mode: 'create' as 'create' | 'edit', id: 0, name: '', valuesText: '' })

function openCreateSpec() {
  Object.assign(specDialog, { visible: true, mode: 'create', id: 0, name: '', valuesText: '' })
}

function openEditSpec(row: SpecGroupItem) {
  Object.assign(specDialog, { visible: true, mode: 'edit', id: row.id, name: row.name, valuesText: row.values.join(',') })
}

async function submitSpec() {
  if (!specDialog.name) {
    ElMessage.warning('请输入规格组名')
    return
  }
  const values = specDialog.valuesText
    .split(/[,，\s]+/)
    .map((v) => v.trim())
    .filter(Boolean)
  try {
    if (specDialog.mode === 'create') {
      await adminApi.specApi.create({ name: specDialog.name, values })
    } else {
      await adminApi.specApi.update(specDialog.id, { name: specDialog.name, values })
    }
    ElMessage.success('已保存')
    specDialog.visible = false
    await loadSpecGroups()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeSpec(row: SpecGroupItem) {
  try {
    await ElMessageBox.confirm(`确定删除规格组「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.specApi.remove(row.id)
    ElMessage.success('已删除')
    await loadSpecGroups()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* --------------------------------- 加载 ----------------------------------- */
async function loadCategories() {
  categories.value = await adminApi.categoryApi.tree()
}
async function loadBrands() {
  brands.value = await adminApi.brandApi.list()
}
async function loadSpecGroups() {
  specGroups.value = await adminApi.specApi.groups()
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadCategories(), loadBrands(), loadSpecGroups()])
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <el-card shadow="never">
      <el-tabs v-model="tab">
        <el-tab-pane label="商品分类" name="category">
          <div class="pane-head">
            <el-button v-if="canEdit" type="primary" @click="openCreateCategory()">新增一级分类</el-button>
          </div>
          <el-tree
            :data="categories"
            node-key="id"
            default-expand-all
            :props="{ label: 'name', children: 'children' }"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <span>{{ data.name }}</span>
                <el-tag v-if="data.status !== 1" type="info" size="small">停用</el-tag>
                <span class="tree-node__actions" v-if="canEdit">
                  <el-button link type="primary" @click.stop="openCreateCategory(data)">添加子类</el-button>
                  <el-button link type="primary" @click.stop="openEditCategory(data)">编辑</el-button>
                  <el-button link type="danger" @click.stop="removeCategory(data)">删除</el-button>
                </span>
              </div>
            </template>
          </el-tree>
        </el-tab-pane>

        <el-tab-pane label="品牌" name="brand">
          <div class="pane-head">
            <el-button v-if="canEdit" type="primary" @click="openCreateBrand">新增品牌</el-button>
          </div>
          <el-table :data="brands" stripe>
            <el-table-column label="ID" prop="id" width="80" />
            <el-table-column label="品牌名" prop="name" />
            <el-table-column label="排序" prop="sort" width="90" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="canEdit" label="操作" width="150">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEditBrand(row)">编辑</el-button>
                <el-button link type="danger" @click="removeBrand(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="规格模板" name="spec">
          <div class="pane-head">
            <el-button v-if="canEdit" type="primary" @click="openCreateSpec">新增规格组</el-button>
          </div>
          <el-table :data="specGroups" stripe>
            <el-table-column label="ID" prop="id" width="80" />
            <el-table-column label="规格组名" prop="name" width="160" />
            <el-table-column label="规格值">
              <template #default="{ row }">
                <el-tag v-for="v in row.values" :key="v" class="spec-tag">{{ v }}</el-tag>
                <span v-if="!row.values.length" class="muted">暂无</span>
              </template>
            </el-table-column>
            <el-table-column v-if="canEdit" label="操作" width="150">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEditSpec(row)">编辑</el-button>
                <el-button link type="danger" @click="removeSpec(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="catDialog.visible" :title="catDialog.mode === 'create' ? '新增分类' : '编辑分类'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="分类名"><el-input v-model="catDialog.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="catDialog.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="catDialog.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitCategory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="brandDialog.visible" :title="brandDialog.mode === 'create' ? '新增品牌' : '编辑品牌'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="品牌名"><el-input v-model="brandDialog.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="brandDialog.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="brandDialog.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="brandDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBrand">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="specDialog.visible" :title="specDialog.mode === 'create' ? '新增规格组' : '编辑规格组'" width="460px">
      <el-form label-width="90px">
        <el-form-item label="规格组名"><el-input v-model="specDialog.name" placeholder="如 颜色 / 尺码" /></el-form-item>
        <el-form-item label="规格值">
          <el-input v-model="specDialog.valuesText" type="textarea" :rows="3" placeholder="多个值用逗号分隔，如：白色 黑色,蓝色" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="specDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitSpec">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pane-head {
  margin-bottom: 12px;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding-right: 12px;
}
.tree-node__actions {
  margin-left: auto;
}
.spec-tag {
  margin-right: 6px;
}
.muted {
  color: #9aa3af;
  font-size: 13px;
}
</style>
