<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminCustomer, AdminPointsLog, AdminUserDetail } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const list = ref<AdminCustomer[]>([])
const total = ref(0)
const query = reactive({ keyword: '', status: undefined as number | undefined, page: 1, pageSize: 10 })

const drawer = reactive({ visible: false, loading: false, data: null as AdminUserDetail | null })

async function load() {
  loading.value = true
  try {
    const res = await adminApi.userApi.list({ ...query })
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
  query.status = undefined
  search()
}

async function openDetail(row: AdminCustomer) {
  drawer.visible = true
  drawer.loading = true
  drawer.data = null
  pointsBalance.value = 0
  pointsLogs.value = []
  try {
    drawer.data = await adminApi.userApi.detail(row.id)
    await loadPoints(row.id)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    drawer.loading = false
  }
}

/* 积分 */
const pointsBalance = ref(0)
const pointsLogs = ref<AdminPointsLog[]>([])

const POINTS_TYPE_TEXT: Record<number, string> = { 1: '签到', 2: '消费获得', 3: '积分抵扣', 4: '后台调整' }

async function loadPoints(userId: number) {
  try {
    const res = await adminApi.userApi.points(userId, 1, 10)
    pointsBalance.value = res.balance
    pointsLogs.value = res.list
  } catch {
    /* 积分加载失败不影响详情 */
  }
}

async function adjustPoints() {
  if (!drawer.data) return
  let change = 0
  let remark = ''
  try {
    const res = await ElMessageBox.prompt('请输入积分变动值（正数增加，负数扣减）', '调整积分', {
      inputValue: '0',
      inputPattern: /^-?\d+$/,
      inputErrorMessage: '请输入整数',
    })
    change = Number(res.value)
    if (!change) {
      ElMessage.warning('变动值不能为 0')
      return
    }
    const res2 = await ElMessageBox.prompt('请填写调整备注', '调整积分', { inputValue: '后台调整' })
    remark = res2.value
  } catch {
    return
  }
  try {
    const result = await adminApi.userApi.adjustPoints(drawer.data.id, change, remark)
    ElMessage.success(`调整成功，当前余额 ${result.balance}`)
    pointsBalance.value = result.balance
    await loadPoints(drawer.data.id)
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '调整失败')
  }
}

async function toggleStatus(row: AdminCustomer) {
  const next = row.status === 1 ? 0 : 1
  try {
    await adminApi.userApi.setStatus(row.id, next as 0 | 1)
    ElMessage.success(next === 1 ? '已启用' : '已禁用')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <el-card shadow="never" class="toolbar">
      <el-form :inline="true" @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="手机号 / 昵称 / 用户名" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
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
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <img :src="row.avatar" alt="" />
              <div>
                <p>{{ row.nickname }}</p>
                <p class="muted">{{ row.username }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="maskedPhone" width="140" />
        <el-table-column label="会员等级" prop="levelName" width="110" />
        <el-table-column label="累计消费" width="120">
          <template #default="{ row }">¥{{ row.totalSpent }}</template>
        </el-table-column>
        <el-table-column label="积分" prop="points" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" prop="createdAt" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="admin.hasPerm('user:update')" link :type="row.status === 1 ? 'danger' : 'primary'" @click="toggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
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

    <el-drawer v-model="drawer.visible" title="用户详情" size="520px">
      <div v-loading="drawer.loading">
        <template v-if="drawer.data">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="昵称">{{ drawer.data.nickname }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{ drawer.data.username }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ drawer.data.maskedPhone }}</el-descriptions-item>
            <el-descriptions-item label="会员等级">{{ drawer.data.levelName }}</el-descriptions-item>
            <el-descriptions-item label="累计消费">¥{{ drawer.data.totalSpent }}</el-descriptions-item>
            <el-descriptions-item label="积分">{{ drawer.data.points }}</el-descriptions-item>
            <el-descriptions-item label="订单总数">{{ drawer.data.orderCount }}</el-descriptions-item>
            <el-descriptions-item label="有效订单">{{ drawer.data.paidCount }}</el-descriptions-item>
            <el-descriptions-item label="订单金额" :span="2">¥{{ drawer.data.orderAmount }}</el-descriptions-item>
            <el-descriptions-item label="注册时间" :span="2">{{ drawer.data.createdAt }}</el-descriptions-item>
          </el-descriptions>

          <h4 class="drawer-title">收货地址（{{ drawer.data.addresses.length }}）</h4>
          <el-empty v-if="!drawer.data.addresses.length" description="暂无地址" :image-size="60" />
          <div v-for="a in drawer.data.addresses" :key="a.id" class="addr">
            <p><b>{{ a.receiver }}</b> {{ a.phone }} <el-tag v-if="a.isDefault" size="small">默认</el-tag></p>
            <p class="muted">{{ a.province }}{{ a.city }}{{ a.district }}{{ a.detail }}</p>
          </div>

          <h4 class="drawer-title">优惠券（{{ drawer.data.coupons.length }}）</h4>
          <el-empty v-if="!drawer.data.coupons.length" description="暂无优惠券" :image-size="60" />
          <div v-for="c in drawer.data.coupons" :key="c.id" class="coupon">
            <span>{{ c.couponCode }}</span>
            <span class="muted">状态 {{ c.status }} · 到期 {{ c.expireAt || '—' }}</span>
          </div>

          <div class="drawer-title-row">
            <h4 class="drawer-title">积分（余额 {{ pointsBalance }}）</h4>
            <el-button v-if="admin.hasPerm('points:adjust')" link type="primary" @click="adjustPoints">调整积分</el-button>
          </div>
          <el-empty v-if="!pointsLogs.length" description="暂无积分流水" :image-size="60" />
          <div v-for="p in pointsLogs" :key="p.id" class="coupon">
            <span>{{ POINTS_TYPE_TEXT[p.type] ?? '积分' }} · {{ p.remark }}</span>
            <span :class="p.change > 0 ? 'pts-plus' : 'pts-minus'">
              {{ p.change > 0 ? '+' : '' }}{{ p.change }}（余 {{ p.balance }}）             </span>
          </div>
        </template>
      </div>
    </el-drawer>
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
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-cell img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f2f5;
}
.muted {
  color: #9aa3af;
  font-size: 12px;
}
.drawer-title {
  font-size: 14px;
  font-weight: 500;
  margin: 18px 0 10px;
}
.addr,
.coupon {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 13px;
}
.coupon {
  display: flex;
  justify-content: space-between;
}
.drawer-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pts-plus {
  color: #67c23a;
}
.pts-minus {
  color: #f56c6c;
}
</style>
