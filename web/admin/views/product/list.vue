<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminCategoryNode, AdminProduct } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const router = useRouter()
const admin = useAdminStore()

const loading = ref(false)
const list = ref<AdminProduct[]>([])
const total = ref(0)
const categories = ref<AdminCategoryNode[]>([])

const query = reactive<{
  keyword: string
  categoryId: number | undefined
  status: number | undefined
  page: number
  pageSize: number
}>({ keyword: '', categoryId: undefined, status: undefined, page: 1, pageSize: 10 })

const flatCategories = computed(() => {
  const out: { id: number; label: string }[] = []
  const walk = (nodes: AdminCategoryNode[], depth = 0) => {
    nodes.forEach((n) => {
      out.push({ id: n.id, label: `${'— '.repeat(depth)}${n.name}` })
      if (n.children.length) walk(n.children, depth + 1)
    })
  }
  walk(categories.value)
  return out
})

async function load() {
  loading.value = true
  try {
    const res = await adminApi.productApi.list({ ...query })
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
  query.categoryId = undefined
  query.status = undefined
  search()
}

async function toggleStatus(row: AdminProduct) {
  const next = row.status === 1 ? 0 : 1
  try {
    await adminApi.productApi.setStatus(row.id, next as 0 | 1)
    ElMessage.success(next === 1 ? '已上架' : '已下架')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function remove(row: AdminProduct) {
  try {
    await ElMessageBox.confirm(`确定删除商品「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.productApi.remove(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* -------------------------------- 批量操作 -------------------------------- */
const selectedIds = ref<number[]>([])

function onSelectionChange(rows: AdminProduct[]) {
  selectedIds.value = rows.map((r) => r.id)
}

async function batchSetStatus(status: 0 | 1) {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择商品')
    return
  }
  try {
    const res = await adminApi.productApi.batchStatus(selectedIds.value, status)
    ElMessage.success(`${status === 1 ? '上架' : '下架'}成功 ${res.affected} 个商品`)
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function batchRemove() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择商品')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个商品吗？`, '提示', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    const res = await adminApi.productApi.batchRemove(selectedIds.value)
    ElMessage.success(`已删除 ${res.deleted} 个商品`)
    if (res.failed.length) {
      ElMessageBox.alert(
        res.failed.map((f) => `商品 ID ${f.id}：${f.reason}`).join('\n'),
        '部分商品删除失败',
        { type: 'warning' },
      )
    }
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* ------------------------------ 导入 / 导出 ------------------------------- */
const importInput = ref<HTMLInputElement | null>(null)

async function exportProducts() {
  try {
    await adminApi.productApi.exportCsv({
      keyword: query.keyword || undefined,
      categoryId: query.categoryId,
      status: query.status,
    })
    ElMessage.success('导出已开始')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '导出失败')
  }
}

async function downloadTemplate() {
  try {
    await adminApi.productApi.downloadImportTemplate()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '下载模板失败')
  }
}

function pickImportFile() {
  importInput.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const res = await adminApi.productApi.importCsv(text)
    ElMessage.success(`导入完成：新增 ${res.created}，更新 ${res.updated}，失败 ${res.failed.length}`)
    if (res.failed.length) {
      ElMessageBox.alert(
        res.failed.map((f) => `第 ${f.row} 行：${f.reason}`).join('\n'),
        '部分行导入失败',
        { type: 'warning' },
      )
    }
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    input.value = ''
  }
}

onMounted(async () => {
  try {
    categories.value = await adminApi.categoryApi.tree()
  } catch {
    /* 分类加载失败不阻塞列表 */
  }
  load()
})
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="商品名称">
          <el-input v-model="query.keyword" placeholder="按名称搜索" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.categoryId" placeholder="全部分类" clearable style="width: 180px">
            <el-option v-for="c in flatCategories" :key="c.id" :label="c.label" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar__actions">
        <el-button v-if="admin.hasPerm('product:update')" :disabled="!selectedIds.length" @click="batchSetStatus(1)">
          批量上架
        </el-button>
        <el-button v-if="admin.hasPerm('product:update')" :disabled="!selectedIds.length" @click="batchSetStatus(0)">
          批量下架
        </el-button>
        <el-button
          v-if="admin.hasPerm('product:delete')"
          type="danger"
          plain
          :disabled="!selectedIds.length"
          @click="batchRemove"
        >
          批量删除
        </el-button>
        <el-button v-if="admin.hasPerm('product:view')" @click="exportProducts">导出 CSV</el-button>
        <el-button v-if="admin.hasPerm('product:create')" @click="downloadTemplate">下载导入模板</el-button>
        <el-button v-if="admin.hasPerm('product:create')" @click="pickImportFile">批量导入</el-button>
        <el-button v-if="admin.hasPerm('product:create')" type="primary" @click="router.push('/admin/products/new')">
          新增商品
        </el-button>
        <input ref="importInput" type="file" accept=".csv,text/csv" class="hidden-input" @change="onImportFile" />
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="46" />
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="商品" min-width="240">
          <template #default="{ row }">
            <div class="product-cell">
              <img :src="row.mainImage" alt="" class="product-cell__img" />
              <div>
                <p class="product-cell__name">{{ row.name }}</p>
                <p class="product-cell__sub">{{ row.subtitle }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="categoryName" width="120" />
        <el-table-column label="价格" width="130">
          <template #default="{ row }">¥{{ row.priceMin }} ~ ¥{{ row.priceMax }}</template>
        </el-table-column>
        <el-table-column label="库存" prop="totalStock" width="90" />
        <el-table-column label="销量" prop="salesCount" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '上架' : '下架' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button v-if="admin.hasPerm('product:update')" link type="primary" @click="router.push(`/admin/products/${row.id}/edit`)">
              编辑
            </el-button>
            <el-button v-if="admin.hasPerm('product:update')" link type="primary" @click="toggleStatus(row)">
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button v-if="admin.hasPerm('product:delete')" link type="danger" @click="remove(row)">删除</el-button>
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
.toolbar :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.product-cell__img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  background: #f0f2f5;
  flex-shrink: 0;
}
.product-cell__name {
  font-size: 14px;
  color: #1f2733;
  margin-bottom: 2px;
}
.product-cell__sub {
  font-size: 12px;
  color: #9aa3af;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
}
.hidden-input {
  display: none;
}
</style>
