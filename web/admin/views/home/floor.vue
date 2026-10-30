<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminCategoryNode, AdminHomeFloor, AdminProduct } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const floors = ref<AdminHomeFloor[]>([])
const categories = ref<AdminCategoryNode[]>([])
const products = ref<AdminProduct[]>([])
const newProductId = ref<number | undefined>(undefined)

const dialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  title: '',
  subtitle: '',
  categoryId: undefined as number | undefined,
  sort: 0,
  status: 1,
  productIds: [] as number[],
})

const topCategories = computed(() => categories.value.filter((c) => c.level === 1))
const selectableProducts = computed(() =>
  products.value.filter((p) => !dialog.productIds.includes(p.id)),
)

function productOf(id: number): AdminProduct | undefined {
  return products.value.find((p) => p.id === id)
}

function categoryName(id: number | null): string {
  if (!id) return '全部商品'
  return topCategories.value.find((c) => c.id === id)?.name ?? `分类 ${id}`
}

async function load() {
  loading.value = true
  try {
    const [list, tree, page] = await Promise.all([
      adminApi.homeFloorApi.list(),
      adminApi.categoryApi.tree(),
      adminApi.productApi.list({ page: 1, pageSize: 100 }),
    ])
    floors.value = list
    categories.value = tree
    products.value = page.list
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
    title: '',
    subtitle: '',
    categoryId: undefined,
    sort: floors.value.length ? floors.value[floors.value.length - 1].sort + 10 : 0,
    status: 1,
    productIds: [],
  })
  newProductId.value = undefined
}

function openEdit(row: AdminHomeFloor) {
  Object.assign(dialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    categoryId: row.categoryId ?? undefined,
    sort: row.sort,
    status: row.status,
    productIds: row.products.map((p) => p.id),
  })
  newProductId.value = undefined
}

function addProduct(id?: number) {
  if (!id) return
  if (!dialog.productIds.includes(id)) dialog.productIds.push(id)
  newProductId.value = undefined
}

function removeProduct(index: number) {
  dialog.productIds.splice(index, 1)
}

function moveProduct(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= dialog.productIds.length) return
  const list = dialog.productIds
  ;[list[index], list[target]] = [list[target], list[index]]
}

async function submit() {
  if (!dialog.title.trim()) {
    ElMessage.warning('请填写楼层标题')
    return
  }
  if (!dialog.productIds.length) {
    ElMessage.warning('请至少选择一个楼层商品')
    return
  }
  const payload = {
    title: dialog.title.trim(),
    subtitle: dialog.subtitle.trim() || undefined,
    categoryId: dialog.categoryId ?? null,
    sort: dialog.sort,
    status: dialog.status,
    productIds: dialog.productIds,
  }
  try {
    if (dialog.mode === 'create') await adminApi.homeFloorApi.create(payload)
    else await adminApi.homeFloorApi.update(dialog.id, payload)
    ElMessage.success('已保存')
    dialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function remove(row: AdminHomeFloor) {
  try {
    await ElMessageBox.confirm(`确定删除楼层「${row.title}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.homeFloorApi.remove(row.id)
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
      <div class="toolbar__row">
        <span class="hint">楼层配置后，用户端首页将按此顺序展示；未配置时回退为「按一级分类自动生成」</span>
        <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreate">
          新增楼层
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="floors" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="楼层标题" prop="title" min-width="140" />
        <el-table-column label="副标题" prop="subtitle" min-width="180" />
        <el-table-column label="入口分类" width="120">
          <template #default="{ row }">{{ categoryName(row.categoryId) }}</template>
        </el-table-column>
        <el-table-column label="商品数" width="90">
          <template #default="{ row }">{{ row.products.length }}</template>
        </el-table-column>
        <el-table-column label="排序" prop="sort" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '展示' : '隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.mode === 'create' ? '新增首页楼层' : '编辑首页楼层'"
      width="760px"
    >
      <el-form label-width="90px">
        <el-form-item label="楼层标题">
          <el-input v-model="dialog.title" maxlength="50" placeholder="如 数码焕新" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="dialog.subtitle" maxlength="100" placeholder="如 精选好物 品质保障" />
        </el-form-item>
        <el-form-item label="入口分类">
          <el-select v-model="dialog.categoryId" clearable placeholder="不选则跳转全部商品" style="width: 260px">
            <el-option v-for="c in topCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dialog.sort" :min="0" />
          <span class="hint">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="dialog.status" :active-value="1" :inactive-value="0" active-text="展示" inactive-text="隐藏" />
        </el-form-item>
        <el-form-item label="楼层商品">
          <div class="picker">
            <el-select
              v-model="newProductId"
              filterable
              clearable
              placeholder="搜索并选择商品"
              style="width: 320px"
              @change="addProduct"
            >
              <el-option v-for="p in selectableProducts" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <span class="hint">已选 {{ dialog.productIds.length }} 个（最多 20 个）</span>
          </div>
        </el-form-item>
        <el-form-item label="商品顺序">
          <div v-if="!dialog.productIds.length" class="hint">尚未选择商品</div>
          <ul v-else class="selected-list">
            <li v-for="(id, index) in dialog.productIds" :key="id" class="selected-item">
              <img :src="productOf(id)?.mainImage" alt="" />
              <span class="selected-item__name">{{ productOf(id)?.name ?? `商品 ${id}` }}</span>
              <el-button link :disabled="index === 0" @click="moveProduct(index, -1)">上移</el-button>
              <el-button
                link
                :disabled="index === dialog.productIds.length - 1"
                @click="moveProduct(index, 1)"
              >
                下移
              </el-button>
              <el-button link type="danger" @click="removeProduct(index)">移除</el-button>
            </li>
          </ul>
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
.toolbar__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.hint {
  margin-left: 8px;
  font-size: 12px;
  color: #9aa3af;
}
.picker {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.selected-list {
  width: 100%;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.selected-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.selected-item img {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  object-fit: cover;
  background: #f6f7f9;
}
.selected-item__name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
