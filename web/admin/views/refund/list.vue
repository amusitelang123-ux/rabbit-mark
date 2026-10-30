<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminRefund } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()

const loading = ref(false)
const list = ref<AdminRefund[]>([])
const total = ref(0)
const query = reactive({ status: undefined as number | undefined, orderNo: '', page: 1, pageSize: 10 })

const REFUND_TYPE_TEXT: Record<number, string> = { 1: '仅退款', 2: '退货退款', 3: '换货' }
const REFUND_STATUS_TEXT: Record<number, string> = {
  0: '待审核',
  1: '已同意',
  2: '已拒绝',
  3: '已退款',
  4: '待收货',
  5: '已换货',
}

function statusType(status: number) {
  if (status === 0 || status === 4) return 'warning'
  if (status === 3 || status === 5) return 'success'
  if (status === 2) return 'danger'
  return 'primary'
}

async function load() {
  loading.value = true
  try {
    const res = await adminApi.refundApi.list({ ...query })
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
  query.status = undefined
  query.orderNo = ''
  search()
}

async function audit(row: AdminRefund, approve: boolean) {
  let remark = ''
  try {
    const res = await ElMessageBox.prompt(
      approve ? '同意后将执行退款并回补库存，可填写备注' : '请填写拒绝原因',
      approve ? '同意售后' : '拒绝售后',
      { inputValue: approve ? '同意退款' : '', inputPlaceholder: '备注（可选）' },
    )
    remark = res.value
  } catch {
    return
  }
  try {
    await adminApi.refundApi.audit(row.id, { approve, remark })
    ElMessage.success(
      approve ? (row.type === 1 ? '已同意并退款' : '已同意，等待买家退货') : '已拒绝',
    )
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

/** A-24：确认收到退货（退货退款 → 执行退款；换货 → 完成换货） */
async function receive(row: AdminRefund) {
  let remark = ''
  try {
    const res = await ElMessageBox.prompt(
      row.type === 2 ? '确认已收到退货？确认后将执行退款并回补库存' : '确认已收到换货商品？',
      '确认收货',
      { inputValue: '已收到退货', inputPlaceholder: '备注（可选）' },
    )
    remark = res.value
  } catch {
    return
  }
  try {
    await adminApi.refundApi.receive(row.id, remark)
    ElMessage.success(row.type === 2 ? '已确认收货并退款' : '换货已完成')
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
        <el-form-item label="订单号">
          <el-input v-model="query.orderNo" placeholder="模糊搜索" clearable style="width: 190px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="(label, value) in REFUND_STATUS_TEXT" :key="value" :label="label" :value="Number(value)" />
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
        <el-table-column label="售后单号" prop="refundNo" width="190" />
        <el-table-column label="订单号" prop="orderNo" width="190" />
        <el-table-column label="商品" min-width="180">
          <template #default="{ row }">
            <div class="item-cell">
              <img v-if="row.productImage" :src="row.productImage" alt="" />
              <span>{{ row.productName || '整单售后' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ REFUND_TYPE_TEXT[row.type] ?? row.type }}</template>
        </el-table-column>
        <el-table-column label="退款金额" width="110">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column label="原因" prop="reason" min-width="140" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ REFUND_STATUS_TEXT[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" prop="createdAt" width="170" />
        <el-table-column v-if="admin.hasPerm('refund:audit')" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button link type="primary" @click="audit(row, true)">同意</el-button>
              <el-button link type="danger" @click="audit(row, false)">拒绝</el-button>
            </template>
            <el-button v-else-if="row.status === 4" link type="success" @click="receive(row)">
              确认收货
            </el-button>
            <span v-else class="muted">{{ row.auditRemark || '—' }}</span>
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
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.item-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-cell img {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  object-fit: cover;
}
.muted {
  color: #9aa3af;
  font-size: 12px;
}
</style>
