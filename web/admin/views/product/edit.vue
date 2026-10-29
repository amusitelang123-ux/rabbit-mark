<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminBrand, AdminCategoryNode, AdminSku, SpecGroupItem } from '@admin/api'

const route = useRoute()
const router = useRouter()

const productId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : 0
})
const isEdit = computed(() => productId.value > 0)

const categories = ref<AdminCategoryNode[]>([])
const brands = ref<AdminBrand[]>([])
const templateGroups = ref<SpecGroupItem[]>([])

const form = reactive({
  name: '',
  subtitle: '',
  categoryId: undefined as number | undefined,
  brandId: undefined as number | undefined,
  mainImage: '',
  detailHtml: '',
  unit: '件',
  weight: 0,
  isRecommend: false,
  sort: 0,
  status: 0,
  images: [] as string[],
  attributes: [] as { name: string; value: string }[],
})

const saving = ref(false)
const skus = ref<AdminSku[]>([])
const skuSaving = ref<number | null>(null)

interface SpecGroupDraft {
  name: string
  values: string[]
  /** 规格值输入框的草稿值，必须走 v-model：el-input 的输入事件会把 DOM 值同步回 modelValue，缺 v-model 时每次输入都会被重置为空 */
  input: string
}

const specGroups = ref<SpecGroupDraft[]>([])
const generating = ref(false)
/** 规格组是否已用已有 SKU 回填过（保存商品会重置详情，不能把正在编辑的规格组冲掉） */
let specGroupsRestored = false

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

async function onUpload(file: File, target: 'main' | 'gallery') {
  try {
    const res = await adminApi.uploadApi.image(file)
    if (target === 'main') form.mainImage = res.url
    else form.images.push(res.url)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '上传失败')
  }
  return false
}

function addAttribute() {
  form.attributes.push({ name: '', value: '' })
}

function removeAttribute(index: number) {
  form.attributes.splice(index, 1)
}

function applyTemplate(group: SpecGroupItem) {
  if (specGroups.value.some((g) => g.name === group.name)) {
    ElMessage.info('该规格组已添加')
    return
  }
  specGroups.value.push({ name: group.name, values: [...group.values], input: '' })
}

function addSpecGroup() {
  specGroups.value.push({ name: '', values: [], input: '' })
}

/** 回车提交输入框里的规格值 */
function commitSpecValue(group: SpecGroupDraft, event?: Event) {
  // 中文输入法选词时的回车（isComposing / keyCode 229）不提交，避免把拼音当成规格值
  const e = event as KeyboardEvent | undefined
  if (e?.isComposing || e?.keyCode === 229) return

  const value = group.input.trim()
  if (!value) {
    group.input = ''
    return
  }
  if (group.values.includes(value)) {
    ElMessage.info(`规格值「${value}」已存在`)
  } else {
    group.values.push(value)
  }
  group.input = ''
}

function removeSpecValue(group: { values: string[] }, index: number) {
  group.values.splice(index, 1)
}

/** 从已有 SKU 的规格组合还原规格组，打开编辑页时可直接在原有规格上增删 */
function specGroupsFromSkus(rows: AdminSku[]): SpecGroupDraft[] {
  const names: string[] = []
  const values = new Map<string, string[]>()

  for (const row of rows) {
    for (const [name, raw] of Object.entries(row.spec ?? {})) {
      const value = String(raw ?? '').trim()
      if (!name || !value) continue
      let list = values.get(name)
      if (!list) {
        list = []
        values.set(name, list)
        names.push(name)
      }
      if (!list.includes(value)) list.push(value)
    }
  }

  // MySQL 的 JSON 列会重排对象键，这里用 specText 中规格值首次出现的位置还原规格组顺序
  const sampleText = rows.find((r) => r.specText)?.specText ?? ''
  const ordered = names.map((name) => ({
    name,
    pos: sampleText ? sampleText.indexOf(values.get(name)![0]) : -1,
  }))
  if (ordered.every((item) => item.pos >= 0)) ordered.sort((a, b) => a.pos - b.pos)

  return ordered.map(({ name }) => ({ name, values: values.get(name)!, input: '' }))
}

async function loadDetail() {
  const p = await adminApi.productApi.detail(productId.value)
  Object.assign(form, {
    name: p.name,
    subtitle: p.subtitle,
    categoryId: p.categoryId,
    brandId: p.brandId ?? undefined,
    mainImage: p.mainImage,
    detailHtml: p.detailHtml,
    unit: p.unit,
    weight: p.weight,
    isRecommend: p.isRecommend,
    sort: p.sort,
    status: p.status,
    images: [...p.images],
    attributes: p.attributes.map((a) => ({ name: a.name, value: a.value })),
  })
  skus.value = p.skus
  if (!specGroupsRestored) {
    specGroups.value = specGroupsFromSkus(p.skus)
    specGroupsRestored = true
  }
}

