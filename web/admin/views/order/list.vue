<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminLogisticsCompany } from '@admin/api'
import type { Order } from '@/api/types'
import { ORDER_STATUS_TEXT } from '@/constants/order'
import { useAdminStore } from '@admin/stores/admin'

const router = useRouter()
const admin = useAdminStore()

const loading = ref(false)
const list = ref<Order[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | null>(null)

const query = reactive({
  orderNo: '',
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
})

const shipDialog = reactive({ visible: false, orderNo: '', company: '', trackingNo: '' })
const logisticsCompanies = ref<AdminLogisticsCompany[]>([])

/* 批量发货 */
const selectedOrders = ref<Order[]>([])
const batchDialog = reactive({
  visible: false,
  company: '',
  rows: [] as { orderNo: string; trackingNo: string }[],
})

function onSelectionChange(rows: Order[]) {
  selectedOrders.value = rows
}

function openBatchShip() {
  const shippable = selectedOrders.value.filter((o) => o.status === 20)
  if (!shippable.length) {
    ElMessage.warning('请选择「待发货」状态的订单')
    return
  }
  batchDialog.company = ''
  batchDialog.rows = shippable.map((o) => ({ orderNo: o.orderNo, trackingNo: '' }))
  batchDialog.visible = true
}

async function submitBatchShip() {
  if (!batchDialog.company) {
    ElMessage.warning('请选择物流公司')
    return
  }
  const filled = batchDialog.rows.filter((r) => r.trackingNo.trim())
  if (!filled.length) {
    ElMessage.warning('请至少填写一个运单号')
    return
  }
  try {
    const res = await adminApi.orderApi.batchShip(
      filled.map((r) => ({
        orderNo: r.orderNo,
        company: batchDialog.company,
        trackingNo: r.trackingNo.trim(),
      })),
    )
    ElMessage.success(`发货成功 ${res.succeeded} 笔`)
    if (res.failed.length) {
      ElMessageBox.alert(
        res.failed.map((f) => `${f.orderNo}：${f.reason}`).join('\n'),
        '部分订单发货失败',
        { type: 'warning' },
      )
    }
    batchDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '批量发货失败')
  }
}

function statusType(status: number) {
  if (status === 10) return 'warning'
  if (status === 20) return 'primary'
  if (status === 30) return 'success'
  if (status === 40) return 'info'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    const res = await adminApi.orderApi.list({
      orderNo: query.orderNo || undefined,
      status: query.status,
      startTime: dateRange.value?.[0],
      endTime: dateRange.value?.[1],
      page: query.page,
      pageSize: query.pageSize,
    })
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
  query.orderNo = ''
  query.status = undefined
  dateRange.value = null
  search()
}

async function exportCsv() {
  try {
    await adminApi.orderApi.export({
      orderNo: query.orderNo || undefined,
      status: query.status,
      startTime: dateRange.value?.[0],
      endTime: dateRange.value?.[1],
    })
    ElMessage.success('导出已开始')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '导出失败')
  }
}

function openShip(row: Order) {
  Object.assign(shipDialog, { visible: true, orderNo: row.orderNo, company: '', trackingNo: '' })
}

async function submitShip() {
  if (!shipDialog.company || !shipDialog.trackingNo) {
    ElMessage.warning('请填写物流公司与运单号')
    return
  }
  try {
    await adminApi.orderApi.ship(shipDialog.orderNo, {
      company: shipDialog.company,
      trackingNo: shipDialog.trackingNo,
    })
    ElMessage.success('发货成功')
    shipDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '发货失败')
  }
}

async function closeOrder(row: Order) {  let reason = ''
  try {
    const res = await ElMessageBox.prompt('请输入关闭原因', '关闭订单', { inputValue: '后台关闭订单' })
    reason = res.value
  } catch {
    return
  }
  try {
    await adminApi.orderApi.close(row.orderNo, reason)
    ElMessage.success('订单已关闭')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '关闭失败')
  }
}

onMounted(async () => {
  load()
  try {
    logisticsCompanies.value = await adminApi.logisticsApi.companies()
  } catch {
    /* 物流字典加载失败时仍可手动输入 */
  }
})
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
            <el-option v-for="(label, value) in ORDER_STATUS_TEXT" :key="value" :label="label" :value="Number(value)" />
          </el-select>
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始"
            end-placeholder="结束"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button type="success" plain @click="exportCsv">导出 CSV</el-button>
          <el-button
            v-if="admin.hasPerm('order:ship')"
            type="primary"
            plain
            :disabled="!selectedOrders.length"
            @click="openBatchShip"
          >
            批量发货
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="46" :selectable="(row: Order) => row.status === 20" />
        <el-table-column label="订单号" prop="orderNo" width="190" />
        <el-table-column label="下单时间" prop="createdAt" width="170" />
        <el-table-column label="收货人" prop="receiverName" width="110" />
        <el-table-column label="商品" min-width="180">
          <template #default="{ row }">
            <span>{{ row.items[0]?.productName }}<span v-if="row.items.length > 1"> 等 {{ row.items.length }} 件</span></span>
          </template>
        </el-table-column>
        <el-table-column label="实付" width="110">
          <template #default="{ row }">¥{{ row.payAmount }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ ORDER_STATUS_TEXT[row.status as 10] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/admin/orders/${row.orderNo}`)">详情</el-button>
            <el-button v-if="row.status === 20 && admin.hasPerm('order:ship')" link type="primary" @click="openShip(row)">
              发货
            </el-button>
            <el-button
              v-if="(row.status === 10 || row.status === 20) && admin.hasPerm('order:update')"
              link
              type="danger"
              @click="closeOrder(row)"
            >
              关闭
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

    <el-dialog v-model="shipDialog.visible" title="订单发货" width="420px">
      <el-form label-width="90px">
        <el-form-item label="订单号">
          <span>{{ shipDialog.orderNo }}</span>
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="shipDialog.company"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入物流公司"
            style="width: 100%"
          >
            <el-option v-for="c in logisticsCompanies" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号">
          <el-input v-model="shipDialog.trackingNo" placeholder="请输入运单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchDialog.visible" title="批量发货" width="560px">
      <el-form label-width="90px">
        <el-form-item label="物流公司">
          <el-select
            v-model="batchDialog.company"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入物流公司"
            style="width: 100%"
          >
            <el-option v-for="c in logisticsCompanies" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
      </el-form>

      <p class="batch-tip">共 {{ batchDialog.rows.length }} 笔待发货订单，留空运单号的订单将被跳过</p>
      <el-table :data="batchDialog.rows" size="small" max-height="300">
        <el-table-column label="订单号" prop="orderNo" width="200" />
        <el-table-column label="运单号">
          <template #default="{ row }">
            <el-input v-model="row.trackingNo" placeholder="请输入运单号" />
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchShip">确认发货</el-button>
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
.batch-tip {
  font-size: 12px;
  color: #9aa3af;
  margin-bottom: 10px;
}
</style>
