<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminBanner, AdminCategoryNode, AdminCoupon, AdminFaq, AdminNotice, AdminProduct, AdminPromotion, AdminSeckill } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()
const tab = ref('coupon')
const loading = ref(false)

const coupons = ref<AdminCoupon[]>([])
const banners = ref<AdminBanner[]>([])
const notices = ref<AdminNotice[]>([])
const couponTotal = ref(0)
const couponPage = ref(1)
const couponPageSize = 10
const topCategories = ref<AdminCategoryNode[]>([])

/* --------------------------------- 优惠券 --------------------------------- */
const couponDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  type: 1,
  amount: 10,
  discountRate: 0.9,
  minAmount: 99,
  totalCount: 1000,
  perUserLimit: 1,
  validType: 1,
  validStart: '',
  validEnd: '',
  validDays: 30,
  scope: 1,
  scopeIds: [] as number[],
  status: 1,
})

async function loadTopCategories() {
  try {
    const tree = await adminApi.categoryApi.tree()
    topCategories.value = tree.filter((c) => c.level === 1)
  } catch {
    topCategories.value = []
  }
}

async function loadCoupons() {
  loading.value = true
  try {
    const res = await adminApi.marketingApi.coupons({ page: couponPage.value, pageSize: couponPageSize })
    coupons.value = res.list
    couponTotal.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateCoupon() {
  Object.assign(couponDialog, {
    visible: true,
    mode: 'create',
    id: 0,
    name: '',
    type: 1,
    amount: 10,
    discountRate: 0.9,
    minAmount: 99,
    totalCount: 1000,
    perUserLimit: 1,
    validType: 1,
    validStart: '',
    validEnd: '',
    validDays: 30,
    scope: 1,
    scopeIds: [],
    status: 1,
  })
}

function openEditCoupon(row: AdminCoupon) {
  Object.assign(couponDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    discountRate: row.discountRate,
    minAmount: row.minAmount,
    totalCount: row.totalCount,
    perUserLimit: row.perUserLimit,
    validType: row.validType,
    validStart: row.validStart,
    validEnd: row.validEnd,
    validDays: row.validDays ?? 30,
    scope: row.scope,
    scopeIds: row.scopeIds ?? [],
    status: row.status,
  })
}

async function submitCoupon() {
  if (!couponDialog.name) {
    ElMessage.warning('请输入券名称')
    return
  }
  const payload = {
    name: couponDialog.name,
    type: couponDialog.type,
    amount: couponDialog.amount,
    discountRate: couponDialog.discountRate,
    minAmount: couponDialog.minAmount,
    totalCount: couponDialog.totalCount,
    perUserLimit: couponDialog.perUserLimit,
    validType: couponDialog.validType,
    validStart: couponDialog.validStart || undefined,
    validEnd: couponDialog.validEnd || undefined,
    validDays: couponDialog.validDays,
    scope: couponDialog.scope,
    scopeIds: couponDialog.scope === 1 ? [] : couponDialog.scopeIds,
    status: couponDialog.status,
  }
  try {
    if (couponDialog.mode === 'create') await adminApi.marketingApi.createCoupon(payload)
    else await adminApi.marketingApi.updateCoupon(couponDialog.id, payload)
    ElMessage.success('已保存')
    couponDialog.visible = false
    loadCoupons()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeCoupon(row: AdminCoupon) {
  try {
    await ElMessageBox.confirm(`确定删除优惠券「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.marketingApi.removeCoupon(row.id)
    ElMessage.success('已删除')
    loadCoupons()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* --------------------------------- 运营位 --------------------------------- */
const bannerDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  title: '',
  subtitle: '',
  image: '',
  link: '',
  bg: '',
  position: 'home_top',
  sort: 0,
  status: 1,
})

async function loadBanners() {
  try {
    banners.value = await adminApi.marketingApi.banners()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

function openCreateBanner() {
  Object.assign(bannerDialog, {
    visible: true,
    mode: 'create',
    id: 0,
    title: '',
    subtitle: '',
    image: '',
    link: '',
    bg: '',
    position: 'home_top',
    sort: 0,
    status: 1,
  })
}

function openEditBanner(row: AdminBanner) {
  Object.assign(bannerDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: row.image,
    link: row.link,
    bg: row.bg,
    position: row.position,
    sort: row.sort,
    status: row.status,
  })
}

async function onBannerUpload(file: File) {
  try {
    const res = await adminApi.uploadApi.image(file)
    bannerDialog.image = res.url
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '上传失败')
  }
  return false
}

async function submitBanner() {
  if (!bannerDialog.title || !bannerDialog.image) {
    ElMessage.warning('请填写标题并上传图片')
    return
  }
  const payload = {
    title: bannerDialog.title,
    subtitle: bannerDialog.subtitle,
    image: bannerDialog.image,
    link: bannerDialog.link,
    bg: bannerDialog.bg,
    position: bannerDialog.position,
    sort: bannerDialog.sort,
    status: bannerDialog.status,
  }
  try {
    if (bannerDialog.mode === 'create') await adminApi.marketingApi.createBanner(payload)
    else await adminApi.marketingApi.updateBanner(bannerDialog.id, payload)
    ElMessage.success('已保存')
    bannerDialog.visible = false
    loadBanners()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeBanner(row: AdminBanner) {
  try {
    await ElMessageBox.confirm(`确定删除运营位「${row.title}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.marketingApi.removeBanner(row.id)
    ElMessage.success('已删除')
    loadBanners()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* --------------------------------- 公告 ----------------------------------- */
const noticeDialog = reactive({ visible: false, mode: 'create' as 'create' | 'edit', id: 0, title: '', content: '', type: 1, status: 1 })

async function loadNotices() {
  try {
    notices.value = await adminApi.marketingApi.notices()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

function openCreateNotice() {
  Object.assign(noticeDialog, { visible: true, mode: 'create', id: 0, title: '', content: '', type: 1, status: 1 })
}

function openEditNotice(row: AdminNotice) {
  Object.assign(noticeDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    status: row.status,
  })
}

async function submitNotice() {
  if (!noticeDialog.title) {
    ElMessage.warning('请输入公告标题')
    return
  }
  const payload = { title: noticeDialog.title, content: noticeDialog.content, type: noticeDialog.type, status: noticeDialog.status }
  try {
    if (noticeDialog.mode === 'create') await adminApi.marketingApi.createNotice(payload)
    else await adminApi.marketingApi.updateNotice(noticeDialog.id, payload)
    ElMessage.success('已保存')
    noticeDialog.visible = false
    loadNotices()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeNotice(row: AdminNotice) {
  try {
    await ElMessageBox.confirm(`确定删除公告「${row.title}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.marketingApi.removeNotice(row.id)
    ElMessage.success('已删除')
    loadNotices()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* --------------------------------- 秒杀 ----------------------------------- */
const seckills = ref<AdminSeckill[]>([])
const productOptions = ref<AdminProduct[]>([])

interface SeckillRow {
  productId: number | undefined
  skuId: number | undefined
  seckillPrice: number
  seckillStock: number
  limitPerUser: number
}

const seckillDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  startTime: '',
  endTime: '',
  status: 0,
  rows: [] as SeckillRow[],
})

async function loadSeckills() {
  try {
    seckills.value = await adminApi.marketingApi.seckills()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

async function loadProducts() {
  try {
    const res = await adminApi.productApi.list({ pageSize: 100 })
    productOptions.value = res.list
  } catch {
    /* 商品列表加载失败不阻塞 */
  }
}

function skusOf(productId?: number) {
  return productOptions.value.find((p) => p.id === productId)?.skus ?? []
}

function openCreateSeckill() {
  Object.assign(seckillDialog, {
    visible: true,
    mode: 'create',
    id: 0,
    name: '',
    startTime: '',
    endTime: '',
    status: 0,
    rows: [{ productId: undefined, skuId: undefined, seckillPrice: 0, seckillStock: 0, limitPerUser: 1 }],
  })
}

function openEditSeckill(row: AdminSeckill) {
  Object.assign(seckillDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    rows: row.products.map((p) => ({
      productId: p.productId,
      skuId: p.skuId,
      seckillPrice: p.seckillPrice,
      seckillStock: p.seckillStock,
      limitPerUser: p.limitPerUser,
    })),
  })
}

function addSeckillRow() {
  seckillDialog.rows.push({ productId: undefined, skuId: undefined, seckillPrice: 0, seckillStock: 0, limitPerUser: 1 })
}

async function submitSeckill() {
  if (!seckillDialog.name || !seckillDialog.startTime || !seckillDialog.endTime) {
    ElMessage.warning('请填写活动名称与起止时间')
    return
  }
  const products = seckillDialog.rows
    .filter((r) => r.productId && r.skuId)
    .map((r) => ({
      productId: r.productId as number,
      skuId: r.skuId as number,
      seckillPrice: r.seckillPrice,
      seckillStock: r.seckillStock,
      limitPerUser: r.limitPerUser,
    }))
  const payload = {
    name: seckillDialog.name,
    startTime: seckillDialog.startTime,
    endTime: seckillDialog.endTime,
    status: seckillDialog.status,
    products,
  }
  try {
    if (seckillDialog.mode === 'create') await adminApi.marketingApi.createSeckill(payload)
    else await adminApi.marketingApi.updateSeckill(seckillDialog.id, payload)
    ElMessage.success('已保存')
    seckillDialog.visible = false
    loadSeckills()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function toggleSeckill(row: AdminSeckill) {
  const next = row.status === 1 ? 0 : 1
  try {
    await adminApi.marketingApi.setSeckillStatus(row.id, next)
    ElMessage.success('状态已更新')
    loadSeckills()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function removeSeckill(row: AdminSeckill) {
  try {
    await ElMessageBox.confirm(`确定删除秒杀活动「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.marketingApi.removeSeckill(row.id)
    ElMessage.success('已删除')
    loadSeckills()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* -------------------------------- 满减活动 -------------------------------- */
const promotions = ref<AdminPromotion[]>([])

const promotionDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  startTime: '',
  endTime: '',
  status: 1,
  thresholds: [] as { amount: number; reduce: number }[],
})

async function loadPromotions() {
  try {
    promotions.value = await adminApi.marketingApi.promotions()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

function openCreatePromotion() {
  Object.assign(promotionDialog, {
    visible: true,
    mode: 'create',
    id: 0,
    name: '',
    startTime: '',
    endTime: '',
    status: 1,
    thresholds: [{ amount: 199, reduce: 20 }],
  })
}

function openEditPromotion(row: AdminPromotion) {
  Object.assign(promotionDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    thresholds: row.thresholds.map((t) => ({ ...t })),
  })
}

function addThreshold() {
  promotionDialog.thresholds.push({ amount: 0, reduce: 0 })
}

function thresholdText(row: AdminPromotion) {
  return row.thresholds.map((t) => `满 ${t.amount} 减 ${t.reduce}`).join(' / ') || '—'
}

async function submitPromotion() {
  if (!promotionDialog.name || !promotionDialog.startTime || !promotionDialog.endTime) {
    ElMessage.warning('请填写活动名称与起止时间')
    return
  }
  const thresholds = promotionDialog.thresholds.filter((t) => t.amount > 0 && t.reduce > 0)
  if (!thresholds.length) {
    ElMessage.warning('至少配置一个有效的满减档位')
    return
  }
  const payload = {
    name: promotionDialog.name,
    type: 1,
    thresholds,
    startTime: promotionDialog.startTime,
    endTime: promotionDialog.endTime,
    status: promotionDialog.status,
  }
  try {
    if (promotionDialog.mode === 'create') await adminApi.marketingApi.createPromotion(payload)
    else await adminApi.marketingApi.updatePromotion(promotionDialog.id, payload)
    ElMessage.success('已保存')
    promotionDialog.visible = false
    loadPromotions()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removePromotion(row: AdminPromotion) {
  try {
    await ElMessageBox.confirm(`确定删除满减活动「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.marketingApi.removePromotion(row.id)
    ElMessage.success('已删除')
    loadPromotions()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* ------------------------------ 帮助中心 FAQ ------------------------------ */
const faqs = ref<AdminFaq[]>([])

const faqDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  category: '',
  question: '',
  answer: '',
  sort: 0,
  status: 1,
})

async function loadFaqs() {
  try {
    faqs.value = await adminApi.faqApi.list()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

function openCreateFaq() {
  Object.assign(faqDialog, {
    visible: true,
    mode: 'create',
    id: 0,
    category: faqs.value[0]?.category ?? '购物指南',
    question: '',
    answer: '',
    sort: 0,
    status: 1,
  })
}

function openEditFaq(row: AdminFaq) {
  Object.assign(faqDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    sort: row.sort,
    status: row.status,
  })
}

async function submitFaq() {
  if (!faqDialog.category || !faqDialog.question) {
    ElMessage.warning('请填写分类与问题')
    return
  }
  const payload = {
    category: faqDialog.category,
    question: faqDialog.question,
    answer: faqDialog.answer,
    sort: faqDialog.sort,
    status: faqDialog.status,
  }
  try {
    if (faqDialog.mode === 'create') await adminApi.faqApi.create(payload)
    else await adminApi.faqApi.update(faqDialog.id, payload)
    ElMessage.success('已保存')
    faqDialog.visible = false
    loadFaqs()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeFaq(row: AdminFaq) {
  try {
    await ElMessageBox.confirm(`确定删除问题「${row.question}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.faqApi.remove(row.id)
    ElMessage.success('已删除')
    loadFaqs()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

onMounted(() => {
  loadCoupons()
  loadBanners()
  loadTopCategories()
  loadNotices()
  loadSeckills()
  loadProducts()
  loadPromotions()
  loadFaqs()
})
</script>

<template>
  <el-card shadow="never">
    <el-tabs v-model="tab">
      <el-tab-pane label="优惠券" name="coupon">
        <div class="pane-head">
          <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreateCoupon">新增优惠券</el-button>
        </div>
        <el-table v-loading="loading" :data="coupons" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="名称" prop="name" min-width="150" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">
              <el-tag :type="row.type === 1 ? 'warning' : 'success'">{{ row.type === 1 ? '满减' : '折扣' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="面额/折扣" width="120">
            <template #default="{ row }">{{ row.type === 1 ? `¥${row.amount}` : `${(row.discountRate * 10).toFixed(1)}折` }}</template>
          </el-table-column>
          <el-table-column label="门槛" width="100">
            <template #default="{ row }">满 {{ row.minAmount }}</template>
          </el-table-column>
          <el-table-column label="发放/领取/核销" width="150">
            <template #default="{ row }">{{ row.totalCount }} / {{ row.receivedCount }} / {{ row.usedCount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEditCoupon(row)">编辑</el-button>
              <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="removeCoupon(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pager">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :total="couponTotal"
            :current-page="couponPage"
            :page-size="couponPageSize"
            @current-change="(p: number) => { couponPage = p; loadCoupons() }"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="运营位 Banner" name="banner">
        <div class="pane-head">
          <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreateBanner">新增运营位</el-button>
        </div>
        <el-table :data="banners" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="图片" width="120">
            <template #default="{ row }"><img :src="row.image" class="thumb" alt="" /></template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="160" />
          <el-table-column label="位置" prop="position" width="120" />
          <el-table-column label="跳转" prop="link" min-width="140" />
          <el-table-column label="排序" prop="sort" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEditBanner(row)">编辑</el-button>
              <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="removeBanner(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="公告" name="notice">
        <div class="pane-head">
          <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreateNotice">新增公告</el-button>
        </div>
        <el-table :data="notices" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="标题" prop="title" min-width="180" />
          <el-table-column label="内容" prop="content" min-width="240" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '发布' : '下线' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发布时间" prop="publishAt" width="170" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEditNotice(row)">编辑</el-button>
              <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="removeNotice(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="秒杀活动" name="seckill">
        <div class="pane-head">
          <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreateSeckill">新增秒杀活动</el-button>
        </div>
        <el-table :data="seckills" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="活动名称" prop="name" min-width="160" />
          <el-table-column label="开始时间" prop="startTime" width="170" />
          <el-table-column label="结束时间" prop="endTime" width="170" />
          <el-table-column label="商品数" width="90">
            <template #default="{ row }">{{ row.products.length }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '进行中' : '未开始' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEditSeckill(row)">编辑</el-button>
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="toggleSeckill(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
              <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="removeSeckill(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="满减活动" name="promotion">
        <div class="pane-head">
          <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreatePromotion">新增满减活动</el-button>
          <span class="hint">下单时自动匹配「满足门槛中减免最大」的档位，与优惠券可叠加</span>
        </div>
        <el-table :data="promotions" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="活动名称" prop="name" min-width="150" />
          <el-table-column label="满减规则" min-width="240">
            <template #default="{ row }">{{ thresholdText(row) }}</template>
          </el-table-column>
          <el-table-column label="开始时间" prop="startTime" width="170" />
          <el-table-column label="结束时间" prop="endTime" width="170" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEditPromotion(row)">编辑</el-button>
              <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="removePromotion(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="帮助中心 FAQ" name="faq">
        <div class="pane-head">
          <el-button v-if="admin.hasPerm('marketing:create')" type="primary" @click="openCreateFaq">新增问题</el-button>
          <span class="hint">同步展示在用户端「帮助中心」页面，按分类分组折叠</span>
        </div>
        <el-table :data="faqs" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="分类" prop="category" width="130" />
          <el-table-column label="问题" prop="question" min-width="200" />
          <el-table-column label="答案" prop="answer" min-width="260" show-overflow-tooltip />
          <el-table-column label="排序" prop="sort" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="admin.hasPerm('marketing:update')" link type="primary" @click="openEditFaq(row)">编辑</el-button>
              <el-button v-if="admin.hasPerm('marketing:delete')" link type="danger" @click="removeFaq(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-card>

  <el-dialog v-model="couponDialog.visible" :title="couponDialog.mode === 'create' ? '新增优惠券' : '编辑优惠券'" width="520px">
    <el-form label-width="90px">
      <el-form-item label="名称"><el-input v-model="couponDialog.name" /></el-form-item>
      <el-form-item label="类型">
        <el-radio-group v-model="couponDialog.type">
          <el-radio :value="1">满减券</el-radio>
          <el-radio :value="2">折扣券</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="couponDialog.type === 1" label="面额">
        <el-input-number v-model="couponDialog.amount" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item v-else label="折扣率">
        <el-input-number v-model="couponDialog.discountRate" :min="0.01" :max="1" :step="0.05" :precision="2" />
        <span class="hint">0.9 = 9 折</span>
      </el-form-item>
      <el-form-item label="使用门槛">
        <el-input-number v-model="couponDialog.minAmount" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="发放量">
        <el-input-number v-model="couponDialog.totalCount" :min="0" />
      </el-form-item>
      <el-form-item label="每人限领">
        <el-input-number v-model="couponDialog.perUserLimit" :min="1" />
      </el-form-item>
      <el-form-item label="有效期类型">
        <el-radio-group v-model="couponDialog.validType">
          <el-radio :value="1">固定区间</el-radio>
          <el-radio :value="2">领取后 N 天</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="couponDialog.validType === 1">
        <el-form-item label="开始时间">
          <el-date-picker v-model="couponDialog.validStart" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="couponDialog.validEnd" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </template>
      <el-form-item v-else label="有效天数">
        <el-input-number v-model="couponDialog.validDays" :min="1" />
      </el-form-item>
      <el-form-item label="适用范围">
        <el-radio-group v-model="couponDialog.scope">
          <el-radio :value="1">全场通用</el-radio>
          <el-radio :value="2">指定分类</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="couponDialog.scope === 2" label="选择分类">
        <el-select v-model="couponDialog.scopeIds" multiple placeholder="请选择适用的一级分类" style="width: 100%">
          <el-option v-for="c in topCategories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="couponDialog.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="couponDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="submitCoupon">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="bannerDialog.visible" :title="bannerDialog.mode === 'create' ? '新增运营位' : '编辑运营位'" width="480px">
    <el-form label-width="80px">
      <el-form-item label="标题"><el-input v-model="bannerDialog.title" /></el-form-item>
      <el-form-item label="副标题"><el-input v-model="bannerDialog.subtitle" /></el-form-item>
      <el-form-item label="图片">
        <el-upload :show-file-list="false" :before-upload="onBannerUpload" accept="image/*">
          <img v-if="bannerDialog.image" :src="bannerDialog.image" class="upload-preview" alt="" />
          <el-button v-else>上传图片</el-button>
        </el-upload>
      </el-form-item>
      <el-form-item label="跳转链接"><el-input v-model="bannerDialog.link" placeholder="/product/1" /></el-form-item>
      <el-form-item label="背景色"><el-input v-model="bannerDialog.bg" placeholder="#232f3e" /></el-form-item>
      <el-form-item label="位置">
        <el-select v-model="bannerDialog.position" style="width: 100%">
          <el-option label="首页顶部" value="home_top" />
        </el-select>
      </el-form-item>
      <el-form-item label="排序"><el-input-number v-model="bannerDialog.sort" :min="0" /></el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="bannerDialog.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="bannerDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="submitBanner">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="noticeDialog.visible" :title="noticeDialog.mode === 'create' ? '新增公告' : '编辑公告'" width="480px">
    <el-form label-width="80px">
      <el-form-item label="标题"><el-input v-model="noticeDialog.title" /></el-form-item>
      <el-form-item label="内容"><el-input v-model="noticeDialog.content" type="textarea" :rows="4" /></el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="noticeDialog.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
      <template #footer>
        <el-button @click="noticeDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitNotice">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="seckillDialog.visible" :title="seckillDialog.mode === 'create' ? '新增秒杀活动' : '编辑秒杀活动'" width="720px">
      <el-form label-width="90px">
        <el-form-item label="活动名称"><el-input v-model="seckillDialog.name" /></el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="seckillDialog.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="seckillDialog.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="seckillDialog.status" :active-value="1" :inactive-value="0" active-text="进行中  inactive-text="未开始  />
        </el-form-item>
        <el-form-item label="秒杀商品">
          <div class="seckill-rows">
            <div v-for="(r, i) in seckillDialog.rows" :key="i" class="seckill-row">
              <el-select v-model="r.productId" placeholder="选择商品" style="width: 190px" @change="r.skuId = undefined">
                <el-option v-for="p in productOptions" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <el-select v-model="r.skuId" placeholder="选择规格" style="width: 160px">
                <el-option v-for="s in skusOf(r.productId)" :key="s.id" :label="s.specText || s.skuCode" :value="s.id" />
              </el-select>
              <el-input-number v-model="r.seckillPrice" :min="0" :precision="2" placeholder="秒杀价" style="width: 130px" />
              <el-input-number v-model="r.seckillStock" :min="0" placeholder="库存" style="width: 120px" />
              <el-button link type="danger" @click="seckillDialog.rows.splice(i, 1)">删除</el-button>
            </div>
            <el-button link type="primary" @click="addSeckillRow">+ 添加商品</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="seckillDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitSeckill">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="promotionDialog.visible" :title="promotionDialog.mode === 'create' ? '新增满减活动' : '编辑满减活动'" width="560px">
      <el-form label-width="90px">
        <el-form-item label="活动名称"><el-input v-model="promotionDialog.name" placeholder="如 双十一满减" /></el-form-item>
        <el-form-item label="满减档位">
          <div class="seckill-rows">
            <div v-for="(t, i) in promotionDialog.thresholds" :key="i" class="seckill-row">
              <span class="hint">满</span>
              <el-input-number v-model="t.amount" :min="0" :precision="2" style="width: 130px" />
              <span class="hint">减</span>
              <el-input-number v-model="t.reduce" :min="0" :precision="2" style="width: 130px" />
              <el-button link type="danger" @click="promotionDialog.thresholds.splice(i, 1)">删除</el-button>
            </div>
            <el-button link type="primary" @click="addThreshold">+ 添加档位</el-button>
          </div>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="promotionDialog.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="promotionDialog.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="promotionDialog.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="promotionDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitPromotion">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="faqDialog.visible" :title="faqDialog.mode === 'create' ? '新增 FAQ' : '编辑 FAQ'" width="520px">
      <el-form label-width="80px">
        <el-form-item label="分类">
          <el-select v-model="faqDialog.category" allow-create filterable placeholder="选择或输入新分类" style="width: 100%">
            <el-option v-for="c in [...new Set(faqs.map((f) => f.category))]" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题"><el-input v-model="faqDialog.question" maxlength="255" /></el-form-item>
        <el-form-item label="答案">
          <el-input v-model="faqDialog.answer" type="textarea" :rows="5" maxlength="2000" />
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="faqDialog.sort" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="faqDialog.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="faqDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitFaq">保存</el-button>
      </template>
    </el-dialog>
</template>

<style scoped>
.pane-head {
  margin-bottom: 12px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.thumb {
  width: 84px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
.upload-preview {
  width: 180px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: #9aa3af;
}
.seckill-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.seckill-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
