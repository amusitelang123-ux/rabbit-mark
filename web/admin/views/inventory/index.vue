<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { InventoryLogItem, StockAlertItem } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()
const tab = ref('alert')
const loading = ref(false)

const INVENTORY_TYPE_TEXT: Record<number, string> = {
  1: '入库',
  2: '下单锁定',
  3: '支付扣减',
  4: '取消回退',
  5: '手工调整',
}

/* -------------------------------- 库存预警 -------------------------------- */
const alerts = ref<StockAlertItem[]>([])
const alertTotal = ref(0)
const alertPage = ref(1)
const alertPageSize = ref(20)

async function loadAlerts() {
  loading.value = true
  try {
    const res = await adminApi.inventoryApi.alerts(alertPage.value, alertPageSize.value)
    alerts.value = res.list
    alertTotal.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

/* -------------------------------- 库存流水 -------------------------------- */
const logs = ref<InventoryLogItem[]>([])
const logTotal = ref(0)
const logQuery = reactive({
  skuId: undefined as number | undefined,
  type: undefined as number | undefined,
  page: 1,
  pageSize: 20,
})

async function loadLogs() {
  loading.value = true
  try {
    const res = await adminApi.inventoryApi.logs({ ...logQuery })
    logs.value = res.list
    logTotal.value = res.total
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function searchLogs() {
  logQuery.page = 1
  loadLogs()
}

function resetLogs() {
  logQuery.skuId = undefined
  logQuery.type = undefined
  searchLogs()
}

/* -------------------------------- 快捷调库存 ------------------------------ */
async function adjustStock(row: StockAlertItem) {
  let change = 0
  try {
    const res = await ElMessageBox.prompt(`为「${row.productName}」补充库存`, '库存补货', {
      inputValue: '100',
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入正整数',
    })
    change = Number(res.value)
  } catch {
    return
  }
  if (!change) return
  try {
    await adminApi.productApi.adjustStock(row.skuId, { change, remark: '库存预警补货' })
    ElMessage.success('库存已补充')
    loadAlerts()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

onMounted(() => {
  loadAlerts()
  loadLogs()
})
</script>

<template>
  <el-card shadow="never">
    <el-tabs v-model="tab">
      <el-tab-pane name="alert">
        <template #label>
          <span>库存预警<el-badge v-if="alertTotal" :value="alertTotal" class="tab-badge" /></span>
        </template>
        <div class="pane-head">
          <span class="hint">展示「库存 ≤ 预警阈值」的 SKU（阈值需大于 0），按库存升序</span>
        </div>
        <el-table v-loading="loading" :data="alerts" stripe>
          <el-table-column label="商品" min-width="220">
            <template #default="{ row }">
              <div class="item-cell">
                <img :src="row.productImage" alt="" />
                <div>
                  <p>{{ row.productName }}</p>
                  <p class="muted">{{ row.skuCode }} · {{ row.specText || '默认' }}</p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="可用库存" width="110">
            <template #default="{ row }">
              <el-tag :type="row.stock === 0 ? 'danger' : 'warning'">{{ row.stock }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="锁定库存" prop="lockedStock" width="110" />
          <el-table-column label="预警阈值" prop="warnStock" width="110" />
          <el-table-column label="商品状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.productStatus === 1 ? 'success' : 'info'">
                {{ row.productStatus === 1 ? '上架' : '下架' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="admin.hasPerm('product:update')" label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="adjustStock(row)">补货</el-button>
              <el-button link type="primary" @click="$router.push(`/admin/products/${row.productId}/edit`)">
                查看商品
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pager">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :total="alertTotal"
            :current-page="alertPage"
            :page-size="alertPageSize"
            @current-change="(p: number) => { alertPage = p; loadAlerts() }"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="库存流水" name="log">
        <div class="pane-head">
          <el-form :inline="true" @submit.prevent="searchLogs">
            <el-form-item label="SKU ID">
              <el-input-number v-model="logQuery.skuId" :min="1" :controls="false" placeholder="精确匹配" style="width: 150px" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="logQuery.type" placeholder="全部" clearable style="width: 140px">
                <el-option v-for="(label, value) in INVENTORY_TYPE_TEXT" :key="value" :label="label" :value="Number(value)" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="searchLogs">查询</el-button>
              <el-button @click="resetLogs">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
        <el-table v-loading="loading" :data="logs" stripe>
          <el-table-column label="ID" prop="id" width="80" />
          <el-table-column label="商品" min-width="200">
            <template #default="{ row }">
              <div>
                <p>{{ row.productName || '—' }}</p>
                <p class="muted">{{ row.skuCode }} · {{ row.specText || '默认' }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="110">
            <template #default="{ row }">
              <el-tag size="small">{{ INVENTORY_TYPE_TEXT[row.type] ?? row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="变动" width="90">
            <template #default="{ row }">
              <span :class="row.change > 0 ? 'plus' : 'minus'">{{ row.change > 0 ? '+' : '' }}{{ row.change }}</span>
            </template>
          </el-table-column>
          <el-table-column label="变更前" prop="before" width="90" />
          <el-table-column label="变更后" prop="after" width="90" />
          <el-table-column label="操作人" prop="operator" width="150" />
          <el-table-column label="备注" prop="remark" min-width="180" show-overflow-tooltip />
          <el-table-column label="时间" prop="createdAt" width="170" />
        </el-table>
        <div class="pager">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :total="logTotal"
            :current-page="logQuery.page"
            :page-size="logQuery.pageSize"
            @current-change="(p: number) => { logQuery.page = p; loadLogs() }"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
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
.hint {
  font-size: 12px;
  color: #9aa3af;
}
.item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item-cell img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  background: #f0f2f5;
}
.muted {
  color: #9aa3af;
  font-size: 12px;
}
.plus {
  color: #67c23a;
}
.minus {
  color: #f56c6c;
}
.tab-badge {
  margin-left: 6px;
  transform: translateY(-2px);
}
</style>
