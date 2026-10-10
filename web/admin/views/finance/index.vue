<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminInvoice, FinanceRecordItem, Reconciliation } from '@admin/api'

const tab = ref('records')
const loading = ref(false)

const records = ref<FinanceRecordItem[]>([])
const total = ref(0)
const query = reactive({ type: undefined as number | undefined, page: 1, pageSize: 10 })

const recon = ref<Reconciliation | null>(null)
const reconLoading = ref(false)

const invoices = ref<AdminInvoice[]>([])
const invoiceTotal = ref(0)
const invoicePage = ref(1)
const invoicePageSize = 10

const CHANNEL_TEXT: Record<number, string> = { 1: '微信', 2: '支付宝', 3: '余额', 4: '沙箱' }

async function loadRecords() {
  loading.value = true
  try {
    const res = await adminApi.financeApi.records({ ...query })
    records.value = res.list
    total.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadRecon() {
  reconLoading.value = true
  try {
    recon.value = await adminApi.financeApi.reconciliation()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    reconLoading.value = false
  }
}

async function loadInvoices() {
  try {
    const res = await adminApi.financeApi.invoices(invoicePage.value, invoicePageSize)
    invoices.value = res.list
    invoiceTotal.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

async function markInvoice(row: AdminInvoice) {
  try {
    await adminApi.financeApi.setInvoiceStatus(row.id, row.status === 1 ? 0 : 1)
    ElMessage.success('已更新')
    loadInvoices()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

onMounted(() => {
  loadRecords()
  loadRecon()
  loadInvoices()
})
</script>

<template>
  <el-card shadow="never">
    <el-tabs v-model="tab">
      <el-tab-pane label="财务流水" name="records">
        <div class="pane-head">
          <el-radio-group v-model="query.type" @change="() => { query.page = 1; loadRecords() }">
            <el-radio-button :value="undefined">全部</el-radio-button>
            <el-radio-button :value="1">收入</el-radio-button>
            <el-radio-button :value="2">退款</el-radio-button>
          </el-radio-group>
        </div>
        <el-table v-loading="loading" :data="records" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="关联订单" prop="orderNo" width="200" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 1 ? 'success' : 'danger'">{{ row.type === 1 ? '收入' : '退款' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="120">
            <template #default="{ row }">¥{{ row.amount }}</template>
          </el-table-column>
          <el-table-column label="渠道" width="100">
            <template #default="{ row }">{{ row.channel ? CHANNEL_TEXT[row.channel] : '—' }}</template>
          </el-table-column>
          <el-table-column label="发生时间" prop="occurredAt" width="180" />
        </el-table>
        <div class="pager">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :total="total"
            :current-page="query.page"
            :page-size="query.pageSize"
            @current-change="(p: number) => { query.page = p; loadRecords() }"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="对账汇总" name="recon">
        <div v-loading="reconLoading">
          <el-row v-if="recon" :gutter="16" class="recon-cards">
            <el-col :xs="12" :sm="6">
              <div class="recon-card">
                <span class="recon-card__label">总收入</span>
                <b class="recon-card__value is-income">¥{{ recon.incomeTotal }}</b>
                <span class="recon-card__sub">{{ recon.incomeCount }} 笔</span>
              </div>
            </el-col>
            <el-col :xs="12" :sm="6">
              <div class="recon-card">
                <span class="recon-card__label">总退款</span>
                <b class="recon-card__value is-refund">¥{{ recon.refundTotal }}</b>
                <span class="recon-card__sub">{{ recon.refundCount }} 笔</span>
              </div>
            </el-col>
            <el-col :xs="12" :sm="6">
              <div class="recon-card">
                <span class="recon-card__label">净收入</span>
                <b class="recon-card__value is-net">¥{{ recon.netIncome }}</b>
                <span class="recon-card__sub">收入 - 退款</span>
              </div>
            </el-col>
            <el-col :xs="12" :sm="6">
              <div class="recon-card">
                <span class="recon-card__label">退款率</span>
                <b class="recon-card__value">
                  {{ recon.incomeTotal ? ((recon.refundTotal / recon.incomeTotal) * 100).toFixed(1) : '0.0' }}%
                </b>
                <span class="recon-card__sub">退款 / 收入</span>
              </div>
            </el-col>
          </el-row>

          <el-table v-if="recon" :data="recon.daily" stripe class="recon-table">
            <el-table-column label="日期" prop="date" width="150" />
            <el-table-column label="收入">
              <template #default="{ row }"><span class="is-income">¥{{ row.income }}</span></template>
            </el-table-column>
            <el-table-column label="退款">
              <template #default="{ row }"><span class="is-refund">¥{{ row.refund }}</span></template>
            </el-table-column>
            <el-table-column label="净收入">
              <template #default="{ row }"><b>¥{{ row.net }}</b></template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="发票管理" name="invoice">
        <el-table :data="invoices" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="订单号" prop="orderNo" width="200" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ row.type === 1 ? '普票' : '专票' }}</template>
          </el-table-column>
          <el-table-column label="抬头" prop="title" min-width="150" />
          <el-table-column label="税号" prop="taxNo" min-width="150" />
          <el-table-column label="邮箱" prop="email" min-width="140" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '已开' : '待开' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="markInvoice(row)">
                {{ row.status === 1 ? '标记待开' : '标记已开' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pager">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :total="invoiceTotal"
            :current-page="invoicePage"
            :page-size="invoicePageSize"
            @current-change="(p: number) => { invoicePage = p; loadInvoices() }"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<style scoped>
.pane-head {
  margin-bottom: 14px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.recon-cards {
  margin-bottom: 18px;
}
.recon-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.recon-card__label {
  font-size: 13px;
  color: #8a93a0;
}
.recon-card__value {
  font-size: 22px;
  font-weight: 500;
}
.recon-card__sub {
  font-size: 12px;
  color: #9aa3af;
}
.is-income {
  color: #67c23a;
}
.is-refund {
  color: #f56c6c;
}
.is-net {
  color: #fe7c00;
}
</style>