async function save() {
  if (!form.name || !form.categoryId) {
    ElMessage.warning('请填写商品名称与分类')
    return
  }
  saving.value = true
  const payload = {
    name: form.name,
    subtitle: form.subtitle,
    categoryId: form.categoryId,
    brandId: form.brandId ?? null,
    mainImage: form.mainImage,
    detailHtml: form.detailHtml,
    unit: form.unit,
    weight: Number(form.weight) || 0,
    isRecommend: form.isRecommend,
    sort: Number(form.sort) || 0,
    status: form.status,
    images: form.images,
    attributes: form.attributes.filter((a) => a.name && a.value),
  }
  try {
    if (isEdit.value) {
      await adminApi.productApi.update(productId.value, payload)
      ElMessage.success('商品已更新')
      await loadDetail()
    } else {
      const created = await adminApi.productApi.create(payload)
      ElMessage.success('商品已创建，请继续配置 SKU')
      router.replace(`/admin/products/${created.id}/edit`)
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function generate() {
  // 只提交真正填写过的规格组；名字/规格值缺失时明确提示，避免静默忽略后生成空 SKU
  const groups = specGroups.value
    .map((g) => ({ name: g.name.trim(), values: [...g.values] }))
    .filter((g) => g.name || g.values.length)
  if (!groups.length) {
    ElMessage.warning('请先添加规格组与规格值')
    return
  }
  const missingName = groups.find((g) => !g.name)
  if (missingName) {
    ElMessage.warning('请填写规格组名称')
    return
  }
  const missingValue = groups.find((g) => !g.values.length)
  if (missingValue) {
    ElMessage.warning(`规格组「${missingValue.name}」还没有规格值`)
    return
  }
  if (new Set(groups.map((g) => g.name)).size !== groups.length) {
    ElMessage.warning('规格组名称不能重复')
    return
  }
  generating.value = true
  try {
    skus.value = await adminApi.productApi.generateSkus(productId.value, { groups })
    ElMessage.success('SKU 已生成')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}

async function saveSku(row: AdminSku) {
  skuSaving.value = row.id
  try {
    await adminApi.productApi.updateSku(row.id, {
      price: Number(row.price),
      marketPrice: Number(row.marketPrice),
      costPrice: Number(row.costPrice),
      stock: Number(row.stock),
      warnStock: Number(row.warnStock),
      status: row.status,
    })
    ElMessage.success('已保存')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    skuSaving.value = null
  }
}

async function removeSku(row: AdminSku) {
  try {
    await ElMessageBox.confirm(`确定删除 SKU「${row.specText}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await adminApi.productApi.removeSku(row.id)
  ElMessage.success('已删除')
  skus.value = skus.value.filter((s) => s.id !== row.id)
}

async function adjustStock(row: AdminSku) {
  try {
    const { value } = await ElMessageBox.prompt('请输入库存变更量（正数增加，负数减少）', '库存调整', {
      inputValue: '0',
      inputPattern: /^-?\d+$/,
      inputErrorMessage: '请输入整数',
    })
    await adminApi.productApi.adjustStock(row.id, { change: Number(value), remark: '后台库存调整' })
    ElMessage.success('库存已调整')
    await loadDetail()
  } catch {
    /* 取消或失败 */
  }
}

onMounted(async () => {
  try {
    const [cats, bs, groups] = await Promise.all([
      adminApi.categoryApi.tree(),
      adminApi.brandApi.list(),
      adminApi.specApi.groups(),
    ])
    categories.value = cats
    brands.value = bs
    templateGroups.value = groups
  } catch {
    /* 基础数据加载失败不阻塞表单 */
  }
  if (isEdit.value) await loadDetail()
})
</script>

<template>
  <div>
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block__head">
          <span>{{ isEdit ? '编辑商品' : '新增商品' }}</span>
          <div>
            <el-button @click="router.push('/admin/products')">返回列表</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存商品</el-button>
          </div>
        </div>
      </template>

      <el-form :model="form" label-width="96px">
        <el-row :gutter="18">
          <el-col :md="12">
            <el-form-item label="商品名称" required>
              <el-input v-model="form.name" maxlength="200" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          <el-col :md="12">
            <el-form-item label="卖点副标题">
              <el-input v-model="form.subtitle" maxlength="255" placeholder="一句话卖点" />
            </el-form-item>
          </el-col>
          <el-col :md="8">
            <el-form-item label="所属分类" required>
              <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
                <el-option v-for="c in flatCategories" :key="c.id" :label="c.label" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :md="8">
            <el-form-item label="品牌">
              <el-select v-model="form.brandId" placeholder="请选择品牌" clearable style="width: 100%">
                <el-option v-for="b in brands" :key="b.id" :label="b.name" :value="b.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :md="4">
            <el-form-item label="单位">
              <el-input v-model="form.unit" />
            </el-form-item>
          </el-col>
          <el-col :md="4">
            <el-form-item label="重量kg">
              <el-input-number v-model="form.weight" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>

          <el-col :md="8">
            <el-form-item label="主图">
              <el-upload :show-file-list="false" :before-upload="(f: File) => onUpload(f, 'main')" accept="image/*">
                <img v-if="form.mainImage" :src="form.mainImage" class="upload-main" alt="" />
                <el-button v-else>上传主图</el-button>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :md="16">
            <el-form-item label="图集">
              <div class="gallery">
                <div v-for="(img, i) in form.images" :key="i" class="gallery__item">
                  <img :src="img" alt="" />
                  <span class="gallery__del" @click="form.images.splice(i, 1)">✕</span>
                </div>
                <el-upload :show-file-list="false" :before-upload="(f: File) => onUpload(f, 'gallery')" accept="image/*">
                  <el-button>+ 添加</el-button>
                </el-upload>
              </div>
            </el-form-item>
          </el-col>

          <el-col :md="12">
            <el-form-item label="推荐位">
              <el-switch v-model="form.isRecommend" />
              <span class="form-hint">开启后展示在首页推荐</span>
            </el-form-item>
          </el-col>
          <el-col :md="6">
            <el-form-item label="排序">
              <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :md="6">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="商品参数">
              <div class="attr-list">
                <div v-for="(a, i) in form.attributes" :key="i" class="attr-row">
                  <el-input v-model="a.name" placeholder="参数名，如 产地" style="width: 200px" />
                  <el-input v-model="a.value" placeholder="参数值" style="width: 260px" />
                  <el-button link type="danger" @click="removeAttribute(i)">删除</el-button>
                </div>
                <el-button link type="primary" @click="addAttribute">+ 添加参数</el-button>
              </div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="图文详情">
              <el-input v-model="form.detailHtml" type="textarea" :rows="6" placeholder="支持 HTML 富文本" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card v-if="isEdit" shadow="never" class="block">
      <template #header><span>SKU 与库存</span></template>

      <div class="spec-toolbar">
        <span class="spec-toolbar__label">从规格模板添加：</span>
        <el-tag
          v-for="g in templateGroups"
          :key="g.id"
          class="spec-toolbar__tag"
          @click="applyTemplate(g)"
        >
          {{ g.name }}
        </el-tag>
        <el-button link type="primary" @click="addSpecGroup">+ 自定义规格组</el-button>
      </div>

      <div v-for="(g, gi) in specGroups" :key="gi" class="spec-group">
        <el-input v-model="g.name" placeholder="规格组名，如 颜色" style="width: 160px" />
        <div class="spec-values">
          <el-tag v-for="(v, vi) in g.values" :key="vi" closable @close="removeSpecValue(g, vi)">{{ v }}</el-tag>
          <el-input
            v-model="g.input"
            placeholder="输入后回车添加"
            style="width: 150px"
            @keydown.enter="commitSpecValue(g, $event)"
          />
        </div>
        <el-button link type="danger" @click="specGroups.splice(gi, 1)">移除</el-button>
      </div>

      <el-button type="primary" :loading="generating" @click="generate">批量生成 SKU</el-button>

      <el-table :data="skus" stripe class="sku-table">
        <el-table-column label="编码" prop="skuCode" width="130" />
        <el-table-column label="规格" prop="specText" min-width="150" />
        <el-table-column label="售价" width="140">
          <template #default="{ row }"><el-input-number v-model="row.price" :min="0" :precision="2" size="small" /></template>
        </el-table-column>
        <el-table-column label="划线价" width="140">
          <template #default="{ row }"><el-input-number v-model="row.marketPrice" :min="0" :precision="2" size="small" /></template>
        </el-table-column>
        <el-table-column label="库存" width="130">
          <template #default="{ row }"><el-input-number v-model="row.stock" :min="0" size="small" /></template>
        </el-table-column>
        <el-table-column label="预警" width="120">
          <template #default="{ row }"><el-input-number v-model="row.warnStock" :min="0" size="small" /></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :loading="skuSaving === row.id" @click="saveSku(row)">保存</el-button>
            <el-button link type="primary" @click="adjustStock(row)">调库存</el-button>
            <el-button link type="danger" @click="removeSku(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.block {
  margin-bottom: 16px;
}
.block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.form-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #9aa3af;
}
.upload-main {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e6e8eb;
}
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.gallery__item {
  position: relative;
  width: 72px;
  height: 72px;
}
.gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e6e8eb;
}
.gallery__del {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.attr-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.attr-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.spec-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.spec-toolbar__label {
  font-size: 13px;
  color: #8a93a0;
}
.spec-toolbar__tag {
  cursor: pointer;
}
.spec-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.spec-values {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}
.sku-table {
  margin-top: 16px;
}
</style>
